import axios from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Pagination from '../../components/common/Pagination';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';

export default function SalesmanOrderPlacement() {
    const {showSuccess, showError, showWarning, showInfo} = useToast();
    const [products, setProducts] = useState([]);
    const [shopkeepers, setShopkeepers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cities, setCities] = useState([]);
    const [cart, setCart] = useState([]);
    const [shopkeeperPriceMap, setShopkeeperPriceMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedShopkeeper, setSelectedShopkeeper] = useState('');
    const [selectedShopkeeperDetails, setSelectedShopkeeperDetails] = useState(null);
    const [orderForm, setOrderForm] = useState({notes: '', paymentMethod: 'cash', amountPaid: ''});
    const [lastOrder, setLastOrder] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const cartSectionRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const normalizePriceValue = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return null;
        }
        return Number(parsed.toFixed(2));
    };

    const getResolvedShopkeeperPrice = (productId, fallbackPrice, pricingMap = shopkeeperPriceMap) => {
        const savedPrice = normalizePriceValue(pricingMap?.[productId]);
        const basePrice = normalizePriceValue(fallbackPrice);
        return savedPrice !== null ? savedPrice : (basePrice !== null ? basePrice : 0);
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('adminToken');

            if (! token) {
                console.error('No authentication token found');
                showError('Authentication required. Please login again.');
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1500);
                setLoading(false);
                return;
            }

            // Get current user ID from token or localStorage
            const userId = localStorage.getItem('userId') || localStorage.getItem('adminId');

            if (! userId) {
                console.error('No user ID found');
                showError('User ID not found. Please login again.');
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 1500);
                setLoading(false);
                return;
            }

            const [productsResponse, shopkeepersResponse, categoriesResponse, citiesResponse] = await Promise.all([
                axios.get(api.products.getAll(), {
                    params: {
                        limit: 1000, // Get all products (or a very high number)
                        page: 1
                    }
                }),
                axios.get(api.assignments.getShopkeepersBySalesman(userId), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                axios.get(api.categories.getAll()),
                axios.get(api.cities.getAll(), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ]);

            // Handle paginated response
            const productsData = productsResponse.data.products || productsResponse.data || [];
            setProducts(Array.isArray(productsData) ? productsData : []);
            const shopkeepersData = shopkeepersResponse.data.shopkeepers || shopkeepersResponse.data || [];
            setShopkeepers(Array.isArray(shopkeepersData) ? shopkeepersData : []);
            // categories endpoint returns { success, categories: [ { name, ... } ] } or array
            const rawCategories = categoriesResponse ?. data ?. categories || categoriesResponse ?. data || [];
            const normalizedCategories = Array.isArray(rawCategories) ? rawCategories.map(c => (typeof c === 'string' ? c : c ?. name)).filter(Boolean) : [];
            setCategories(normalizedCategories);
            // cities endpoint returns { cities: [...] }
            const citiesData = citiesResponse ?. data ?. cities || [];
            setCities(Array.isArray(citiesData) ? citiesData : []);
        } catch (error) {
            console.error('Error fetching data:', error);

            // Always try to fetch products first
            try {
                const productsResponse = await axios.get(api.products.getAll(), {
                    params: {
                        limit: 1000, // Get all products (or a very high number)
                        page: 1
                    }
                });
                const productsData = productsResponse.data.products || productsResponse.data || [];
                setProducts(Array.isArray(productsData) ? productsData : []);
            } catch (productError) {
                console.error('Error loading products:', productError);
            }
            // Try to fetch categories even if others fail
            try {
                const categoriesResponse = await axios.get(api.categories.getAll());
                const rawCategories = categoriesResponse ?. data ?. categories || categoriesResponse ?. data || [];
                const normalizedCategories = Array.isArray(rawCategories) ? rawCategories.map(c => (typeof c === 'string' ? c : c ?. name)).filter(Boolean) : [];
                setCategories(normalizedCategories);
            } catch (categoriesError) {
                console.error('Error loading categories:', categoriesError);
            }
            // Try to fetch cities even if others fail
            try {
                const token = localStorage.getItem('adminToken');
                const citiesResponse = await axios.get(api.cities.getAll(), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const citiesData = citiesResponse ?. data ?. cities || [];
                setCities(Array.isArray(citiesData) ? citiesData : []);
            } catch (citiesError) {
                console.error('Error loading cities:', citiesError);
            }

            // If assignment API fails, try to fetch all shopkeepers as fallback
            try {
                const fallbackResponse = await axios.get(api.shopkeepers.getAll(), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const fallbackShopkeepers = fallbackResponse.data.shopkeepers || [];
                setShopkeepers(Array.isArray(fallbackShopkeepers) ? fallbackShopkeepers : []);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                setShopkeepers([]);
                // Don't show error alert for shopkeepers, just log it
            }
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => { // Check if product is out of stock
        if (product.stock <= 0) {
            showError('This product is out of stock!');
            return;
        }

        const existingItem = cart.find(item => item.productId === product._id);
        const defaultPrice = getResolvedShopkeeperPrice(product._id, product.price);

        if (existingItem) { // Check if adding one more would exceed stock
            if (existingItem.quantity >= product.stock) {
                showWarning(`Cannot add more items. Only ${
                    product.stock
                } units available in stock.`);
                return;
            }
            setCart(cart.map(item => item.productId === product._id ? {
                ...item,
                quantity: item.quantity + 1
            } : item));
        } else {
            setCart([
                ...cart, {
                    productId: product._id,
                    name: product.name,
                    originalPrice: product.price,
                    customPrice: defaultPrice,
                    quantity: 1,
                    imageURL: product.imageURL,
                    stock: product.stock, // Store stock for validation
                    packets: product.packets || null
                }
            ]);
        }
    };

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            setCart(cart.filter(item => item.productId !== productId));
        } else { // Find the product to check stock
            const product = products.find(p => p._id === productId);
            const cartItem = cart.find(item => item.productId === productId);

            if (product && cartItem) { // Check if quantity exceeds available stock
                if (quantity > product.stock) {
                    showWarning(`Cannot set quantity to ${quantity}. Only ${
                        product.stock
                    } units available in stock.`);
                    return;
                }
            }

            setCart(cart.map(item => item.productId === productId ? {
                ...item,
                quantity
            } : item));
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const scrollToCart = () => {
        cartSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    const updateCustomPrice = (productId, customPrice) => {
        setCart(cart.map(item => {
            if (item.productId !== productId) {
                return item;
            }

            if (customPrice === '') {
                return {
                    ...item,
                    customPrice: ''
                };
            }

            const parsed = parseFloat(customPrice);
            if (isNaN(parsed)) {
                return item;
            }

            const clamped = Math.max(parsed, 0);
            return {
                ...item,
                customPrice: Number(clamped.toFixed(2))
            };
        }));
    };

    const updateDiscountAmount = (productId, discountAmount) => {
        setCart(cart.map(item => {
            if (item.productId !== productId) 
                return item;
            


            if (discountAmount === '') {
                return {
                    ...item,
                    customPrice: item.originalPrice
                };
            }

            const parsed = parseFloat(discountAmount);
            if (isNaN(parsed)) {
                return item;
            }

            const clamped = Math.min(Math.max(parsed, 0), item.originalPrice);
            const newPrice = Number((item.originalPrice - clamped).toFixed(2));

            return {
                ...item,
                customPrice: newPrice
            };
        }));
    };

    useEffect(() => {
        let isActive = true;

        const applyPricingToCart = (pricingMap) => {
            setCart((currentCart) => currentCart.map(item => ({
                ...item,
                customPrice: getResolvedShopkeeperPrice(item.productId, item.originalPrice, pricingMap)
            })));
        };

        if (!selectedShopkeeper) {
            setShopkeeperPriceMap({});
            applyPricingToCart({});
            return undefined;
        }

        const loadShopkeeperPrices = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await axios.get(api.shopkeeperOrders.getDefaultPrices(), {
                    params: {
                        shopkeeperId: selectedShopkeeper
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!isActive) {
                    return;
                }

                const pricingMap = response.data?.priceMap || {};
                setShopkeeperPriceMap(pricingMap);
                applyPricingToCart(pricingMap);
            } catch (error) {
                console.error('Error loading saved shopkeeper prices:', error);
                if (!isActive) {
                    return;
                }
                setShopkeeperPriceMap({});
                applyPricingToCart({});
            }
        };

        loadShopkeeperPrices();

        return () => {
            isActive = false;
        };
    }, [selectedShopkeeper]);

    const getTotalAmount = () => {
        return cart.reduce((total, item) => {
            const price = item.customPrice === '' ? item.originalPrice : item.customPrice;
            return total + (price * item.quantity);
        }, 0);
    };

    const getTotalItems = (items = cart) => {
        return items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    };

    const getItemDiscountPerUnit = (item) => {
        const storedPerUnit = Number(item.discountPerUnit ?? item.discountAmount);
        if (Number.isFinite(storedPerUnit) && storedPerUnit > 0) {
            return storedPerUnit;
        }

        const originalUnitPrice = Number(item.originalUnitPrice ?? item.originalPrice ?? item.product ?. price);
        const unitPrice = Number(item.unitPrice);
        if (Number.isFinite(originalUnitPrice) && Number.isFinite(unitPrice) && originalUnitPrice > unitPrice) {
            return Number((originalUnitPrice - unitPrice).toFixed(2));
        }

        return 0;
    };

    const getItemDiscountTotal = (item) => {
        const storedTotal = Number(item.discountTotal);
        if (Number.isFinite(storedTotal) && storedTotal > 0) {
            return storedTotal;
        }
        return Number((getItemDiscountPerUnit(item) * (Number(item.quantity) || 0)).toFixed(2));
    };

    const getOrderTotalDiscount = (order) => {
        if (! order ?. items) {
            return 0;
        }
        return Number(order.items.reduce((sum, item) => sum + getItemDiscountTotal(item), 0).toFixed(2));
    };

    const formatReceiptAmount = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return '0';
        }
        return Math.round(num).toString();
    };

    const formatReceiptMoney = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return '0.00';
        }
        return num.toFixed(2);
    };

    const getDisplayOrderId = (order) => {
        if (!order?._id) {
            return 'N/A';
        }
        return `ORD-${order._id.slice(-6).toUpperCase()}`;
    };

    const getPaymentStatusLabel = (paymentStatus) => {
        if (paymentStatus === 'paid') {
            return 'Fully Paid';
        }
        if (paymentStatus === 'partial') {
            return 'Partially Paid';
        }
        return 'Pending';
    };

    const formatReceiptDateTime = (value) => {
        if (!value) {
            return 'N/A';
        }
        return new Date(value).toLocaleString('en-PK');
    };

    const formatPaymentMethodLabel = (paymentMethod) => {
        const normalized = String(paymentMethod || '').replace(/_/g, ' ').trim();
        if (!normalized) {
            return 'N/A';
        }
        return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const getReceiptStatusClassName = (paymentStatus) => {
        if (paymentStatus === 'paid') {
            return 'receipt-badge receipt-badge--paid';
        }
        if (paymentStatus === 'partial') {
            return 'receipt-badge receipt-badge--partial';
        }
        return 'receipt-badge receipt-badge--pending';
    };

    const receiptStyles = `
      .receipt-compact {
        width: 100%;
        color: #000000;
        font-family: Arial, sans-serif;
        font-size: 10px;
        line-height: 1.2;
      }
      .receipt-compact * {
        box-sizing: border-box;
      }
      .receipt-compact-header {
        text-align: center;
        margin-bottom: 8px;
      }
      .receipt-compact-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .receipt-compact-header p {
        margin: 2px 0 0;
        font-size: 11px;
      }
      .receipt-compact-shop {
        margin-top: 4px !important;
        font-size: 13px !important;
        font-weight: 700;
      }
      .receipt-compact-info {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      .receipt-compact-info td {
        padding: 2px 0;
        vertical-align: top;
      }
      .receipt-compact-info td:first-child {
        width: 38%;
        font-weight: 700;
        white-space: nowrap;
        padding-right: 8px;
      }
      .receipt-compact-info td:last-child {
        width: 62%;
      }
      .receipt-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.2;
      }
      .receipt-badge--paid {
        background: #dcfce7;
        color: #166534;
      }
      .receipt-badge--partial {
        background: #ffedd5;
        color: #c2410c;
      }
      .receipt-badge--pending {
        background: #fef3c7;
        color: #92400e;
      }
      .receipt-compact-note {
        margin-bottom: 8px;
      }
      .receipt-compact-note strong {
        display: inline-block;
        margin-right: 4px;
      }
      .receipt-compact-items {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 10px;
        margin-bottom: 6px;
      }
      .receipt-compact-items th,
      .receipt-compact-items td {
        padding: 2px 3px;
        vertical-align: top;
      }
      .receipt-compact-items thead th {
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        font-weight: 700;
      }
      .receipt-compact-items tbody td {
        border-bottom: 1px solid #e5e7eb;
      }
      .receipt-compact-items tfoot td {
        font-weight: 700;
      }
      .receipt-compact-items th:nth-child(1),
      .receipt-compact-items td:nth-child(1) {
        width: 42%;
        text-align: left;
        word-break: break-word;
      }
      .receipt-compact-items th:nth-child(2),
      .receipt-compact-items td:nth-child(2) {
        width: 10%;
        text-align: center;
      }
      .receipt-compact-items th:nth-child(3),
      .receipt-compact-items td:nth-child(3) {
        width: 16%;
        text-align: right;
        white-space: nowrap;
      }
      .receipt-compact-items th:nth-child(4),
      .receipt-compact-items td:nth-child(4) {
        width: 14%;
        text-align: right;
        white-space: nowrap;
      }
      .receipt-compact-items th:nth-child(5),
      .receipt-compact-items td:nth-child(5) {
        width: 18%;
        text-align: right;
        white-space: nowrap;
      }
      .receipt-compact-total-label {
        text-align: left;
        padding-top: 3px !important;
      }
      .receipt-compact-total-value {
        text-align: right;
        padding-top: 3px !important;
      }
      .receipt-compact-total-value--success {
        color: #15803d;
      }
      .receipt-compact-total-value--warning {
        color: #c2410c;
      }
      .receipt-compact-total-value--danger {
        color: #b91c1c;
      }
      .receipt-compact-footer {
        margin-top: 8px;
        text-align: center;
        font-size: 10px;
      }
      .receipt-compact-footer p {
        margin: 3px 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 6px;
          font-family: Arial, sans-serif;
        }
        .receipt-compact {
          font-size: 9px;
        }
        .receipt-badge {
          padding: 1px 5px;
          font-size: 9px;
        }
        .receipt-compact-items {
          font-size: 9px;
        }
      }
    `;

    const buildShareReceiptText = (order) => {
        if (!order) {
            return '';
        }

        const shopName = order.shopkeeper?.shopName || order.shopkeeper?.name || 'Shop';
        const salesmanName = order.placedBySalesman?.name || order.salesman?.name || 'N/A';
        const lines = [
            'Ideal Nimko Ltd.',
            'Order Receipt',
            `For: ${shopName}`,
            '',
            `Order ID: ${getDisplayOrderId(order)}`,
            `Order Date: ${new Date(order.createdAt).toLocaleString()}`,
            `Shop Name: ${shopName}`,
            `Salesman: ${salesmanName}`,
            `Total Items: ${getTotalItems(order.items || [])}`,
            `Payment Method: ${order.paymentMethod || 'N/A'}`,
            `Payment Status: ${getPaymentStatusLabel(order.paymentStatus)}`
        ];

        if ((order.shopkeeper?.pendingAmount || 0) > 0) {
            lines.push(`Total Pending Amount: ${formatReceiptAmount(order.shopkeeper?.pendingAmount)}`);
        }

        if (order.notes) {
            lines.push(`Notes: ${order.notes}`);
        }

        lines.push('', 'Items:');
        lines.push('Product | Qty | Unit Price | Discount | Total');

        order.items?.forEach((item) => {
            lines.push(`${item.product?.name || 'Product'} | ${item.quantity} | ${item.unitPrice || '0'} | ${getItemDiscountTotal(item) > 0 ? getItemDiscountTotal(item).toFixed(2) : '0'} | ${Number(item.totalPrice || 0).toFixed(2)}`);
        });

        lines.push('', `Order Total: ${Number(order.totalAmount || 0).toFixed(2)}`);

        if ((order.amountPaid || 0) > 0) {
            lines.push(`Amount Paid: ${formatReceiptAmount(order.amountPaid)}`);
        }

        if ((order.pendingAmount || 0) > 0) {
            lines.push(`Pending in this order: ${formatReceiptAmount(order.pendingAmount)}`);
        }

        lines.push('', 'Thank you for your business!', `Generated on: ${new Date().toLocaleString()}`);

        return lines.join('\n');
    };

    const handleCityChange = async (cityId) => {
        setSelectedCity(cityId);
        // Reset shopkeeper selection when city changes
        setSelectedShopkeeper('');
        setSelectedShopkeeperDetails(null);

        // Fetch shopkeepers filtered by city
        await fetchShopkeepersByCity(cityId);
    };

    const fetchShopkeepersByCity = async (cityId) => {
        try {
            const token = localStorage.getItem('adminToken');
            if (! token) 
                return;
            


            const userId = localStorage.getItem('userId') || localStorage.getItem('adminId');
            if (! userId) 
                return;
            


            // Build query params
            const params = {};
            if (cityId) {
                params.city = cityId;
            }

            const queryString = new URLSearchParams(params).toString();
            const url = `${
                api.assignments.getShopkeepersBySalesman(userId)
            }${
                queryString ? `?${queryString}` : ''
            }`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const shopkeepersData = response.data.shopkeepers || response.data || [];
            setShopkeepers(Array.isArray(shopkeepersData) ? shopkeepersData : []);
        } catch (error) {
            console.error('Error fetching shopkeepers by city:', error);
            // Fallback to shopkeepers API if assignment API fails
            try {
                const token = localStorage.getItem('adminToken');
                const params = cityId ? {
                    city: cityId
                } : {};
                const queryString = new URLSearchParams(params).toString();
                const fallbackResponse = await axios.get(`${
                    api.shopkeepers.getAll()
                }${
                    queryString ? `?${queryString}` : ''
                }`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const fallbackShopkeepers = fallbackResponse.data.shopkeepers || [];
                setShopkeepers(Array.isArray(fallbackShopkeepers) ? fallbackShopkeepers : []);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
    };

    const handleShopkeeperChange = (shopkeeperId) => {
        setSelectedShopkeeper(shopkeeperId);
        if (!shopkeeperId) {
            setSelectedShopkeeperDetails(null);
            return;
        }

        const shopkeeper = filteredShopkeepers.find(s => s._id === shopkeeperId);
        setSelectedShopkeeperDetails(shopkeeper || null);
    };

    // Function to update product stock in database
    const updateProductStock = async (productId, quantitySold) => {
        try {
            const response = await axios.put(api.products.updateStock(productId), {
                quantitySold
            }, {
                headers: {
                    'Authorization': `Bearer ${
                        localStorage.getItem('adminToken')
                    }`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error updating product stock:', error);
            throw error;
        }
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (cart.length === 0) {
            showWarning('Please add items to your cart');
            return;
        }
        if (!selectedShopkeeper) {
            showWarning('Please select a shopkeeper');
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                items: cart.map(item => {
                    const effectivePrice = item.customPrice === '' ? item.originalPrice : item.customPrice;
                    const discountAmount = Math.max(0, item.originalPrice - effectivePrice);
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        originalPrice: item.originalPrice,
                        customPrice: effectivePrice,
                        discountAmount: Number(discountAmount.toFixed(2)),
                        discountPercentage: item.originalPrice > 0 ? Number(((discountAmount / item.originalPrice) * 100).toFixed(2)) : 0
                    };
                }),
                shopkeeperId: selectedShopkeeper,
                notes: orderForm.notes,
                paymentMethod: orderForm.paymentMethod,
                amountPaid: parseFloat(orderForm.amountPaid) || 0
            };

            const response = await axios.post(api.shopkeeperOrders.create(), orderData, {
                headers: {
                    'Authorization': `Bearer ${
                        localStorage.getItem('adminToken')
                    }`
                }
            });

            // Update product stock for each item in the order
            try {
                for (const item of cart) {
                    await updateProductStock(item.productId, item.quantity);
                }
            } catch (stockError) {
                console.error('Error updating product stock:', stockError);
                showWarning('Order created but failed to update product stock. Please check inventory manually.');
            }
            setLastOrder(response.data.order);
            setShowReceipt(true);

            // Show payment status message
            const paymentStatus = response.data.order.paymentStatus;
            const orderPendingAmount = response.data.order.pendingAmount || 0;

            if (paymentStatus === 'paid') {
                showSuccess('Order placed successfully! Full payment received.');
            } else if (paymentStatus === 'partial') {
                showInfo(`Order placed successfully! Partial payment received. Pending amount: ${
                    orderPendingAmount.toFixed(2)
                }`);
            } else {
                showInfo(`Order placed successfully! Payment pending. Pending amount: ${
                    orderPendingAmount.toFixed(2)
                }`);
            }

            // Refresh products to get updated stock levels
            await fetchData();

            // Clear form
            setCart([]);
            setSelectedShopkeeper('');
            setSelectedShopkeeperDetails(null);
            setOrderForm({notes: '', paymentMethod: 'cash', amountPaid: ''});
        } catch (error) {
            console.error('Error placing order:', error);
            const errorMessage = error.response ?. data ?. error || error.message || 'Unknown error';
            showError(`Error placing order: ${errorMessage}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Shopkeepers are already filtered by city via API, so use them directly
    const filteredShopkeepers = shopkeepers;

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.description ?. toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || product.category === selectedCategory;
            return matchesSearch && matchesCategory && product.stock > 0;
        });
    }, [products, searchTerm, selectedCategory]);

    // Pagination for products
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    // categories now comes from API via state

    const printReceipt = async () => {
        const printWindow = window.open('', '_blank');
        if (! printWindow) {
            showError('Please allow popups to print the receipt.');
            return;
        }
        const receiptContent = document.getElementById('receipt-content').innerHTML;

        printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - ${
            lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop'
        }</title>
          <style>
            ${receiptStyles}
          </style>
        </head>
        <body>
        ${receiptContent}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();

        // Record the receipt for admin tracking
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(api.receipts.create(), {
                receiptType: 'order',
                orderId: lastOrder._id,
                receiptContent: receiptContent,
                totalAmount: lastOrder.totalAmount,
                notes: 'Order receipt printed by salesman'
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Error recording receipt:', error);
            // Don't show error to user as printing was successful
        }
    };

    const shareViaWhatsApp = () => {
        if (!lastOrder) 
            return;
        

        const message = buildShareReceiptText(lastOrder);

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const shareViaEmail = () => {
        if (!lastOrder) 
            return;
        


        const shopName = lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop';
        const orderId = getDisplayOrderId(lastOrder);

        const subject = `Order Receipt - ${shopName} - Order #${orderId}`;
        const body = buildShareReceiptText(lastOrder);

        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(body);
        const emailUrl = `mailto:${
            lastOrder.shopkeeper ?. email || ''
        }?subject=${encodedSubject}&body=${encodedBody}`;
        window.open(emailUrl);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="text-xl mb-4">Loading data...</div>
                    <div className="text-sm text-gray-600">Fetching products and shopkeepers</div>
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="text-xl mb-4 text-red-600">No products available</div>
                    <div className="text-sm text-gray-600">Please check if products are added to the system</div>
                </div>
            </div>
        );
    }

    if (shopkeepers.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="text-xl mb-4 text-red-600">No shopkeepers assigned</div>
                    <div className="text-sm text-gray-600">Please contact admin to assign shopkeepers to you</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                <style>{receiptStyles}</style>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">📦 Place Order for Shopkeeper</h1>

                {/* Receipt Modal */}
                {
                showReceipt && lastOrder && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                        <div className="bg-white rounded-lg p-3 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">📄 Order Receipt</h2>
                                <button onClick={
                                        () => setShowReceipt(false)
                                    }
                                    className="text-gray-500 hover:text-gray-700 text-2xl">
                                    ×
                                </button>
                            </div>

                            <div id="receipt-content" className="receipt-compact">
                                <div className="receipt-compact-header">
                                    <h3>Ideal Nimko Ltd.</h3>
                                    <p>Order Receipt</p>
                                    <p className="receipt-compact-shop">For: {lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop'}</p>
                                </div>

                                <table className="receipt-compact-info">
                                    <tbody>
                                        <tr>
                                            <td>Order ID:</td>
                                            <td>{getDisplayOrderId(lastOrder)}</td>
                                        </tr>
                                        <tr>
                                            <td>Order Date:</td>
                                            <td>{formatReceiptDateTime(lastOrder.createdAt)}</td>
                                        </tr>
                                        <tr>
                                            <td>Shop Name:</td>
                                            <td>{lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Salesman:</td>
                                            <td>{lastOrder.placedBySalesman ?. name || lastOrder.salesman ?. name || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Total Items:</td>
                                            <td>{getTotalItems(lastOrder.items || [])}</td>
                                        </tr>
                                        <tr>
                                            <td>Payment Method:</td>
                                            <td>{formatPaymentMethodLabel(lastOrder.paymentMethod)}</td>
                                        </tr>
                                        <tr>
                                            <td>Payment Status:</td>
                                            <td>
                                                <span className={getReceiptStatusClassName(lastOrder.paymentStatus)}>
                                                    {getPaymentStatusLabel(lastOrder.paymentStatus)}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Total Pending Amount:</td>
                                            <td className={(lastOrder.shopkeeper ?. pendingAmount || 0) > 0 ? 'receipt-compact-total-value--danger' : ''}>
                                                {formatReceiptAmount(lastOrder.shopkeeper ?. pendingAmount || 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {lastOrder.notes && (
                                    <div className="receipt-compact-note">
                                        <strong>Notes:</strong>
                                        <span>{lastOrder.notes}</span>
                                    </div>
                                )}

                                <table className="receipt-compact-items">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                            <th>Discount</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lastOrder.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.product ?. name || 'Product'}</td>
                                                <td>{item.quantity}</td>
                                                <td>{formatReceiptMoney(item.unitPrice || 0)}</td>
                                                <td>{formatReceiptMoney(getItemDiscountTotal(item))}</td>
                                                <td>{formatReceiptMoney(item.totalPrice || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="4" className="receipt-compact-total-label">Total Items:</td>
                                            <td className="receipt-compact-total-value">{getTotalItems(lastOrder.items || [])}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" className="receipt-compact-total-label">Order Total:</td>
                                            <td className="receipt-compact-total-value">{formatReceiptMoney(lastOrder.totalAmount || 0)}</td>
                                        </tr>
                                        {lastOrder.amountPaid > 0 && (
                                            <tr>
                                                <td colSpan="4" className="receipt-compact-total-label">Amount Paid:</td>
                                                <td className="receipt-compact-total-value receipt-compact-total-value--success">{formatReceiptAmount(lastOrder.amountPaid)}</td>
                                            </tr>
                                        )}
                                        {lastOrder.pendingAmount > 0 && (
                                            <tr>
                                                <td colSpan="4" className="receipt-compact-total-label">Pending in this order:</td>
                                                <td className="receipt-compact-total-value receipt-compact-total-value--warning">{formatReceiptAmount(lastOrder.pendingAmount)}</td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>

                                <div className="receipt-compact-footer">
                                    <p>Thank you for your business!</p>
                                    <p>Generated on: {formatReceiptDateTime(new Date())}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 mt-6">
                                <button onClick={
                                        () => setShowReceipt(false)
                                    }
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                                    Close
                                </button>
                                <button onClick={printReceipt}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                                    </svg>
                                    <span>Print</span>
                                </button>
                                <button onClick={shareViaWhatsApp}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                    </svg>
                                    <span>WhatsApp</span>
                                </button>
                                <button onClick={shareViaEmail}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                    </svg>
                                    <span>Email</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Products Section */}
                    <div className="lg:col-span-2">
                        {/* City and Shopkeeper Selection */}
                        <div className="bg-white p-4 rounded-lg shadow mb-6">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4">Select City & Shopkeeper</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <select value={selectedCity}
                                        onChange={
                                            (e) => handleCityChange(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                                        <option value="">All Cities</option>
                                        {
                                        cities.map(city => (
                                            <option key={
                                                    city._id
                                                }
                                                value={
                                                    city._id
                                            }>
                                                {
                                                city.name
                                            } </option>
                                        ))
                                    } </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Shopkeeper</label>
                                    <select value={selectedShopkeeper}
                                        onChange={
                                            (e) => handleShopkeeperChange(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        required>
                                        <option value="">
                                            {
                                            selectedCity ? (filteredShopkeepers.length > 0 ? 'Choose a shopkeeper...' : 'No shopkeepers in this city') : 'All shopkeepers (or select a city to filter)...'
                                        } </option>
                                        {
                                        filteredShopkeepers.map(shopkeeper => (
                                            <option key={
                                                    shopkeeper._id
                                                }
                                                value={
                                                    shopkeeper._id
                                                }
                                                className='text-sm'>
                                                {
                                                shopkeeper.name
                                            }
                                                - {
                                                shopkeeper.email
                                            }
                                                {
                                                shopkeeper.city && typeof shopkeeper.city === 'object' && shopkeeper.city.name && ` (${
                                                    shopkeeper.city.name
                                                })`
                                            } </option>
                                        ))
                                    } </select>
                                    {
                                    filteredShopkeepers.length === 0 && selectedCity && (
                                        <p className="text-xs text-red-500 mt-1">
                                            No shopkeepers found in this city. Try selecting a different city or contact admin.
                                        </p>
                                    )
                                }
                                    {
                                    shopkeepers.length === 0 && (
                                        <p className="text-xs text-yellow-600 mt-1">
                                            No shopkeepers available. Please contact admin to assign shopkeepers.
                                        </p>
                                    )
                                } </div>
                            </div>
                            {
                            selectedShopkeeperDetails ?. pendingAmount && selectedShopkeeperDetails.pendingAmount > 0 && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-medium text-red-800">
                                        Current Pending Amount:  {
                                        selectedShopkeeperDetails.pendingAmount.toFixed(2)
                                    } </p>
                                </div>
                            )
                        } </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                            {
                            paginatedProducts.map((product) => {
                                const cartItem = cart.find(item => item.productId === product._id);
                                const currentQuantity = cartItem?.quantity || 0;
                                const reservedQuantity = cartItem?.quantity || 0;
                                const availableStock = Math.max(0, (product.stock || 0) - reservedQuantity);
                                const isLowStock = availableStock > 0 && availableStock < 5;
                                const isOutOfStock = availableStock <= 0;
                                const displayPrice = getResolvedShopkeeperPrice(product._id, product.price);
                                const hasSavedShopkeeperPrice = displayPrice !== product.price;

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
                                        <div className="flex sm:block">
                                            <div className="relative w-20 shrink-0 border-r border-gray-100 bg-white sm:w-auto sm:border-r-0">
                                                <img src={
                                                        product.imageURL
                                                    }
                                                    alt={
                                                        product.name
                                                    }
                                                    className="w-full h-full min-h-[84px] object-contain p-1 sm:h-48 sm:min-h-0 sm:p-0" />
                                                {
                                                isLowStock && ! isOutOfStock && (
                                                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold animate-pulse">
                                                        Low Stock!
                                                    </div>
                                                )
                                            }
                                                {
                                                isOutOfStock && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <div className="bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold">
                                                            Out of Stock
                                                        </div>
                                                    </div>
                                                )
                                            } </div>
                                            <div className="flex min-w-0 flex-1 flex-col p-1.5 sm:p-4">
                                                <div className="flex items-start justify-between gap-1.5 mb-0.5 sm:mb-2">
                                                    <h3 className="text-[13px] sm:text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
                                                        {
                                                        product.name
                                                    }</h3>
                                                    {
                                                    isLowStock && ! isOutOfStock && (
                                                        <span className="hidden sm:inline-flex bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                                            Limited Stock
                                                        </span>
                                                    )
                                                } </div>
                                                <p className="hidden sm:block text-gray-600 text-sm mb-2 line-clamp-2">
                                                    {
                                                    product.description
                                                }</p>
                                                <div className="flex items-end justify-between gap-1.5 mb-1 sm:mb-3 mt-auto">
                                                    <div>
                                                        <span className="text-lg sm:text-xl font-bold text-yellow-600 leading-none"> {
                                                            displayPrice
                                                        }</span>
                                                        {
                                                        hasSavedShopkeeperPrice && (
                                                            <div className="text-[11px] text-green-600 sm:text-xs">
                                                                Base: {product.price}
                                                            </div>
                                                        )
                                                    }
                                                    </div>
                                                    <div className="text-right text-[15px] sm:text-sm leading-tight text-black">
                                                    {
                                                        hasSavedShopkeeperPrice && (
                                                            <div className="text-[11px] font-medium text-green-600 sm:text-xs">
                                                                Saved shopkeeper price
                                                            </div>
                                                        )
                                                    }
                                                    <div className={
                                                            `${
                                                                isOutOfStock ? 'text-red-600' : isLowStock ? 'text-red-500' : 'text-gray-500'
                                                            }`
                                                        }>
                                                            Stock: {
                                                            availableStock
                                                        }
                                                            {
                                                            isLowStock && ! isOutOfStock && (
                                                                <span className="ml-1 text-red-600">!</span>
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
                                                <div className="flex items-center justify-between rounded-md bg-gray-100 px-1 py-0.5 sm:px-2 sm:py-1.5">
                                                    <button onClick={
                                                            () => currentQuantity > 0 && updateQuantity(product._id, currentQuantity - 1)
                                                        }
                                                        disabled={
                                                            currentQuantity <= 0
                                                        }
                                                        className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-white text-base sm:text-lg font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                                                        -
                                                    </button>
                                                    <span className="min-w-[24px] text-center text-sm sm:text-lg font-semibold text-gray-900">
                                                        {currentQuantity}
                                                    </span>
                                                    <button onClick={
                                                            () => cartItem ? updateQuantity(product._id, currentQuantity + 1) : addToCart(product)
                                                        }
                                                        disabled={
                                                            isOutOfStock
                                                        }
                                                        className={
                                                            `flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-md text-base sm:text-lg font-semibold text-white shadow-sm transition ${
                                                                isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : isLowStock ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
                                                            }`
                                                    }>
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        } </div>

                        {/* Pagination for Products */}
                        {
                        filteredProducts.length > 0 && (
                            <div className="mt-4 sm:mt-6">
                                <Pagination currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={
                                        filteredProducts.length
                                    }
                                    pageSize={pageSize}
                                    pageSizeOptions={
                                        [12, 24, 48, 96]
                                    }
                                    onPageChange={setCurrentPage}
                                    onPageSizeChange={
                                        (newSize) => {
                                            setPageSize(newSize);
                                            setCurrentPage(1);
                                        }
                                    }/>
                            </div>
                        )
                    }

                        {
                        filteredProducts.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-lg">No products found</p>
                                <p className="text-sm mt-2">Try adjusting your search or category filter</p>
                            </div>
                        )
                    } </div>

                    {/* Cart Section */}
                    <div ref={cartSectionRef}
                        className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-4 sm:p-6 sticky top-4">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Cart</h2>

                            {
                            cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                            ) : (
                                <div className="space-y-4">
                                    {
                                    cart.map((item) => {
                                        const effectivePrice = item.customPrice === '' ? item.originalPrice : item.customPrice;
                                        const discountPercentage = ((item.originalPrice - effectivePrice) / item.originalPrice * 100).toFixed(1);
                                        const discountAmount = Math.max(0, item.originalPrice - effectivePrice);
                                        const isDiscounted = effectivePrice < item.originalPrice;

                                        return (
                                            <div key={
                                                    item.productId
                                                }
                                                className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                <div className="flex items-center space-x-3">
                                                    <img src={
                                                            item.imageURL
                                                        }
                                                        alt={
                                                            item.name
                                                        }
                                                        className="w-12 h-12 object-contain rounded"/>
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
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-500">Original:  {
                                                                item.originalPrice
                                                            }</span>
                                                            {
                                                            isDiscounted && (
                                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                    {discountPercentage}% off
                                                                </span>
                                                            )
                                                        } </div>
                                                    </div>
                                                    <button onClick={
                                                            () => removeFromCart(item.productId)
                                                        }
                                                        className="text-red-500 hover:text-red-700">
                                                        ×
                                                    </button>
                                                </div>

                                                {/* Price Editing Section */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Custom Price ()
                                                        </label>
                                                        <input type="number"
                                                            value={
                                                                item.customPrice
                                                            }
                                                            onChange={
                                                                (e) => {
                                                                    const value = e.target.value;
                                                                    if (value === '') {
                                                                        updateCustomPrice(item.productId, '');
                                                                    } else {
                                                                        const cleanValue = value.replace(/^0+/, '') || '0';
                                                                        updateCustomPrice(item.productId, cleanValue);
                                                                    }
                                                                }
                                                            }
                                                            placeholder="Enter amount"
                                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"/>
                                                    </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Discount Amount ()
                                                    </label>
                                                    <input type="number" min="0"
                                                        max={
                                                            item.originalPrice
                                                        }
                                                        step="0.01"
                                                        value={
                                                            discountAmount ? discountAmount : ''
                                                        }
                                                        onChange={
                                                            (e) => {
                                                                const value = e.target.value;
                                                                updateDiscountAmount(item.productId, value === '' ? '' : value);
                                                            }
                                                        }
                                                        placeholder="e.g., 50"
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"/>
                                                    <p className="text-[11px] text-gray-500 mt-1">
                                                        Automatically lowers the custom price.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quantity and Total */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={
                                                            () => updateQuantity(item.productId, item.quantity - 1)
                                                        }
                                                        disabled={
                                                            item.quantity <= 1
                                                        }
                                                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                                        -
                                                    </button>
                                                    <span className="w-8 text-center font-medium">
                                                        {
                                                        item.quantity
                                                    }</span>
                                                    <button onClick={
                                                            () => updateQuantity(item.productId, item.quantity + 1)
                                                        }
                                                        disabled={
                                                            item.quantity >= (item.stock || 0)
                                                        }
                                                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={
                                                            item.quantity >= (item.stock || 0) ? `Max: ${
                                                                item.stock || 0
                                                            } units` : ''
                                                    }>
                                                        +
                                                    </button>
                                                    <span className="text-xs text-gray-500">
                                                        Max: {
                                                        item.stock || 0
                                                    } </span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                         {
                                                        ((item.customPrice === '' ? item.originalPrice : item.customPrice) * item.quantity).toFixed(2)
                                                    } </p>
                                                    {
                                                    isDiscounted && (
                                                        <p className="text-xs text-green-600">
                                                            Saved:  {
                                                            ((item.originalPrice -(item.customPrice === '' ? item.originalPrice : item.customPrice)) * item.quantity).toFixed(2)
                                                        } </p>
                                                    )
                                                }
                                                    {
                                                    item.customPrice !== '' && item.customPrice !== item.originalPrice && (
                                                        <p className="text-xs text-blue-600">
                                                            Shopkeeper Price Applied
                                                        </p>
                                                    )
                                                } </div>
                                            </div>
                                        </div>
                                        );
                                    })
                                }

                                    <div className="border-t pt-4 space-y-2">
                                        {
                                        (() => {
                                            const totalOriginalAmount = cart.reduce((total, item) => total + (item.originalPrice * item.quantity), 0);
                                            const totalCustomAmount = getTotalAmount();
                                            const totalSavings = totalOriginalAmount - totalCustomAmount;
                                            const hasDiscounts = totalSavings > 0;

                                            return (
                                                <> {
                                                    hasDiscounts && (
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-green-800">Original Total:</span>
                                                                <span className="text-green-800"> {
                                                                    totalOriginalAmount.toFixed(2)
                                                                }</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-green-800">Total Savings:</span>
                                                                <span className="text-green-800 font-semibold"> {
                                                                    totalSavings.toFixed(2)
                                                                }</span>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                    <div className="flex justify-between text-sm text-gray-600">
                                                        <span>Total Items:</span>
                                                        <span> {
                                                            getTotalItems()
                                                        }</span>
                                                    </div>
                                                    <div className="flex justify-between text-lg font-semibold">
                                                        <span>Final Total:</span>
                                                        <span> {
                                                            totalCustomAmount.toFixed(2)
                                                        }</span>
                                                    </div>
                                                </>
                                            );
                                        })()
                                    } </div>
                                </div>
                            )
                        }

                            {/* Order Form */}
                            {
                            cart.length > 0 && (
                                <form onSubmit={handleSubmitOrder}
                                    className="mt-6 space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                        <h4 className="font-semibold text-blue-900 mb-2">Payment Summary</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Current Pending:</span>
                                                <span className="text-red-600 font-semibold"> {
                                                    (selectedShopkeeperDetails ?. pendingAmount || 0).toFixed(2)
                                                }</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Total Items:</span>
                                                <span className="font-semibold"> {
                                                    getTotalItems()
                                                }</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Order Total:</span>
                                                <span className="font-semibold"> {
                                                    getTotalAmount().toFixed(2)
                                                }</span>
                                            </div>
                                            <div className="border-t border-blue-200 pt-1 mt-1">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-700">Amount to Pay Now:</span>
                                                    <span className="text-green-700 font-semibold"> {
                                                        (parseFloat(orderForm.amountPaid) || 0).toFixed(2)
                                                    }</span>
                                                </div>
                                            </div>
                                            <div className="border-t border-blue-300 pt-2 mt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-blue-900">New Pending Amount:</span>
                                                    <span className="font-bold text-red-700">
                                                         {
                                                        Math.max(0, (selectedShopkeeperDetails ?. pendingAmount || 0) + getTotalAmount() - (parseFloat(orderForm.amountPaid) || 0)).toFixed(2)
                                                    } </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Amount Paid Now ()
                                        </label>
                                        <input type="number" required min="0" step="0.01"
                                            value={
                                                orderForm.amountPaid
                                            }
                                            onChange={
                                                (e) => setOrderForm({
                                                    ...orderForm,
                                                    amountPaid: e.target.value
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            placeholder="Enter any amount"/> {
                                        orderForm.amountPaid && parseFloat(orderForm.amountPaid) >= 0 && (
                                            <div className="mt-2 text-sm">
                                                {
                                                parseFloat(orderForm.amountPaid) > getTotalAmount() ? (
                                                    <>
                                                        <span className="text-green-600">Excess payment:
                                                        </span>
                                                        <span className="font-semibold text-green-600">
                                                             {
                                                            (parseFloat(orderForm.amountPaid) - getTotalAmount()).toFixed(2)
                                                        } </span>
                                                        <p className="text-xs text-green-700 mt-1">
                                                            This will reduce the pending amount by  {
                                                            (parseFloat(orderForm.amountPaid) - getTotalAmount()).toFixed(2)
                                                        } </p>
                                                    </>
                                                ) : parseFloat(orderForm.amountPaid) < getTotalAmount() ? (
                                                    <>
                                                        <span className="text-gray-600">Remaining to pay:
                                                        </span>
                                                        <span className="font-semibold text-orange-600">
                                                             {
                                                            (getTotalAmount() - parseFloat(orderForm.amountPaid)).toFixed(2)
                                                        } </span>
                                                    </>
                                                ) : (
                                                    <span className="font-semibold text-green-600">✅ Fully Paid</span>
                                                )
                                            } </div>
                                        )
                                    } </div>

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
                                        disabled={
                                            submitting || !selectedShopkeeper
                                        }
                                        className="w-full bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50">
                                        {
                                        submitting ? 'Placing Order...' : 'Place Order for Shopkeeper'
                                    } </button>
                                </form>
                            )
                        } </div>
                    </div>
                </div>
            </div>
            {
            cart.length > 0 && (
                <button type="button"
                    onClick={scrollToCart}
                    className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 text-white shadow-lg transition hover:bg-yellow-600"
                    aria-label="Go to cart"
                    title="Go to cart">
                    <span className="text-xl leading-none">↓</span>
                    <span className="absolute -top-1 -right-1 min-w-[1.25rem] rounded-full bg-red-600 px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                        {getTotalItems()}
                    </span>
                </button>
            )
        }
        </div>
    );
}
