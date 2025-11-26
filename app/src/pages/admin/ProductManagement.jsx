import React, {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {API_BASE_URL, api} from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import {usePagination} from '../../hooks/usePagination';

// Helper to get base URL for static assets (without /api)
// Note: Cloudinary URLs are already absolute, so this is only for backward compatibility
const getImageBaseUrl = () => {
    const base = API_BASE_URL.replace(/\/api\/?$/, '');
    return base;
};

// Helper to check if URL is already absolute (Cloudinary or external)
const isAbsoluteUrl = (url) => {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
};

export default function ProductManagement() {
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        price: '',
        packets: '',
        imageURL: '',
        stock: '',
        featured: false,
        productLinks: [],
        additionalImages: []
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [newLink, setNewLink] = useState('');
    const [uploadingImages, setUploadingImages] = useState(false);

    // Fetch function for pagination hook
    const fetchProducts = useCallback(async (params) => {
        const queryParams = new URLSearchParams({
            page: params.page,
            limit: params.limit,
            ...(params.search && {
                search: params.search
            }),
            ...(params.category && {
                category: params.category
            })
        });

        const response = await axios.get(`${
            api.products.getAll()
        }?${queryParams}`);
        return response;
    }, []);

    // Use pagination hook
    const {
        data: products,
        loading,
        pagination,
        filters,
        handlePageChange,
        handlePageSizeChange,
        handleFilterChange,
        refresh: refreshProducts
    } = usePagination(fetchProducts, {
        search: '',
        category: ''
    }, 20);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Update filters when search/category changes (with debounce for search)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleFilterChange('search', searchTerm);
        }, searchTerm ? 500 : 0); // Debounce search by 500ms, immediate for clearing

        return() => clearTimeout(timeoutId);
    }, [searchTerm, handleFilterChange]);

    useEffect(() => {
        handleFilterChange('category', selectedCategory);
    }, [selectedCategory, handleFilterChange]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(api.categories.getAll());
            console.log('Categories fetched:', response.data);
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Set default categories if API fails
            setCategories([
                {
                    name: 'Snacks',
                    description: 'Snack items'
                },
                {
                    name: 'Biscuits',
                    description: 'Biscuit products'
                },
                {
                    name: 'Chips',
                    description: 'Chip products'
                },
                {
                    name: 'Nuts',
                    description: 'Nut products'
                }, {
                    name: 'Sweets',
                    description: 'Sweet products'
                }, {
                    name: 'Beverages',
                    description: 'Beverage products'
                }, {
                    name: 'Other',
                    description: 'Other products'
                }
            ]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate that either imageURL or additionalImages is provided
        if (!formData.imageURL && formData.additionalImages.length === 0) {
            alert('Please provide either an image URL or upload at least one image.');
            return;
        }

        // Prepare data for submission
        const submitData = {
            ...formData
        };

        // Normalize packets value
        if (submitData.packets === '') {
            delete submitData.packets;
        } else {
            submitData.packets = Number(submitData.packets);
        }

        // If no imageURL but we have uploaded images, use the first uploaded image as main image
        // Cloudinary returns full URLs, so use directly if absolute, otherwise prepend base URL
        if (! submitData.imageURL && submitData.additionalImages.length > 0) {
            const firstImage = submitData.additionalImages[0];
            submitData.imageURL = isAbsoluteUrl(firstImage) ? firstImage : `${
                getImageBaseUrl()
            }${firstImage}`;
        }

        try {
            const token = localStorage.getItem('adminToken');
            if (editingProduct) {
                await axios.put(api.products.update(editingProduct._id), submitData, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } else {
                await axios.post(api.products.create(), submitData, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
            setShowModal(false);
            setEditingProduct(null);
            resetForm();
            refreshProducts();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            packets: product.packets || '',
            imageURL: product.imageURL,
            stock: product.stock,
            featured: product.featured,
            productLinks: product.productLinks || [],
            additionalImages: product.additionalImages || []
        });
        setShowModal(true);
    };

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.delete(api.products.delete(productId), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                refreshProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            category: '',
            price: '',
            packets: '',
            imageURL: '',
            stock: '',
            featured: false,
            productLinks: [],
            additionalImages: []
        });
        setNewLink('');
    };

    const addLink = () => {
        if (newLink.trim()) {
            setFormData({
                ...formData,
                productLinks: [
                    ...formData.productLinks,
                    newLink.trim()
                ]
            });
            setNewLink('');
        }
    };

    const removeLink = (index) => {
        setFormData({
            ...formData,
            productLinks: formData.productLinks.filter(
                (_, i) => i !== index
            )
        });
    };

    const handleImageUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) 
            return;
        


        setUploadingImages(true);
        try {
            const token = localStorage.getItem('adminToken');
            if (! token) {
                alert('Please log in to upload images');
                setUploadingImages(false);
                return;
            }

            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });

            console.log('Uploading images with token:', token ? 'Token present' : 'No token');

            const response = await axios.post(api.products.uploadImages(), formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type - let axios set it automatically for FormData
                }
            });

            setFormData(prev => ({
                ...prev,
                additionalImages: [
                    ...prev.additionalImages,
                    ... response.data.imageUrls
                ]
            }));
        } catch (error) {
            console.error('Error uploading images:', error);
            console.error('Error response:', error.response ?. data);
            console.error('Error status:', error.response ?. status);
            if (error.response ?. status === 403) {
                alert('Authentication failed. Please log in again.');
            } else if (error.response ?. status === 401) {
                alert('Session expired. Please log in again.');
            } else {
                alert('Failed to upload images: ' + (
                    error.response ?. data ?. error || error.message
                ));
            }
        } finally {
            setUploadingImages(false);
        }
    };

    const removeImage = (index) => {
        setFormData({
            ...formData,
            additionalImages: formData.additionalImages.filter(
                (_, i) => i !== index
            )
        });
    };

    // Products are already filtered by the API based on pagination filters
    // No need for client-side filtering

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
                            <p className="text-gray-600">Manage your product inventory</p>
                        </div>
                        <button onClick={
                                () => {
                                    setEditingProduct(null);
                                    resetForm();
                                    setShowModal(true);
                                }
                            }
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <input type="text" placeholder="Search products..."
                                value={searchTerm}
                                onChange={
                                    (e) => setSearchTerm(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select value={selectedCategory}
                                onChange={
                                    (e) => setSelectedCategory(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                                <option value="">All Categories</option>
                                {
                                categories.map(category => (
                                    <option key={
                                            category.name || category
                                        }
                                        value={
                                            category.name || category
                                    }>
                                        {
                                        category.name || category
                                    } </option>
                                ))
                            } </select>
                        </div>
                        <div className="flex items-end">
                            <button onClick={
                                    () => {
                                        setSearchTerm('');
                                        setSelectedCategory('');
                                        handleFilterChange('search', '');
                                        handleFilterChange('category', '');
                                    }
                                }
                                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {
                loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-xl">Loading products...</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {
                        products.map((product) => (
                            <div key={
                                    product._id
                                }
                                className="bg-white rounded-lg shadow overflow-hidden">
                                <img src={
                                        isAbsoluteUrl(product.imageURL) ? product.imageURL : (product.imageURL ? `${
                                            getImageBaseUrl()
                                        }${
                                            product.imageURL
                                        }` : '')
                                    }
                                    alt={
                                        product.name
                                    }
                                    className="w-full h-48 object-cover"/>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {
                                            product.name
                                        }</h3>
                                        {
                                        product.featured && (
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                                Featured
                                            </span>
                                        )
                                    } </div>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                        {
                                        product.description
                                    }</p>

                                    {/* Product Links */}
                                    {
                                    product.productLinks && product.productLinks.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs font-medium text-gray-500 mb-1">Product Links:</p>
                                            <div className="space-y-1">
                                                {
                                                product.productLinks.slice(0, 2).map((link, index) => (
                                                    <a key={index}
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 text-xs hover:underline block truncate">
                                                        {link} </a>
                                                ))
                                            }
                                                {
                                                product.productLinks.length > 2 && (
                                                    <span className="text-xs text-gray-500">+{
                                                        product.productLinks.length - 2
                                                    }
                                                        more</span>
                                                )
                                            } </div>
                                        </div>
                                    )
                                }
                                    {/* Additional Images */}
                                    {
                                    product.additionalImages && product.additionalImages.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs font-medium text-gray-500 mb-1">Additional Images:</p>
                                            <div className="flex space-x-1">
                                                {
                                                product.additionalImages.slice(0, 3).map((imageUrl, index) => (
                                                    <img key={index}
                                                        src={
                                                            isAbsoluteUrl(imageUrl) ? imageUrl : `${
                                                                getImageBaseUrl()
                                                            }${imageUrl}`
                                                        }
                                                        alt={
                                                            `${
                                                                product.name
                                                            } ${
                                                                index + 1
                                                            }`
                                                        }
                                                        className="w-8 h-8 object-cover rounded"/>
                                                ))
                                            }
                                                {
                                                product.additionalImages.length > 3 && (
                                                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                                        +{
                                                        product.additionalImages.length - 3
                                                    } </div>
                                                )
                                            } </div>
                                        </div>
                                    )
                                }

                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-2xl font-bold text-yellow-600">PKR {
                                            product.price
                                        }</span>
                                        <div className="text-sm text-gray-500 text-right">
                                            <div>Stock: {
                                                product.stock
                                            }</div>
                                            {
                                            product.packets ? (
                                                <div>Packets/bundle: {
                                                    product.packets
                                                }</div>
                                            ) : null
                                        } </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={
                                                () => handleEdit(product)
                                            }
                                            className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                                            Edit
                                        </button>
                                        <button onClick={
                                                () => handleDelete(product._id)
                                            }
                                            className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    } </div>
                )
            }

                {/* Pagination */}
                <Pagination currentPage={
                        pagination.current
                    }
                    totalPages={
                        pagination.pages
                    }
                    totalItems={
                        pagination.total
                    }
                    pageSize={
                        pagination.pageSize
                    }
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}/> {
                products.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No products found</p>
                    </div>
                )
            } </div>

            {/* Product Modal */}
            {
            showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    onClick={
                        (e) => {
                            if (e.target === e.currentTarget) {
                                setShowModal(false);
                                setEditingProduct(null);
                                resetForm();
                            }
                        }
                }>
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {
                                    editingProduct ? 'Edit Product' : 'Add New Product'
                                } </h2>
                                <button onClick={
                                        () => {
                                            setShowModal(false);
                                            setEditingProduct(null);
                                            resetForm();
                                        }
                                    }
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}
                                className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                    <input type="text" required
                                        value={
                                            formData.name
                                        }
                                        onChange={
                                            (e) => setFormData({
                                                ...formData,
                                                name: e.target.value
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea required
                                        rows={3}
                                        value={
                                            formData.description
                                        }
                                        onChange={
                                            (e) => setFormData({
                                                ...formData,
                                                description: e.target.value
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select required
                                        value={
                                            formData.category
                                        }
                                        onChange={
                                            (e) => setFormData({
                                                ...formData,
                                                category: e.target.value
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                                        <option value="">Select Category</option>
                                        {
                                        categories.length > 0 ? (categories.map(category => (
                                            <option key={
                                                    category.name || category
                                                }
                                                value={
                                                    category.name || category
                                            }>
                                                {
                                                category.name || category
                                            } </option>
                                        ))) : (
                                            <>
                                                <option value="Snacks">Snacks</option>
                                                <option value="Biscuits">Biscuits</option>
                                                <option value="Chips">Chips</option>
                                                <option value="Nuts">Nuts</option>
                                                <option value="Sweets">Sweets</option>
                                                <option value="Beverages">Beverages</option>
                                                <option value="Other">Other</option>
                                            </>
                                        )
                                    } </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                                        <input type="number" required min="0" step="0.01"
                                            value={
                                                formData.price
                                            }
                                            onChange={
                                                (e) => setFormData({
                                                    ...formData,
                                                    price: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                                        <input type="number" required min="0"
                                            value={
                                                formData.stock
                                            }
                                            onChange={
                                                (e) => setFormData({
                                                    ...formData,
                                                    stock: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Packets per bundle
                                            <span className="text-gray-500 text-sm">
                                                (Optional)</span>
                                        </label>
                                        <input type="number" min="1" placeholder="e.g., 12"
                                            value={
                                                formData.packets
                                            }
                                            onChange={
                                                (e) => setFormData({
                                                    ...formData,
                                                    packets: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Main Image URL
                                        <span className="text-gray-500 text-sm">(Required if no uploaded images)</span>
                                    </label>
                                    <input type="url"
                                        required={
                                            formData.additionalImages.length === 0
                                        }
                                        value={
                                            formData.imageURL
                                        }
                                        onChange={
                                            (e) => setFormData({
                                                ...formData,
                                                imageURL: e.target.value
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="Enter direct image URL (e.g., https://images.unsplash.com/photo-123.jpg)"/> {
                                    formData.imageURL && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500 mb-1">Image Preview:</p>
                                            <img src={
                                                    formData.imageURL
                                                }
                                                alt="Preview"
                                                className="w-20 h-20 object-cover rounded border"
                                                onError={
                                                    (e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }
                                                }/>
                                            <div className="text-xs text-red-500 mt-1"
                                                style={
                                                    {display: 'none'}
                                            }>
                                                ❌ Invalid image URL - please use a direct image link
                                            </div>
                                        </div>
                                    )
                                } </div>

                                {/* Product Links */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Product Links
                                        <span className="text-gray-500 text-sm">(Optional)</span>
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input type="url"
                                                value={newLink}
                                                onChange={
                                                    (e) => setNewLink(e.target.value)
                                                }
                                                placeholder="Add product link (e.g., Amazon, Flipkart) - Optional"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                                            <button type="button"
                                                onClick={addLink}
                                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                                                Add
                                            </button>
                                        </div>
                                        {
                                        formData.productLinks.length > 0 && (
                                            <div className="space-y-1">
                                                {
                                                formData.productLinks.map((link, index) => (
                                                    <div key={index}
                                                        className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                        <a href={link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 text-sm truncate">
                                                            {link} </a>
                                                        <button type="button"
                                                            onClick={
                                                                () => removeLink(index)
                                                            }
                                                            className="text-red-500 hover:text-red-700 ml-2">
                                                            ×
                                                        </button>
                                                    </div>
                                                ))
                                            } </div>
                                        )
                                    } </div>
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Images
                                        <span className="text-gray-500 text-sm">(Alternative to Image URL)</span>
                                    </label>
                                    <input type="file" multiple accept="image/*"
                                        onChange={handleImageUpload}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        disabled={uploadingImages}/> {
                                    uploadingImages && (
                                        <p className="text-sm text-blue-600 mt-1">Uploading images...</p>
                                    )
                                }
                                    <p className="text-xs text-gray-500 mt-1">
                                        Upload images instead of providing an image URL. First uploaded image will be used as the main product image.
                                    </p>
                                    {
                                    formData.additionalImages.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {
                                            formData.additionalImages.map((imageUrl, index) => (
                                                <div key={index}
                                                    className="relative">
                                                    <img src={
                                                            isAbsoluteUrl(imageUrl) ? imageUrl : `${
                                                                getImageBaseUrl()
                                                            }${imageUrl}`
                                                        }
                                                        alt={
                                                            `Product ${
                                                                index + 1
                                                            }`
                                                        }
                                                        className="w-full h-20 object-cover rounded"/>
                                                    <button type="button"
                                                        onClick={
                                                            () => removeImage(index)
                                                        }
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                                                        ×
                                                    </button>
                                                </div>
                                            ))
                                        } </div>
                                    )
                                } </div>

                                <div className="flex items-center">
                                    <input type="checkbox" id="featured"
                                        checked={
                                            formData.featured
                                        }
                                        onChange={
                                            (e) => setFormData({
                                                ...formData,
                                                featured: e.target.checked
                                            })
                                        }
                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"/>
                                    <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                                        Featured Product
                                    </label>
                                </div>

                                <div className="flex space-x-4 pt-4">
                                    <button type="submit" className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                                        {
                                        editingProduct ? 'Update' : 'Create'
                                    } </button>
                                    <button type="button"
                                        onClick={
                                            () => {
                                                setShowModal(false);
                                                setEditingProduct(null);
                                                resetForm();
                                            }
                                        }
                                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )
        } </div>
    );
}
