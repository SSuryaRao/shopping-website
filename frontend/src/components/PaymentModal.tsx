'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image: string;
  prefill: {
    name: string;
    email: string;
  };
  notes: Record<string, unknown>;
  theme: {
    color: string;
  };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayError {
  description: string;
}

interface Razorpay {
  open(): void;
  on(event: string, handler: (response: { error: RazorpayError }) => void): void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => Razorpay;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    _id: string;
    totalPrice: number;
    pointsEarned: number;
  };
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, order, onPaymentSuccess }: PaymentModalProps) {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const loadRazorpay = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        alert('Failed to load payment gateway. Please try again.');
      };
      document.body.appendChild(script);
    };

    if (isOpen) {
      loadRazorpay();
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!razorpayLoaded || !firebaseUser) {
      alert('Payment gateway not ready. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Create Razorpay order
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({ orderId: order._id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const { orderId, amount, currency, key, notes } = await response.json();

      // Initialize Razorpay checkout
      const options = {
        key,
        amount,
        currency,
        order_id: orderId,
        name: 'Your Store Name',
        description: `Payment for Order #${order._id}`,
        image: '/logo.png', // Add your logo path
        prefill: {
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
        },
        notes,
        theme: {
          color: '#2563eb', // Blue color matching your theme
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Verify payment
            const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              onPaymentSuccess();
              onClose();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', async (response: { error: RazorpayError }) => {
        console.error('Payment failed:', response.error);

        // Report payment failure
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/payment-failed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
            },
            body: JSON.stringify({
              razorpay_order_id: orderId,
              error: response.error,
            }),
          });
        } catch (error) {
          console.error('Failed to report payment failure:', error);
        }

        alert(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });

      rzp.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono">#{order._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold">${order.totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Points to Earn:</span>
                <span className="text-yellow-600 font-medium">{order.pointsEarned} pts</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p>You will be redirected to Razorpay to complete your payment securely.</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePayment}
            disabled={loading || !razorpayLoaded}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${order.totalPrice.toFixed(2)}
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <span>🔒</span>
            <span>Payments are secured by Razorpay</span>
          </div>
          <div className="text-xs text-gray-500">
            By proceeding, you agree to our{' '}
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Terms
            </a>
            ,{' '}
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Privacy
            </a>
            {' '}&{' '}
            <a
              href="https://merchant.razorpay.com/policy/RIwRkvOb19eD9N/refund"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Refund Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}