'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import Image from 'next/image';
import { Package, CheckCircle, Truck, XCircle, Clock, FileText, Printer, Download, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Order {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  productId: {
    _id: string;
    name: string;
    imageURL: string;
    price: number;
  };
  quantity: number;
  totalPrice: number;
  pointsEarned: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.push('/unauthorized');
      return;
    }
    fetchOrders();
  }, [user, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingOrderId(orderId);
      await apiClient.updateOrderStatus(orderId, newStatus);

      // Update local state
      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, status: newStatus as Order['status'] } : order
      ));

      alert('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handlePrintBill = () => {
    if (billRef.current) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice #${selectedOrderForBill?._id.slice(-8)}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .bill-container { max-width: 800px; margin: 0 auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                .header { text-align: center; margin-bottom: 30px; }
                .total { font-size: 18px; font-weight: bold; }
                @media print { button { display: none; } }
              </style>
            </head>
            <body>
              ${billRef.current.innerHTML}
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleDownloadBill = () => {
    if (billRef.current && selectedOrderForBill) {
      const billContent = billRef.current.innerHTML;
      const blob = new Blob([`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Invoice #${selectedOrderForBill._id.slice(-8)}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .bill-container { max-width: 800px; margin: 0 auto; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              .header { text-align: center; margin-bottom: 30px; }
              .total { font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            ${billContent}
          </body>
        </html>
      `], { type: 'text/html' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${selectedOrderForBill._id.slice(-8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-2">Manage customer orders and delivery status</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No paid orders yet</h2>
          <p className="text-gray-600">Orders will appear here once customers complete payment</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Update Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      #{order._id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.userId.name}</div>
                      <div className="text-sm text-gray-500">{order.userId.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <Image
                            src={order.productId.imageURL}
                            alt={order.productId.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.productId.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{order.totalPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        disabled={updatingOrderId === order._id}
                        className="block w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedOrderForBill(order)}
                        className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-800">
              {orders.filter(o => o.status === 'pending').length}
            </div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-800">
              {orders.filter(o => o.status === 'processing').length}
            </div>
            <div className="text-sm text-blue-600">Processing</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-800">
              {orders.filter(o => o.status === 'shipped').length}
            </div>
            <div className="text-sm text-purple-600">Shipped</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-800">
              {orders.filter(o => o.status === 'delivered').length}
            </div>
            <div className="text-sm text-green-600">Delivered</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-800">
              {orders.length}
            </div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
        </div>
      </div>

      {/* Bill/Invoice Modal */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Invoice #{selectedOrderForBill._id.slice(-8)}</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintBill}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={handleDownloadBill}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setSelectedOrderForBill(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div ref={billRef} className="p-8">
              <div className="bill-container">
                {/* Header */}
                <div className="header text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
                  <div className="text-xl font-semibold text-indigo-600">Smart Shoppy</div>
                  <p className="text-sm text-gray-600 mt-2">
                    Your Trusted E-Commerce Platform<br />
                    Email: support@smartshoppy.com | Phone: +1 (555) 123-4567
                  </p>
                </div>

                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</h3>
                    <div className="text-gray-900">
                      <p className="font-semibold">{selectedOrderForBill.userId.name}</p>
                      <p className="text-sm text-gray-600">{selectedOrderForBill.userId.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">Invoice #:</span>{' '}
                      <span className="font-mono font-semibold">{selectedOrderForBill._id.slice(-8)}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">Date:</span>{' '}
                      <span className="font-semibold">
                        {new Date(selectedOrderForBill.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>{' '}
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedOrderForBill.status)}`}>
                        {selectedOrderForBill.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 text-sm font-semibold text-gray-700">PRODUCT</th>
                      <th className="text-center py-3 text-sm font-semibold text-gray-700">QUANTITY</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-700">UNIT PRICE</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-700">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-4">
                        <div className="font-medium text-gray-900">{selectedOrderForBill.productId.name}</div>
                      </td>
                      <td className="py-4 text-center text-gray-900">{selectedOrderForBill.quantity}</td>
                      <td className="py-4 text-right text-gray-900">
                        ₹{selectedOrderForBill.productId.price.toFixed(2)}
                      </td>
                      <td className="py-4 text-right font-semibold text-gray-900">
                        ₹{(selectedOrderForBill.productId.price * selectedOrderForBill.quantity).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Total Section */}
                <div className="flex justify-end mb-8">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-t border-gray-200">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold text-gray-900">
                        ₹{(selectedOrderForBill.productId.price * selectedOrderForBill.quantity).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Points Earned:</span>
                      <span className="font-semibold text-yellow-600">
                        {selectedOrderForBill.pointsEarned} pts
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 border-gray-300">
                      <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                      <span className="text-lg font-bold text-indigo-600">
                        ₹{selectedOrderForBill.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-semibold">Payment Status: PAID</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Payment received on {new Date(selectedOrderForBill.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-600 pt-8 border-t border-gray-200">
                  <p className="font-semibold mb-2">Thank you for your business!</p>
                  <p>If you have any questions about this invoice, please contact us at support@smartshoppy.com</p>
                  <p className="mt-4 text-xs text-gray-500">
                    This is a computer-generated invoice and does not require a signature.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
