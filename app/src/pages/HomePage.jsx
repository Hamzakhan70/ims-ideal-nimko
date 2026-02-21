import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/api';
import { useCart } from '../context/CartContext';
import Slider from '../components/Slider';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, getCurrentStock } = useCart();

  // Slider data
  const sliderSlides = [
    {
      image: '/nimko-1.jpg',
      title: 'Welcome to Ideal Nimko',
      description: 'Premium Quality Snacks & Namkeen made with traditional recipes and finest ingredients. Experience the authentic taste of India.',
      button: {
        text: 'Shop Now',
        link: '/products'
      }
    },
    {
      image: '/nimko-2.jpg',
      title: 'Traditional Recipes',
      description: 'Our products are crafted using time-honored recipes passed down through generations, ensuring authentic flavors in every bite.',
      button: {
        text: 'Explore Products',
        link: '/products'
      }
    },
    {
      image: '/nimko-3.jpg',
      title: 'Quality Assured',
      description: 'Every product undergoes rigorous quality checks to maintain the highest standards of taste, freshness, and nutrition.',
      button: {
        text: 'Learn More',
        link: '/about'
      }
    },
    {
      image: '/nimko-1.jpg',
      title: 'Festival Special',
      description: 'Celebrate every occasion with our specially curated festival collections that bring families together.',
      button: {
        text: 'View Collection',
        link: '/products'
      }
    }
  ];

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await getProducts();
        
        // Handle both direct array and wrapped response
        const products = response.products || response;
        const featured = products.filter(product => product.featured).slice(0, 4);
        setFeaturedProducts(featured);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

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
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Slider Section */}
      <section className="py-8">
        <div className="  w-full mx-auto ">
          <Slider slides={sliderSlides} autoPlay={true} interval={6000} />
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in-up">
              Featured Products
            </h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full animate-fade-in-up" style={{ animationDelay: '0.3s' }}></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product, index) => {
              const currentStock = getCurrentStock(product._id, product.stock);
              const isLowStock = currentStock < 5;
              const isOutOfStock = currentStock <= 0;
              
              return (
                <div 
                  key={product._id} 
                  className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up ${
                    isLowStock ? 'ring-2 ring-red-300 border-red-200' : ''
                  } ${isOutOfStock ? 'opacity-75' : ''}`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="relative overflow-hidden">
                    <img 
                      src={product.imageURL} 
                      alt={product.name}
                      className="w-full h-48 object-cover transition-transform duration-300 hover:scale-110"
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
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`opacity-0 hover:opacity-100 px-4 py-2 rounded-lg font-semibold transform translate-y-4 hover:translate-y-0 transition-all duration-300 ${
                          isOutOfStock 
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Quick Add'}
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      {isLowStock && !isOutOfStock && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Limited Stock
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">
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
                        } shadow-md hover:shadow-lg`}
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
          
          <div className="text-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <Link 
              to="/products"
              className="inline-block bg-yellow-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-yellow-600 hover:scale-105 transform transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="relative py-16 bg-gradient-to-r from-yellow-50 to-orange-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: "url('/nimko-2.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              About Ideal Nimko
            </h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto rounded-full mb-8"></div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We are a premium snacks company specializing in traditional Indian namkeen and sweets. 
              Our products are made with the finest ingredients and traditional recipes passed down through generations. 
              Experience the authentic taste of India with our carefully crafted snacks.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="animate-fade-in-up">
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Ideal Nimko</h3>
              <p className="text-gray-300 mb-4">
                Premium quality snacks and namkeen made with traditional recipes and finest ingredients.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-gray-300 hover:text-yellow-400 transition-colors">All Products</Link></li>
                <li><Link to="/cart" className="text-gray-300 hover:text-yellow-400 transition-colors">Shopping Cart</Link></li>
                <li><Link to="/contact" className="text-gray-300 hover:text-yellow-400 transition-colors">Contact Us</Link></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">About Us</a></li>
              </ul>
            </div>

            {/* Categories */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Categories</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Namkeen</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Sweets</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Snacks</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Festival Special</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="text-xl font-bold mb-4 text-yellow-400">Contact Info</h3>
              <div className="space-y-2">
                <p className="text-gray-300 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  Mumbai, Maharashtra, India
                </p>
                <p className="text-gray-300 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                  +91 98765 43210
                </p>
                <p className="text-gray-300 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  info@idealnimko.com
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Ideal Nimko. All rights reserved. Made with ❤️ in India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
