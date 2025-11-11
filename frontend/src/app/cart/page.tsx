'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiClient } from '@/lib/api';
import { Minus, Plus, Trash2, Star, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getTotalPoints } = useCart();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const subtotal = getSubtotal();
  const totalPoints = getTotalPoints();
  const finalTotal = subtotal;

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;

    setLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        pointsToRedeem: 0, // Points redemption disabled
      };

      const order = await apiClient.createOrder(orderData);

      // Order submitted successfully
      alert('Order submitted successfully! Awaiting admin approval.');
      clearCart();
      router.push('/dashboard?tab=orders');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
        <p className="text-gray-600 mb-6">You need to be signed in to view your cart.</p>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some products to get started!</p>
        <Link
          href="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Continue Shopping
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <p className="text-gray-600">{items.length} item(s) in your cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 relative flex-shrink-0">
                    <Image
                      src={item.product.imageURL}
                      alt={item.product.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                    <p className="text-gray-600 text-sm">{item.product.description}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{item.product.price.toFixed(2)}
                      </span>
                      <div className="flex items-center ml-4 text-yellow-600">
                        <Star className="h-4 w-4 mr-1" />
                        <span className="text-sm">{item.product.points} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.product._id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-yellow-600">
              <span>Points to Earn</span>
              <span className="flex items-center">
                <Star className="h-4 w-4 mr-1" />
                {totalPoints} pts
              </span>
            </div>

            {/* Points Redemption */}
            <div className="border-t pt-3">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redeem Points (Available: {user.totalPoints})
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    max={user.totalPoints}
                    value={pointsToRedeem}
                    onChange={(e) => {
                      const value = Math.min(parseInt(e.target.value) || 0, user.totalPoints);
                      handlePointsRedemption(value);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Points to redeem"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">1 point = ₹0.01 discount</p>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Points Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || items.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Submitting Order...' : 'Place Order'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Your order will be pending admin approval
          </p>
        </div>
      </div>
    </div>
  );
}