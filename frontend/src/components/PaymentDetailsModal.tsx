'use client';

import { useEffect, useState } from 'react';
import { X, Banknote, QrCode, ExternalLink, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Order } from '@/types';

interface PaymentDetailsModalProps {
  order: Order;
  // Other pending orders, used to show everything bought in the same checkout
  allOrders: Order[];
  onClose: () => void;
  onApprove: (orderId: string) => void;
  onReject: (orderId: string) => void;
  // True while this order is being approved / rejected
  processing?: boolean;
}

export default function PaymentDetailsModal({ order, allOrders, onClose, onApprove, onReject, processing = false }: PaymentDetailsModalProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState('');
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);

  const customer = typeof order.userId === 'object' ? order.userId : null;
  const isCustomerActive = !!customer?.isActive;
  const checkoutOrders = order.checkoutId
    ? allOrders.filter((o) => o.checkoutId === order.checkoutId)
    : [order];
  // Other items of this checkout may already have been approved/rejected and dropped off the pending list
  const pendingCheckoutTotal = checkoutOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const someItemsProcessed = !!order.checkoutTotal && pendingCheckoutTotal < order.checkoutTotal - 0.005;
  const handleClose = () => {
    if (!processing) onClose();
  };

  useEffect(() => {
    if (order.paymentMethod !== 'qr' || !order.paymentScreenshot) return;

    let objectUrl: string | null = null;
    setLoadingScreenshot(true);
    setScreenshotError('');
    apiClient.getPaymentScreenshotUrl(order._id)
      .then((url) => {
        objectUrl = url;
        setScreenshotUrl(url);
      })
      .catch((err) => setScreenshotError(err instanceof Error ? err.message : 'Failed to load screenshot'))
      .finally(() => setLoadingScreenshot(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [order._id, order.paymentMethod, order.paymentScreenshot]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
          <button onClick={handleClose} disabled={processing} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Customer</p>
            <p className="font-semibold text-gray-900">{customer?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600">{customer?.uniqueUserId}</p>
            {customer?.mobileNumber && <p className="text-sm text-gray-600">{customer.mobileNumber}</p>}
            {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
          </div>

          {/* Payment mode */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Payment Mode</p>
            {order.paymentMethod === 'cash' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                  <Banknote className="h-5 w-5" />
                  Cash
                </div>
                <p className="text-sm text-gray-700">
                  Cash given to: <span className="font-semibold text-gray-900">{order.cashPaidTo || 'Not provided'}</span>
                </p>
              </div>
            )}

            {order.paymentMethod === 'qr' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 font-semibold mb-3">
                  <QrCode className="h-5 w-5" />
                  UPI QR
                </div>
                {loadingScreenshot && <p className="text-sm text-gray-600">Loading screenshot...</p>}
                {screenshotError && <p className="text-sm text-red-600">{screenshotError}</p>}
                {screenshotUrl && (
                  <div>
                    <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" title="Open full size">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from an authenticated fetch */}
                      <img src={screenshotUrl} alt="Payment screenshot" className="w-full max-h-96 object-contain rounded-lg bg-white border" />
                    </a>
                    <a
                      href={screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open full size
                    </a>
                  </div>
                )}
              </div>
            )}

            {!order.paymentMethod && (
              <p className="text-sm text-gray-500">No payment details (order placed before payment options were added)</p>
            )}
          </div>

          {/* Checkout contents */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              {checkoutOrders.length > 1 ? `This checkout (${checkoutOrders.length} items)` : 'Order'}
            </p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {checkoutOrders.map((o) => (
                <div
                  key={o._id}
                  className={`flex justify-between gap-3 px-3 py-2 text-sm ${o._id === order._id ? 'bg-yellow-50' : ''}`}
                >
                  <span className="text-gray-900">
                    {typeof o.productId === 'object' ? o.productId?.name : 'N/A'} × {o.quantity}
                  </span>
                  <span className="font-medium text-gray-900">₹{o.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm font-bold text-gray-900">
              <span>Amount paid for this checkout</span>
              <span>₹{(order.checkoutTotal ?? order.totalPrice).toFixed(2)}</span>
            </div>
            {someItemsProcessed && (
              <p className="text-xs text-amber-700 mt-1">
                Some items from this checkout were already approved or rejected, so they are not listed above.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button
            onClick={() => onApprove(order._id)}
            disabled={!isCustomerActive || processing}
            title={isCustomerActive ? 'Approve order' : 'User must be activated first'}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            {processing ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => onReject(order._id)}
            disabled={processing}
            className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
        </div>
        {!isCustomerActive && (
          <p className="text-xs text-red-600 text-center pb-4 -mt-2">User must be activated first</p>
        )}
      </div>
    </div>
  );
}
