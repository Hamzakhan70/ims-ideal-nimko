import React, { useEffect, useState } from 'react';
import { getProducts } from '../api/api';
import { useCart } from '../context/CartContext';
export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToCart, getCurrentStock } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts();
        
        // Handle both direct array and wrapped response
        const productsData = response.products || response;
        setProducts(productsData);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(productsData.map(product => product.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = selectedCategory 
    ? products.filter(product => product.category === selectedCategory)
    : products;

  const handleAddToCart = (product) => {
    addToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      imageURL: product.imageURL,
      stock: product.stock
    });
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Our Products ({products.length} total)
        </h1>
        
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === '' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-yellow-50'
              }`}
            >
              All Products
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg ${
                  selectedCategory === category 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-yellow-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const currentStock = getCurrentStock(product._id, product.stock);
            const isLowStock = currentStock < 5;
            const isOutOfStock = currentStock <= 0;
            
            return (
              <div 
                key={product._id} 
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 ${
                  isLowStock ? 'ring-2 ring-red-300 border-red-200' : ''
                } ${isOutOfStock ? 'opacity-75' : ''}`}
              >
                <div className="relative">
                  <img 
                    src={product.imageURL} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  {/* Low Stock Warning Overlay */}
                  {isLowStock && !isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                      Low Stock!
                    </div>
                  )}
                  {/* Out of Stock Overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    <div className="flex flex-col items-end space-y-1">
                      {product.featured && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Limited Stock
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-yellow-600">
                      PKR {product.price}
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                        isOutOfStock 
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                          : isLowStock 
                            ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 transform' 
                            : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105 transform'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                  <div className={`mt-2 text-sm font-medium ${
                    isOutOfStock 
                      ? 'text-red-600' 
                      : isLowStock 
                        ? 'text-red-500' 
                        : 'text-gray-500'
                  }`}>
                    Stock: {currentStock} units
                    {isLowStock && !isOutOfStock && (
                      <span className="ml-2 text-red-600 font-semibold">⚠️ Hurry!</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
