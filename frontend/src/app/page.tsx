'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Product } from '@/types';
import { Star, ShoppingBag, Zap } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Mobile-First Design */}
      <div className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center text-white space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight">
                Shop Smart,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                  Earn Rewards
                </span>
              </h1>
              <p className="text-lg sm:text-xl max-w-2xl mx-auto text-indigo-100 leading-relaxed">
                Transform every purchase into points and unlock amazing rewards with our loyalty program
              </p>

              {!user && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link
                    href="/login"
                    className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg text-center text-lg"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/signup"
                    className="border-2 border-white text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all transform hover:scale-105 text-center text-lg"
                  >
                    Join Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-8 sm:h-12">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32V120H1392C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120H0V64Z" fill="#f9fafb"/>
          </svg>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-2 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar - Enhanced for Mobile */}
          <div className="mb-8">
            <div className="relative max-w-lg mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <ShoppingBag className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search amazing products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all bg-white shadow-lg"
              />
            </div>
          </div>

          {/* User Stats - Mobile-Optimized Cards */}
          {user && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl shadow-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-700">Your Points</p>
                      <p className="text-2xl font-bold text-yellow-900">{user.totalPoints}</p>
                    </div>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
                      <ShoppingBag className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-700">Products</p>
                      <p className="text-2xl font-bold text-blue-900">{products.length}</p>
                    </div>
                  </div>
                  <div className="text-3xl">🛍️</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl shadow-lg border border-green-200 sm:col-span-1 col-span-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-700">Status</p>
                      <p className="text-2xl font-bold text-green-900">Active</p>
                    </div>
                  </div>
                  <div className="text-3xl">⚡</div>
                </div>
              </div>
            </div>
          )}

          {/* Products Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-gray-600 mt-1">Discover amazing deals and earn points</p>
            </div>
            <div className="flex items-center bg-indigo-50 px-4 py-2 rounded-full">
              <span className="text-indigo-600 font-medium">{filteredProducts.length} products</span>
            </div>
          </div>

          {/* Products Grid - Mobile-Optimized */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xl font-medium mb-2">No products found</p>
              {searchTerm && (
                <p className="text-gray-400">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pb-8">
              {filteredProducts.map((product) => (
                <Link
                  key={product._id}
                  href={`/product/${product._id}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden transform hover:scale-[1.02]"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={product.imageURL}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />

                    {/* Stock badges */}
                    {product.stock <= 5 && product.stock > 0 && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        Only {product.stock} left!
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="bg-red-500 text-white font-bold px-4 py-2 rounded-full">
                          Out of Stock
                        </div>
                      </div>
                    )}

                    {/* Points badge */}
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      {product.points}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {product.stock} in stock
                        </p>
                      </div>
                    </div>

                    {/* Action area for mobile */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-600 font-medium text-sm">View Details</span>
                        <div className="text-2xl">🛒</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
