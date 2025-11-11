'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiClient } from '@/lib/api';
import { Product } from '@/types';
import { Star, ShoppingCart, ArrowLeft, Plus, Minus } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string);
    }
  }, [params.id]);

  const fetchProduct = async (id: string) => {
    try {
      const data = await apiClient.getProduct(id);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!product) return;

    addItem(product, quantity);
    alert(`Added ${quantity} ${product.name}(s) to cart!`);
  };

  const handleBuyNow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!product) return;

    setPurchasing(true);
    setError('');

    try {
      const orderData = {
        items: [{
          productId: product._id,
          quantity,
        }],
      };

      await apiClient.createOrder(orderData);

      alert(`Order placed successfully! You earned ${product.points * quantity} points!`);
      router.push('/dashboard?tab=orders');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      setError(errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  const increaseQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Product not found</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to products
      </Link>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Product Image */}
        <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-200 mb-8 lg:mb-0">
          <Image
            src={product.imageURL}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
          {product.stock <= 5 && product.stock > 0 && (
            <div className="absolute top-4 right-4 bg-orange-500 text-white text-sm px-3 py-1 rounded-full">
              Low Stock
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          <div className="flex items-center space-x-4 mb-6">
            <span className="text-3xl font-bold text-gray-900">
              ₹{product.price.toFixed(2)}
            </span>
            <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
              <Star className="h-5 w-5 text-yellow-500 mr-1" />
              <span className="font-semibold text-yellow-700">
                {product.points} points
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Category</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {product.category}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Stock Available</span>
              <span className={`text-sm font-medium ${
                product.stock <= 5 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {product.stock} units
              </span>
            </div>
          </div>

          {product.stock > 0 && (
            <div className="space-y-6">
              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xl font-semibold px-4 py-2 border border-gray-300 rounded-lg min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={increaseQuantity}
                    disabled={quantity >= product.stock}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Price per item:</span>
                    <span>₹{product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points per item:</span>
                    <span>{product.points}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>₹{(product.price * quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-yellow-600">
                    <span>Total Points Earned:</span>
                    <span>{product.points * quantity} pts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full bg-gray-100 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={purchasing || product.stock === 0}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {purchasing ? (
                    'Processing...'
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Buy Now
                    </>
                  )}
                </button>
              </div>

              {!user && (
                <p className="text-sm text-gray-600 text-center">
                  <Link href="/login" className="text-blue-600 hover:text-blue-800">
                    Sign in
                  </Link>{' '}
                  to purchase and earn points
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}