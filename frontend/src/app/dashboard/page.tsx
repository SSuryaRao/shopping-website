'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Order, User } from '@/types';
import { Star, ShoppingBag, Package, Calendar, TrendingUp, Gift, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function DashboardContent() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    totalPointsEarned: 0,
    currentPoints: 0,
  });
  const [localUserProfile, setLocalUserProfile] = useState<User | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [ordersData, userProfile] = await Promise.all([
        apiClient.getUserOrders(),
        apiClient.getUserProfile(),
      ]);

      // Store the fresh user profile locally
      setLocalUserProfile(userProfile);

      setOrders(ordersData || []);

      const totalSpent = (ordersData || []).reduce((sum: number, order: Order) => sum + (order.totalPrice || 0), 0);
      const totalPointsEarned = (ordersData || []).reduce((sum: number, order: Order) => sum + (order.pointsEarned || 0), 0);

      setStats({
        totalOrders: (ordersData || []).length,
        totalSpent,
        totalPointsEarned,
        currentPoints: userProfile?.totalPoints || 0,
      });
    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error
      setOrders([]);
      setStats({
        totalOrders: 0,
        totalSpent: 0,
        totalPointsEarned: 0,
        currentPoints: user?.totalPoints || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]); // fetchDashboardData is defined inside this component and should not be in dependencies

  // Auto-refresh user profile every 30 seconds to check for account status changes
  useEffect(() => {
    if (!user || authLoading) return;

    const intervalId = setInterval(async () => {
      await refreshUser();
      // Also refresh local dashboard data
      const freshProfile = await apiClient.getUserProfile();
      setLocalUserProfile(freshProfile);
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [user, authLoading, refreshUser]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'orders', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getOrderStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'pending_admin_approval': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pending Admin Approval'
      },
      'admin_approved': {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Admin Approved'
      },
      'processing': {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        label: 'Processing'
      },
      'shipped': {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Shipped'
      },
      'delivered': {
        bg: 'bg-teal-100',
        text: 'text-teal-800',
        label: 'Delivered'
      },
      'completed': {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Completed'
      },
      'cancelled': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Cancelled'
      },
      'pending': {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: 'Pending'
      }
    };

    const config = statusConfig[status] || statusConfig['pending'];

    return (
      <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-bold`}>
        {config.label}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Use the freshly fetched local profile if available, otherwise fall back to auth context user
  const displayUser = localUserProfile || user;

  const TabButton = ({ tab, label, icon: Icon }: { tab: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
        activeTab === tab
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
          : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="hidden sm:block">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Welcome back, <span className="text-yellow-300">{displayUser.name}!</span>
            </h1>
            <p className="text-indigo-100 text-lg">Manage your account and track your rewards journey</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
        {/* Account Activation Status Banner */}
        {displayUser && !displayUser.isActive && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold text-yellow-800">Account Pending Activation</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Your account is awaiting admin activation. Once activated, you will be able to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Generate and use referral codes</li>
                    <li>Join the MLM tree and earn commissions</li>
                    <li>View your downline and upline</li>
                    <li>Receive MLM commission points</li>
                  </ul>
                  <p className="mt-2 font-medium">Please contact support if you have been waiting for more than 24 hours.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center space-x-2 bg-white/80 backdrop-blur-lg p-2 rounded-2xl shadow-lg mb-8">
          <TabButton tab="overview" label="Overview" icon={TrendingUp} />
          <TabButton tab="orders" label="Orders" icon={Package} />
          <TabButton tab="profile" label="Profile" icon={UserIcon} />
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid - Mobile-First Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-yellow-200 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg mb-3 sm:mb-0 self-start">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-yellow-700">Current Points</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-900">{stats.currentPoints}</p>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-2xl">⭐</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg mb-3 sm:mb-0 self-start">
                    <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-blue-700">Total Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">{stats.totalOrders}</p>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-2xl">🛍️</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-emerald-200 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg mb-3 sm:mb-0 self-start">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-emerald-700">Total Spent</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-900">₹{stats.totalSpent.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-2xl">💰</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-purple-200 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg mb-3 sm:mb-0 self-start">
                    <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-purple-700">Points Earned</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900">{stats.totalPointsEarned}</p>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-2xl">🎁</span>
                </div>
              </div>
            </div>

            {/* Points Section - Enhanced Mobile Design */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
              <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-6 sm:p-8 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2">Your Points Balance</h3>
                    <div className="bg-white/20 rounded-full px-3 py-1 inline-block">
                      <span className="text-sm font-medium">Ready to use</span>
                    </div>
                  </div>
                  <div className="text-4xl">💎</div>
                </div>

                <div className="mb-6">
                  <p className="text-4xl sm:text-5xl font-bold mb-2">{stats.currentPoints}</p>
                  <p className="opacity-90 text-lg">Points available</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-medium transition-colors backdrop-blur-sm">
                    Redeem Points
                  </button>
                  <Link
                    href="/"
                    className="bg-white text-orange-500 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors text-center"
                  >
                    Earn More
                  </Link>
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Points Program</h3>
                  <div className="text-3xl">🏆</div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                    <span className="text-gray-700 font-medium">Every ₹1 spent</span>
                    <span className="font-bold text-indigo-600">1-5 points</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <span className="text-gray-700 font-medium">100 points value</span>
                    <span className="font-bold text-green-600">₹1 discount</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                    <span className="text-gray-700 font-medium">Minimum redemption</span>
                    <span className="font-bold text-purple-600">50 points</span>
                  </div>
                </div>

                <Link
                  href="/"
                  className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium text-center shadow-lg"
                >
                  Continue Shopping 🛍️
                </Link>
              </div>
            </div>

            {/* Recent Orders - Enhanced Mobile Design */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Orders</h3>
                  <div className="text-2xl">📦</div>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 sm:p-12 text-center">
                  <div className="bg-gray-100 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-6">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg sm:text-xl font-medium mb-2">No orders yet</p>
                  <p className="text-gray-400 mb-6">Start your shopping journey and track your orders here</p>
                  <Link
                    href="/"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Browse Products 🛍️
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 mb-2 text-lg">
                            {order.product?.name || 'Product'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600">
                            <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(order.createdAt.toString())}
                            </span>
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                              Qty: {order.quantity}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                order.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'processing'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : order.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-bold text-gray-900 mb-1">
                            ₹{order.totalPrice.toFixed(2)}
                          </p>
                          <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                            <Star className="h-3 w-3 mr-1" />
                            +{order.pointsEarned} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {orders.length > 10 && (
                <div className="p-6 border-t border-gray-200 text-center bg-gray-50">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-indigo-600 hover:text-indigo-800 font-medium bg-white px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-lg"
                  >
                    View all orders →
                  </button>
                </div>
              )}
            </div>
        </>
      )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">All Orders</h3>
                <div className="text-2xl">📋</div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="bg-gray-100 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-6">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg sm:text-xl font-medium mb-2">No orders yet</p>
                <p className="text-gray-400 mb-6">Start your shopping journey to see your order history</p>
                <Link
                  href="/"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Browse Products 🛍️
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <div key={order._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2 text-lg">
                          {order.product?.name || 'Product'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600">
                          <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(order.createdAt.toString())}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                            Qty: {order.quantity}
                          </span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          ₹{order.totalPrice.toFixed(2)}
                        </p>
                        <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                          <Star className="h-3 w-3 mr-1" />
                          +{order.pointsEarned} pts
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Information</h3>
                <div className="text-2xl">👤</div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* User Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">Full Name</label>
                  <div className="bg-gradient-to-r from-gray-50 to-indigo-50 px-4 py-4 rounded-xl border border-gray-200">
                    <p className="font-medium text-gray-900">{displayUser?.name || 'Not available'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">User ID</label>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 rounded-xl border border-blue-200">
                    <p className="font-bold text-blue-900">{displayUser?.uniqueUserId || 'Not available'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">Email Address</label>
                  <div className="bg-gradient-to-r from-gray-50 to-indigo-50 px-4 py-4 rounded-xl border border-gray-200">
                    <p className="font-medium text-gray-900">{displayUser?.email || 'Not available'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">Account Type</label>
                  <div className="bg-gradient-to-r from-gray-50 to-indigo-50 px-4 py-4 rounded-xl border border-gray-200">
                    <p className="font-medium text-gray-900">
                      {displayUser?.role ? displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1) : 'Customer'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">Member Since</label>
                  <div className="bg-gradient-to-r from-gray-50 to-indigo-50 px-4 py-4 rounded-xl border border-gray-200">
                    <p className="font-medium text-gray-900">
                      {displayUser?.createdAt ? formatDate(displayUser.createdAt.toString()) : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">Account Status</label>
                <div className="flex flex-wrap gap-3">
                  {/* Activation Status Badge */}
                  <span
                    className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl shadow-lg ${
                      displayUser?.isActive
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                    }`}
                  >
                    {displayUser?.isActive ? (
                      <>
                        <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                        ✅ Active User
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                        🕐 Inactive - Pending Activation
                      </>
                    )}
                  </span>

                  {/* Admin Badge */}
                  {displayUser?.isAdmin && (
                    <span className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
                      ⚡ Admin Access
                    </span>
                  )}

                  {/* Super Admin Badge */}
                  {displayUser?.isSuperAdmin && (
                    <span className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                      👑 Super Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg inline-block mb-3">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-yellow-700">Total Points</p>
                  <p className="text-2xl font-bold text-yellow-900">{displayUser?.totalPoints || 0}</p>
                  <div className="mt-2 text-2xl">⭐</div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg inline-block mb-3">
                    <ShoppingBag className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-blue-700">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalOrders}</p>
                  <div className="mt-2 text-2xl">🛍️</div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg inline-block mb-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">Total Spent</p>
                  <p className="text-2xl font-bold text-emerald-900">₹{stats.totalSpent.toFixed(2)}</p>
                  <div className="mt-2 text-2xl">💰</div>
                </div>
              </div>

              {/* Admin Access Cards */}
              {displayUser?.isAdmin && (
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl shadow-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <UserIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-lg font-bold text-green-800 mb-2">🚀 Admin Access</h4>
                      <p className="text-green-700 mb-4">You have administrative privileges to manage products and oversee the platform.</p>
                      <Link
                        href="/admin"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Go to Admin Dashboard →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {displayUser?.isSuperAdmin && (
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl shadow-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-lg font-bold text-purple-800 mb-2">👑 Super Admin Access</h4>
                      <p className="text-purple-700 mb-4">You have full system access including invite management and user approvals.</p>
                      <Link
                        href="/admin/invites"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Manage Invites & Approvals →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}