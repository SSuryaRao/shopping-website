'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiClient } from '@/lib/api';
import { Minus, Plus, Trash2, Star, ShoppingBag, ArrowLeft, Banknote, QrCode, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

type PaymentMethod = 'cash' | 'qr';

export default function CartPage() {
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, getSubtotal, getTotalPoints } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashPaidTo, setCashPaidTo] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [upiConfig, setUpiConfig] = useState<{ upiId: string; payeeName: string } | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const subtotal = getSubtotal();
  const totalPoints = getTotalPoints();
  const finalTotal = subtotal;

  // Dynamic UPI link - the QR always carries the current cart total
  const upiLink = upiConfig?.upiId
    ? `upi://pay?pa=${upiConfig.upiId}&pn=${encodeURIComponent(upiConfig.payeeName)}&am=${finalTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Smart Shoppy order')}`
    : '';

  useEffect(() => {
    if (!user) return;
    apiClient.getPaymentConfig()
      .then(setUpiConfig)
      .catch((err) => console.error('Error loading payment config:', err));
  }, [user]);

  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [screenshotPreview]);

  const handleScreenshotChange = (file: File | null) => {
    setError('');
    if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Screenshot must be a JPEG, PNG or WebP image');
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError('Screenshot must be smaller than 5MB');
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    setError('');

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    if (paymentMethod === 'cash' && !cashPaidTo.trim()) {
      setError('Please enter the name of the person you gave the cash to');
      return;
    }
    if (paymentMethod === 'qr' && !screenshot) {
      setError('Please upload the payment screenshot');
      return;
    }

    setLoading(true);
    try {
      await apiClient.createOrder({
        items: items.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        paymentMethod,
        cashPaidTo: paymentMethod === 'cash' ? cashPaidTo.trim() : undefined,
        paymentScreenshot: paymentMethod === 'qr' ? screenshot ?? undefined : undefined,
      });

      // Order submitted successfully
      alert('Order submitted successfully! Awaiting admin approval.');
      clearCart();
      router.push('/dashboard?tab=orders');
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error instanceof Error ? error.message : 'Error creating order. Please try again.');
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <p className="text-gray-600">{items.length} item(s) in your cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Mobile Layout */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex-shrink-0">
                      <Image
                        src={item.product.imageURL}
                        alt={item.product.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{item.product.name}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{item.product.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-lg font-bold text-gray-900">
                          ₹{item.product.price.toFixed(2)}
                        </span>
                        <div className="flex items-center text-yellow-600">
                          <Star className="h-4 w-4 mr-1" />
                          <span className="text-sm">{item.product.points} pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="w-8 text-center font-medium text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product._id)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
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

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use your points in the <Link href="/rewards" className="text-blue-600 hover:underline">Rewards</Link> tab
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t pt-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => { setPaymentMethod('cash'); setError(''); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <Banknote className="h-6 w-6" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('qr'); setError(''); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'qr' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <QrCode className="h-6 w-6" />
                <span className="text-sm font-medium">UPI QR</span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label htmlFor="cashPaidTo" className="block text-sm font-medium text-gray-700 mb-2">
                  Name of the person you gave the cash to
                </label>
                <input
                  id="cashPaidTo"
                  type="text"
                  value={cashPaidTo}
                  onChange={(e) => setCashPaidTo(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                />
              </div>
            )}

            {paymentMethod === 'qr' && (
              upiLink ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center bg-gray-50 rounded-lg p-4">
                    <div className="bg-white p-3 rounded-lg">
                      <QRCodeSVG value={upiLink} size={180} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-3">Pay ₹{finalTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-600 break-all text-center">UPI ID: {upiConfig?.upiId}</p>
                    <a
                      href={upiLink}
                      className="sm:hidden mt-3 text-sm font-medium text-blue-600 underline"
                    >
                      Open in UPI app
                    </a>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload payment screenshot
                    </label>
                    <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors">
                      {screenshotPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                        <img src={screenshotPreview} alt="Payment screenshot preview" className="max-h-48 rounded" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-gray-400 mb-1" />
                          <span className="text-sm text-gray-600">Tap to choose image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleScreenshotChange(e.target.files?.[0] || null)}
                      />
                    </label>
                    {screenshot && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{screenshot.name}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">
                  QR payment is not available right now. Please pay by cash.
                </p>
              )
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || items.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Submitting Order...' : 'Place Order'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Your order will be confirmed after the admin verifies your payment
          </p>
        </div>
      </div>
    </div>
  );
}