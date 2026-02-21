import React, {useState, useEffect, useMemo} from 'react';
import axios from 'axios';
import {api} from '../../utils/api';
import {useToast} from '../../context/ToastContext';
import Pagination from '../../components/common/Pagination';

export default function SalesmanOrderPlacement() {
    const {showSuccess, showError, showWarning, showInfo} = useToast();
    const [products, setProducts] = useState([]);
    const [shopkeepers, setShopkeepers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cities, setCities] = useState([]);
    const [cart, setCart] = useState([]);
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

    useEffect(() => {
        fetchData();
    }, []);

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
                    customPrice: product.price, // Start with original price
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

    const updateCustomPrice = (productId, customPrice) => {
        setCart(cart.map(item => item.productId === productId ? {
            ...item,
            customPrice: customPrice === '' ? '' : (parseFloat(customPrice) || item.originalPrice)
        } : item));
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

    const getTotalAmount = () => {
        return cart.reduce((total, item) => {
            const price = item.customPrice === '' ? item.originalPrice : item.customPrice;
            return total + (price * item.quantity);
        }, 0);
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
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        originalPrice: item.originalPrice,
                        customPrice: effectivePrice,
                        discountPercentage: (
                            (item.originalPrice - effectivePrice) / item.originalPrice * 100
                        ).toFixed(2)
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
                showInfo(`Order placed successfully! Partial payment received. Pending amount: PKR${
                    orderPendingAmount.toFixed(2)
                }`);
            } else {
                showInfo(`Order placed successfully! Payment pending. Pending amount: PKR${
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
        const receiptContent = document.getElementById('receipt-content').innerHTML;

        printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - ${
            lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop'
        }</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #333; }
            .header p { margin: 5px 0 0 0; font-size: 16px; color: #666; }
            .order-info { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
            .order-info p { margin: 5px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 10px; text-align: left; }
            .items-table th { background-color: #f0f0f0; font-weight: bold; }
            .items-table tbody tr:nth-child(even) { background-color: #f9f9f9; }
            .total { font-weight: bold; font-size: 18px; background-color: #e9e9e9; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            .shop-name { font-size: 18px; font-weight: bold; color: #2c5aa0; margin: 10px 0; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .header { page-break-inside: avoid; }
              .items-table { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ideal Nimko Ltd.</h1>
            <p>Order Receipt</p>
            <div class="shop-name">For: ${
            lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop'
        }</div>
          </div>
          ${receiptContent}
        </body>
      </html>
    `);

        printWindow.document.close();
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
        


        const shopName = lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop';
        const orderId = lastOrder._id;
        const totalAmount = lastOrder.totalAmount ?. toFixed(2) || '0.00';
        const orderDate = new Date(lastOrder.createdAt).toLocaleString();

        const message = `🏪 *Order Receipt for ${shopName}*

📋 *Order Details:*
• Order ID: ${orderId}
• Date: ${orderDate}
• Total Amount: PKR${totalAmount}
• Payment Method: ${
            lastOrder.paymentMethod
        }

📦 *Items Ordered:*
${
            lastOrder.items.map(item => `• ${
                item.product ?. name || 'Product'
            }: ${
                item.quantity
            } x PKR${
                item.unitPrice ?. toFixed(2) || '0.00'
            } = PKR${
                item.totalPrice ?. toFixed(2) || '0.00'
            }`).join('\n')
        }

📍 *Delivery Address:*
${
            lastOrder.deliveryAddress
        }

Thank you for your business with Ideal Nimko! 🎉`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const shareViaEmail = () => {
        if (!lastOrder) 
            return;
        


        const shopName = lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'Shop';
        const orderId = lastOrder._id;
        const totalAmount = lastOrder.totalAmount ?. toFixed(2) || '0.00';
        const orderDate = new Date(lastOrder.createdAt).toLocaleString();

        const subject = `Order Receipt - ${shopName} - Order #${orderId}`;

        const body = `Dear ${
            lastOrder.shopkeeper ?. name || 'Valued Customer'
        },

Please find below the details of your order:

ORDER RECEIPT
=============

Order ID: ${orderId}
Order Date: ${orderDate}
Shop Name: ${shopName}
Total Amount: PKR${totalAmount}
Payment Method: ${
            lastOrder.paymentMethod
        }

ITEMS ORDERED:
${
            lastOrder.items.map(item => `• ${
                item.product ?. name || 'Product'
            }: ${
                item.quantity
            } x PKR${
                item.unitPrice ?. toFixed(2) || '0.00'
            } = PKR${
                item.totalPrice ?. toFixed(2) || '0.00'
            }`).join('\n')
        }

DELIVERY ADDRESS:
${
            lastOrder.deliveryAddress
        }

${
            lastOrder.notes ? `NOTES: ${
                lastOrder.notes
            }` : ''
        }

Thank you for your business with Ideal Nimko!

Best regards,
Sales Team
Ideal Nimko Ltd.`;

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

                            <div id="receipt-content">
                                <div className="header">
                                    <h1 className="text-2xl font-bold">Ideal Nimko Ltd.</h1>
                                    <p>Order Receipt</p>
                                </div>

                                <div className="order-info">
                                    <p>
                                        <strong>Order ID:</strong>
                                        {
                                        lastOrder._id
                                    }</p>
                                    <p>
                                        <strong>Order Date:</strong>
                                        {
                                        new Date(lastOrder.createdAt).toLocaleString()
                                    }</p>
                                    <p>
                                        <strong>Shop Name:</strong>
                                        {
                                        lastOrder.shopkeeper ?. shopName || lastOrder.shopkeeper ?. name || 'N/A'
                                    }</p>
                                    <p>
                                        <strong>Shopkeeper:</strong>
                                        {
                                        lastOrder.shopkeeper ?. name
                                    }</p>
                                    <p>
                                        <strong>Salesman:</strong>
                                        {
                                        lastOrder.placedBySalesman ?. name || lastOrder.salesman ?. name
                                    }</p>
                                    <p>
                                        <strong>Delivery Address:</strong>
                                        {
                                        lastOrder.deliveryAddress
                                    }</p>
                                    <p>
                                        <strong>Payment Method:</strong>
                                        {
                                        lastOrder.paymentMethod
                                    }</p>
                                    <p>
                                        <strong>Payment Status:</strong>
                                        <span className={
                                            `ml-2 px-2 py-1 rounded text-xs font-medium ${
                                                lastOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : lastOrder.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                                            }`
                                        }>
                                            {
                                            lastOrder.paymentStatus === 'paid' ? '✅ Fully Paid' : lastOrder.paymentStatus === 'partial' ? '💰 Partially Paid' : '⏳ Pending'
                                        } </span>
                                    </p>
                                    {
                                    lastOrder.amountPaid > 0 && (
                                        <p>
                                            <strong>Amount Paid:</strong>
                                            <span className="text-green-600">PKR {
                                                lastOrder.amountPaid ?. toFixed(2) || '0.00'
                                            }</span>
                                        </p>
                                    )
                                }
                                    {
                                    lastOrder.pendingAmount > 0 && (
                                        <p>
                                            <strong>Order Pending Amount:</strong>
                                            <span className="text-orange-600">PKR {
                                                lastOrder.pendingAmount ?. toFixed(2) || '0.00'
                                            }</span>
                                        </p>
                                    )
                                }
                                    {
                                    lastOrder.shopkeeper ?. pendingAmount > 0 && (
                                        <p>
                                            <strong>Shopkeeper Total Pending Amount:</strong>
                                            <span className="text-red-600 font-semibold">PKR {
                                                lastOrder.shopkeeper ?. pendingAmount ?. toFixed(2) || '0.00'
                                            }</span>
                                        </p>
                                    )
                                }
                                    {
                                    lastOrder.notes && <p>
                                        <strong>Notes:</strong>
                                        {
                                        lastOrder.notes
                                    }</p>
                                } </div>

                                <table className="items-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Unit Price</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody> {
                                        lastOrder.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{
                                                    item.product ?. name || 'Product'
                                                }</td>
                                                <td>{
                                                    item.quantity
                                                }</td>
                                                <td>PKR {
                                                    item.unitPrice ?. toFixed(2) || '0.00'
                                                }</td>
                                                <td>PKR {
                                                    item.totalPrice ?. toFixed(2) || '0.00'
                                                }</td>
                                            </tr>
                                        ))
                                    } </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="3">Order Total:</td>
                                            <td>PKR {
                                                lastOrder.totalAmount ?. toFixed(2) || '0.00'
                                            }</td>
                                        </tr>
                                        {
                                        lastOrder.amountPaid > 0 && (
                                            <tr>
                                                <td colSpan="3">Amount Paid:</td>
                                                <td className="text-green-600">PKR {
                                                    lastOrder.amountPaid ?. toFixed(2) || '0.00'
                                                }</td>
                                            </tr>
                                        )
                                    }
                                        {
                                        lastOrder.pendingAmount > 0 && (
                                            <tr>
                                                <td colSpan="3">Pending from this order:</td>
                                                <td className="text-orange-600">PKR {
                                                    lastOrder.pendingAmount ?. toFixed(2) || '0.00'
                                                }</td>
                                            </tr>
                                        )
                                    } </tfoot>
                                </table>

                                <div className="footer">
                                    <p>Thank you for your business!</p>
                                    <p>Generated on: {
                                        new Date().toLocaleString()
                                    }</p>
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
                                        Current Pending Amount: PKR {
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
                                                disabled={
                                                    isOutOfStock || product.stock <= 0
                                                }
                                                className={
                                                    `w-full px-4 py-2 rounded-lg transition-all duration-300 ${
                                                        isOutOfStock || product.stock <= 0 ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : isLowStock ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 transform' : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105 transform'
                                                    }`
                                            }>
                                                {
                                                isOutOfStock || product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'
                                            } </button>
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
                    <div className="lg:col-span-1">
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
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-500">Original: PKR {
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
                                                            Custom Price (PKR)
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
                                                        Discount Amount (PKR)
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
                                                        PKR {
                                                        ((item.customPrice === '' ? item.originalPrice : item.customPrice) * item.quantity).toFixed(2)
                                                    } </p>
                                                    {
                                                    isDiscounted && (
                                                        <p className="text-xs text-green-600">
                                                            Saved: PKR {
                                                            ((item.originalPrice -(item.customPrice === '' ? item.originalPrice : item.customPrice)) * item.quantity).toFixed(2)
                                                        } </p>
                                                    )
                                                }
                                                    {
                                                    item.customPrice !== '' && item.customPrice !== item.originalPrice && (
                                                        <p className="text-xs text-blue-600">
                                                            Custom Price Applied
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
                                                                <span className="text-green-800">PKR {
                                                                    totalOriginalAmount.toFixed(2)
                                                                }</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-green-800">Total Savings:</span>
                                                                <span className="text-green-800 font-semibold">PKR {
                                                                    totalSavings.toFixed(2)
                                                                }</span>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                    <div className="flex justify-between text-lg font-semibold">
                                                        <span>Final Total:</span>
                                                        <span>PKR {
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
                                                <span className="text-red-600 font-semibold">PKR {
                                                    (selectedShopkeeperDetails ?. pendingAmount || 0).toFixed(2)
                                                }</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">Order Total:</span>
                                                <span className="font-semibold">PKR {
                                                    getTotalAmount().toFixed(2)
                                                }</span>
                                            </div>
                                            <div className="border-t border-blue-200 pt-1 mt-1">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-700">Amount to Pay Now:</span>
                                                    <span className="text-green-700 font-semibold">PKR {
                                                        (parseFloat(orderForm.amountPaid) || 0).toFixed(2)
                                                    }</span>
                                                </div>
                                            </div>
                                            <div className="border-t border-blue-300 pt-2 mt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-blue-900">New Pending Amount:</span>
                                                    <span className="font-bold text-red-700">
                                                        PKR {
                                                        ((selectedShopkeeperDetails ?. pendingAmount || 0) + getTotalAmount() - (parseFloat(orderForm.amountPaid) || 0)).toFixed(2)
                                                    } </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Amount Paid Now (PKR)
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
                                                            PKR {
                                                            (parseFloat(orderForm.amountPaid) - getTotalAmount()).toFixed(2)
                                                        } </span>
                                                        <p className="text-xs text-green-700 mt-1">
                                                            This will reduce the pending amount by PKR {
                                                            (parseFloat(orderForm.amountPaid) - getTotalAmount()).toFixed(2)
                                                        } </p>
                                                    </>
                                                ) : parseFloat(orderForm.amountPaid) < getTotalAmount() ? (
                                                    <>
                                                        <span className="text-gray-600">Remaining to pay:
                                                        </span>
                                                        <span className="font-semibold text-orange-600">
                                                            PKR {
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
        </div>
    );
}
