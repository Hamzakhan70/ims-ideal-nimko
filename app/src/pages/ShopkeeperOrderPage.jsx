import React, {useState, useEffect} from 'react';
import axios from 'axios';
import { api } from '../utils/api';
import { AUTH_TOKEN_STORAGE_KEY } from '../config/appConfig';

export default function ShopkeeperOrderPage() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [orderForm, setOrderForm] = useState({deliveryAddress: '', notes: '', paymentMethod: 'cash'});

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(api.products.getAll());
            setProducts(response.data.products || response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.productId === product._id);
        if (existingItem) {
            setCart(cart.map(item => item.productId === product._id ? {
                ...item,
                quantity: item.quantity + 1
            } : item));
        } else {
            setCart([
                ...cart, {
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    imageURL: product.imageURL,
                    packets: product.packets || null
                }
            ]);
        }
    };

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            setCart(cart.filter(item => item.productId !== productId));
        } else {
            setCart(cart.map(item => item.productId === productId ? {
                ...item,
                quantity
            } : item));
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const getTotalAmount = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (cart.length === 0) {
            alert('Please add items to your cart');
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                items: cart.map(item => ({productId: item.productId, quantity: item.quantity})),
                deliveryAddress: orderForm.deliveryAddress,
                notes: orderForm.notes,
                paymentMethod: orderForm.paymentMethod
            };

            await axios.post(api.shopkeeperOrders.create(), orderData, {
                headers: {
                    'Authorization': `Bearer ${
                        localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
                    }`
                }
            });

            alert('Order placed successfully!');
            setCart([]);
            setOrderForm({deliveryAddress: '', notes: '', paymentMethod: 'cash'});
        } catch (error) {
            console.error('Error placing order:', error);
            alert('Error placing order: ' + (
                error.response ?. data ?. error || 'Unknown error'
            ));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        return matchesSearch && matchesCategory && product.stock > 0;
    });

    const categories = [...new Set(products.map(product => product.category))];

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-xl">Loading products...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Place Order</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Products Section */}
                    <div className="lg:col-span-2">
                        {/* Search and Filter */}
                        <div className="bg-white p-4 rounded-lg shadow mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
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
                                            <option key={category}
                                                value={category}>
                                                {category}</option>
                                        ))
                                    } </select>
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {
                            filteredProducts.map((product) => {
                                const isLowStock = product.stock < 5;
                                const isOutOfStock = product.stock <= 0;

                                return (
                                    <div key={
                                            product._id
                                        }
                                        className={
                                            `bg-white rounded-lg shadow overflow-hidden transition-all duration-300 ${
                                                isLowStock ? 'ring-2 ring-red-300 border-red-200' : ''
                                            } ${
                                                isOutOfStock ? 'opacity-75' : ''
                                            }`
                                    }>
                                        <div className="relative">
                                            <img src={
                                                    product.imageURL
                                                }
                                                alt={
                                                    product.name
                                                }
                                                className="w-full h-48 object-cover"/> {/* Low Stock Warning Overlay */}
                                            {
                                            isLowStock && ! isOutOfStock && (
                                                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                                                    Low Stock!
                                                </div>
                                            )
                                        }
                                            {/* Out of Stock Overlay */}
                                            {
                                            isOutOfStock && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                                                        Out of Stock
                                                    </div>
                                                </div>
                                            )
                                        } </div>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {
                                                    product.name
                                                }</h3>
                                                {
                                                isLowStock && ! isOutOfStock && (
                                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                                        Limited Stock
                                                    </span>
                                                )
                                            } </div>
                                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                                {
                                                product.description
                                            }</p>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xl font-bold text-yellow-600">PKR {
                                                    product.price
                                                }</span>
                                                <div className="text-right text-sm text-gray-500">
                                                    <div className={
                                                        `${
                                                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-red-500' : 'text-gray-500'
                                                        }`
                                                    }>
                                                        Stock: {
                                                        product.stock
                                                    }
                                                        {
                                                        isLowStock && ! isOutOfStock && (
                                                            <span className="ml-1 text-red-600">⚠️</span>
                                                        )
                                                    } </div>
                                                    {
                                                    product.packets ? (
                                                        <div>Packets/bundle: {
                                                            product.packets
                                                        }</div>
                                                    ) : null
                                                } </div>
                                            </div>
                                            <button onClick={
                                                    () => addToCart(product)
                                                }
                                                disabled={isOutOfStock}
                                                className={
                                                    `w-full px-4 py-2 rounded-lg transition-all duration-300 ${
                                                        isOutOfStock ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : isLowStock ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 transform' : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105 transform'
                                                    }`
                                            }>
                                                {
                                                isOutOfStock ? 'Out of Stock' : 'Add to Cart'
                                            } </button>
                                        </div>
                                    </div>
                                );
                            })
                        } </div>
                    </div>

                    {/* Cart Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Cart</h2>

                            {
                            cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                            ) : (
                                <div className="space-y-4">
                                    {
                                    cart.map((item) => (
                                        <div key={
                                                item.productId
                                            }
                                            className="flex items-center space-x-3">
                                            <img src={
                                                    item.imageURL
                                                }
                                                alt={
                                                    item.name
                                                }
                                                className="w-12 h-12 object-cover rounded"/>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    {
                                                    item.name
                                                }</h4>
                                                <p className="text-xs text-gray-500">
                                                    {
                                                    item.packets ? `${
                                                        item.packets
                                                    } packets/bundle` : 'Packets per bundle: N/A'
                                                } </p>
                                                <p className="text-sm text-gray-500">PKR {
                                                    item.price
                                                }</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={
                                                        () => updateQuantity(item.productId, item.quantity - 1)
                                                    }
                                                    className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                                                    -
                                                </button>
                                                <span className="w-8 text-center">
                                                    {
                                                    item.quantity
                                                }</span>
                                                <button onClick={
                                                        () => updateQuantity(item.productId, item.quantity + 1)
                                                    }
                                                    className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                                                    +
                                                </button>
                                                <button onClick={
                                                        () => removeFromCart(item.productId)
                                                    }
                                                    className="text-red-500 hover:text-red-700 ml-2">
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                }

                                    <div className="border-t pt-4">
                                        <div className="flex justify-between text-lg font-semibold">
                                            <span>Total:</span>
                                            <span>PKR {
                                                getTotalAmount()
                                            }</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                            {/* Order Form */}
                            {
                            cart.length > 0 && (
                                <form onSubmit={handleSubmitOrder}
                                    className="mt-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                        <textarea required
                                            rows={3}
                                            value={
                                                orderForm.deliveryAddress
                                            }
                                            onChange={
                                                (e) => setOrderForm({
                                                    ...orderForm,
                                                    deliveryAddress: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            placeholder="Enter delivery address"/>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                        <select value={
                                                orderForm.paymentMethod
                                            }
                                            onChange={
                                                (e) => setOrderForm({
                                                    ...orderForm,
                                                    paymentMethod: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                                            <option value="cash">Cash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="upi">UPI</option>
                                            <option value="credit">Credit</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                                        <textarea rows={2}
                                            value={
                                                orderForm.notes
                                            }
                                            onChange={
                                                (e) => setOrderForm({
                                                    ...orderForm,
                                                    notes: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            placeholder="Any special instructions"/>
                                    </div>

                                    <button type="submit"
                                        disabled={submitting}
                                        className="w-full bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50">
                                        {
                                        submitting ? 'Placing Order...' : 'Place Order'
                                    } </button>
                                </form>
                            )
                        } </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
