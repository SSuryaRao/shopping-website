'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Product, User, Order } from '@/types';
import { Plus, Edit, Trash2, Upload, Package, Users, TrendingUp, DollarSign, UserPlus, ShoppingCart, Search, UserX, UserCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'orders' | 'active' | 'purchase-for-user'>('products');

  // Search and filter states
  const [pendingUsersSearch, setPendingUsersSearch] = useState('');
  const [activeUsersSearch, setActiveUsersSearch] = useState('');
  const [activeUsersFilter, setActiveUsersFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    pendingUsers: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    // ProtectedRoute component handles authentication and admin checks
    // Just fetch data when user is ready
    if (!authLoading && user && user.isAdmin) {
      fetchAdminData();
    }
  }, [user, authLoading]);

  const fetchAdminData = async () => {
    try {
      const [productsData, usersData, allUsersData, ordersData] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getPendingUsers().catch((err) => {
          console.error('Error fetching pending users:', err);
          return { data: [], count: 0 };
        }),
        apiClient.getAllUsers().catch((err) => {
          console.error('Error fetching all users:', err);
          return { data: [], count: 0 };
        }),
        apiClient.getPendingOrders().catch((err) => {
          console.error('Error fetching pending orders:', err);
          return { data: [], count: 0 };
        }),
      ]);

      setProducts(productsData);
      setPendingUsers(usersData.data || []);
      setAllUsers(allUsersData.data || []);
      setPendingOrders(ordersData.data || []);

      const inactiveUsersCount = (allUsersData.data || []).filter((u: User) => !u.isActive).length;

      setStats({
        totalProducts: productsData.length,
        totalUsers: allUsersData.count || 0,
        totalRevenue: 12500, // Mock data
        totalOrders: 89, // Mock data
        pendingUsers: inactiveUsersCount,
        pendingOrders: ordersData.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await apiClient.deleteProduct(id);
      setProducts(products.filter(p => p._id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await apiClient.activateUser(userId);
      alert('User activated successfully!');
      await fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error activating user:', error);
      alert('Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${userName}? They will remain in the MLM tree but will not receive any further points.`)) {
      return;
    }

    try {
      await apiClient.deactivateUser(userId);
      alert('User deactivated successfully! They will remain in the tree but will not receive points.');
      await fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Failed to deactivate user');
    }
  };

  // Filter functions for search and status
  const filteredPendingUsers = pendingUsers.filter((user: User) => {
    const searchLower = pendingUsersSearch.toLowerCase();
    return (
      user.uniqueUserId.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.mobileNumber && user.mobileNumber.includes(searchLower))
    );
  });

  const filteredActiveUsers = allUsers.filter((user: User) => {
    const searchLower = activeUsersSearch.toLowerCase();
    const matchesSearch = (
      user.uniqueUserId.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.mobileNumber && user.mobileNumber.includes(searchLower))
    );

    const matchesFilter =
      activeUsersFilter === 'all' ? true :
      activeUsersFilter === 'active' ? user.isActive :
      !user.isActive;

    return matchesSearch && matchesFilter;
  });

  const handleApproveOrder = async (orderId: string) => {
    const notes = prompt('Enter approval notes (optional):');
    try {
      await apiClient.approveOrder(orderId, notes || '');
      alert('Order approved successfully! Points and commissions distributed.');
      await fetchAdminData(); // Refresh data
    } catch (error: unknown) {
      console.error('Error approving order:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve order';
      alert(errorMessage);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await apiClient.rejectOrder(orderId, reason);
      alert('Order rejected successfully.');
      await fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Failed to reject order');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your products and monitor your business</p>
          </div>

          <div className="flex space-x-4">
            <Link
              href="/admin/orders"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Manage Orders
            </Link>
            {user?.isSuperAdmin && (
              <Link
                href="/admin/invites"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Invites
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation - Mobile Optimized */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-8">
        <div className="inline-flex sm:flex sm:flex-wrap gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-2 min-w-max sm:min-w-0">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'products'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <Package className="h-5 w-5 mr-2" />
          Products
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all relative ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <UserCheck className="h-5 w-5 mr-2" />
          Active Users
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all relative ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <Users className="h-5 w-5 mr-2" />
          Pending Users
          {stats.pendingUsers > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {stats.pendingUsers}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all relative ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Pending Orders
          {stats.pendingOrders > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {stats.pendingOrders}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('purchase-for-user')}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'purchase-for-user'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Purchase for User
        </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl shadow-lg border border-indigo-200 hover:shadow-xl transition-all">
          <div className="flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-indigo-600 font-medium">Total Products</p>
              <p className="text-2xl font-bold text-indigo-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl shadow-lg border border-emerald-200 hover:shadow-xl transition-all">
          <div className="flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-emerald-600 font-medium">Total Users</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl shadow-lg border border-purple-200 hover:shadow-xl transition-all">
          <div className="flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-purple-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-900">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl shadow-lg border border-amber-200 hover:shadow-xl transition-all">
          <div className="flex items-center">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-amber-600 font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-amber-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Management Tab */}
      {activeTab === 'products' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Product Management</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No products yet</p>
            <p className="text-gray-400 mb-6">Add your first product to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </button>
          </div>
        ) : (
          <>
          {/* Mobile Card View */}
          <div className="block md:hidden p-4 space-y-4">
            {products.map((product) => (
              <div key={product._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex gap-4 mb-4">
                  <div className="h-20 w-20 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={product.imageURL}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{product.category}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`text-sm font-medium ${
                        product.stock <= 5 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {product.stock} units
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">Price:</span>
                    <p className="font-semibold text-gray-900">₹{product.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Points:</span>
                    <p className="font-semibold text-yellow-600">{product.points} pts</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product._id)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 relative rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={product.imageURL}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {product.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{product.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-yellow-600">
                        {product.points} pts
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        product.stock <= 5 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {product.stock} units
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      )}

      {/* Active Users Tab */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">All Users</h3>
                <p className="text-sm text-gray-600 mt-1">{filteredActiveUsers.length} users ({allUsers.filter((u: User) => u.isActive).length} active, {allUsers.filter((u: User) => !u.isActive).length} inactive)</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Filter Dropdown */}
                <select
                  value={activeUsersFilter}
                  onChange={(e) => setActiveUsersFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm font-medium"
                >
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="all">All Users</option>
                </select>
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by UID, name, email..."
                    value={activeUsersSearch}
                    onChange={(e) => setActiveUsersSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredActiveUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg mb-2">No users found</p>
              <p className="text-gray-400">Try adjusting your search or filter</p>
            </div>
          ) : (
            <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-4">
              {filteredActiveUsers.map((user: User) => (
                <div key={user._id!} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-100 rounded-lg px-3 py-1">
                          <span className="text-xs font-bold text-blue-900">{user.uniqueUserId}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-1 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{user.email || user.mobileNumber}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                          user.role === 'shopkeeper' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                        <span className="text-sm font-medium text-yellow-600">{user.totalPoints || 0} pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    {user.isActive ? (
                      <button
                        onClick={() => handleDeactivateUser(user._id!, user.name)}
                        className="w-full inline-flex items-center justify-center bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-3 rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-medium shadow-md"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateUser(user._id!)}
                        className="w-full inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-md"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID (UID)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredActiveUsers.map((user: User) => (
                    <tr key={user._id!} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 rounded-lg px-3 py-1">
                            <span className="text-sm font-bold text-blue-900">{user.uniqueUserId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {user.email && <div className="flex items-center"><span className="mr-1">📧</span>{user.email}</div>}
                          {user.mobileNumber && <div className="flex items-center"><span className="mr-1">📱</span>{user.mobileNumber}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          user.role === 'shopkeeper' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-yellow-600">{user.totalPoints || 0} pts</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.isActive ? (
                          <button
                            onClick={() => handleDeactivateUser(user._id!, user.name)}
                            className="inline-flex items-center bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateUser(user._id!)}
                            className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* Pending Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pending User Activations</h3>
                <p className="text-sm text-gray-600 mt-1">{filteredPendingUsers.length} inactive users awaiting activation</p>
              </div>
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by UID, name, email..."
                  value={pendingUsersSearch}
                  onChange={(e) => setPendingUsersSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {filteredPendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No pending users</p>
              <p className="text-gray-400">All users have been activated</p>
            </div>
          ) : (
            <>
            {/* Mobile Card View */}
            <div className="block md:hidden p-4 space-y-4">
              {filteredPendingUsers.map((user: User) => (
                <div key={user._id!} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="bg-blue-100 rounded-lg px-3 py-1 inline-block mb-2">
                        <span className="text-sm font-bold text-blue-900">{user.uniqueUserId}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email || user.mobileNumber}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          user.role === 'shopkeeper' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                        <span className="text-xs text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleActivateUser(user._id!)}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Activate User
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPendingUsers.map((user: User) => (
                    <tr key={user._id!} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 rounded-lg px-3 py-1">
                            <span className="text-sm font-bold text-blue-900">{user.uniqueUserId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email || user.mobileNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          user.role === 'shopkeeper' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleActivateUser(user._id!)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Activate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* Pending Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Pending Order Approvals</h3>
              <span className="text-sm text-gray-600">{pendingOrders.length} orders awaiting approval</span>
            </div>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No pending orders</p>
              <p className="text-gray-400">All orders have been processed</p>
            </div>
          ) : (
            <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-4">
              {pendingOrders.map((order: Order) => (
                <div key={order._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500">#{order._id.slice(-6)}</span>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          (typeof order.userId === 'object' && order.userId?.isActive) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(typeof order.userId === 'object' && order.userId?.isActive) ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{typeof order.userId === 'object' ? order.userId?.name : 'N/A'}</h3>
                      <p className="text-xs text-gray-500">{typeof order.userId === 'object' ? order.userId?.uniqueUserId : 'N/A'}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Product:</span>
                          <span className="font-medium text-gray-900">{typeof order.productId === 'object' ? order.productId?.name : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium text-gray-900">{order.quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-bold text-gray-900">₹{order.totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Points:</span>
                          <span className="font-medium text-yellow-600">+{order.pointsEarned} pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Date:</span>
                          <span className="text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleApproveOrder(order._id)}
                      disabled={!(typeof order.userId === 'object' && order.userId?.isActive)}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectOrder(order._id)}
                      className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Reject
                    </button>
                  </div>
                  {!(typeof order.userId === 'object' && order.userId?.isActive) && (
                    <p className="text-xs text-red-600 mt-2 text-center">User must be activated first</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingOrders.map((order: Order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order._id.slice(-6)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{typeof order.userId === 'object' ? order.userId?.name : 'N/A'}</div>
                        <div className="text-xs text-gray-500">{typeof order.userId === 'object' ? order.userId?.uniqueUserId : 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{typeof order.productId === 'object' ? order.productId?.name : 'N/A'}</div>
                        <div className="text-xs text-gray-500">₹{typeof order.productId === 'object' ? order.productId?.price : 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.totalPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">+{order.pointsEarned} pts</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          (typeof order.userId === 'object' && order.userId?.isActive) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(typeof order.userId === 'object' && order.userId?.isActive) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleApproveOrder(order._id)}
                          disabled={!(typeof order.userId === 'object' && order.userId?.isActive)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!(typeof order.userId === 'object' && order.userId?.isActive) ? 'User must be activated first' : 'Approve order'}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectOrder(order._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          onSave={(product) => {
            if (editingProduct) {
              setProducts(products.map(p => p._id === product._id ? product : p));
            } else {
              setProducts([...products, product]);
            }
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Purchase for User Tab */}
      {activeTab === 'purchase-for-user' && (
        <PurchaseForUserTab />
      )}
      </div>
    </ProtectedRoute>
  );
}

// Product Modal Component
interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    points: product?.points || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    isActive: product?.isActive ?? true,
  });
  const [buyerRewardPoints, setBuyerRewardPoints] = useState(product?.buyerRewardPoints || 0);
  const [uplineCommissionPoints, setUplineCommissionPoints] = useState(
    product?.commissionStructure?.[0]?.points || 0
  );
  const [useManualDistribution, setUseManualDistribution] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageURL || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(product?.imageURL || null);
    }
  };

  const calculateTotals = () => {
    if (useManualDistribution) {
      // Manual distribution mode
      const totalCommissionPoints = uplineCommissionPoints * 19; // 19 levels, same points each
      const totalDistributionPoints = totalCommissionPoints + buyerRewardPoints;
      return { totalCommissionPoints, buyerRewardPoints, totalDistributionPoints };
    } else {
      // Auto distribution mode: 2% each for buyer and 19 upline members
      const autoPointsPerPerson = Math.floor(formData.points * 0.02);
      const totalCommissionPoints = autoPointsPerPerson * 19;
      const totalDistributionPoints = totalCommissionPoints + autoPointsPerPerson;
      return {
        totalCommissionPoints,
        buyerRewardPoints: autoPointsPerPerson,
        totalDistributionPoints
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });

      // Use auto-calculated or manual values based on toggle
      const finalBuyerPoints = useManualDistribution
        ? buyerRewardPoints
        : Math.floor(formData.points * 0.02);

      const finalUplinePoints = useManualDistribution
        ? uplineCommissionPoints
        : Math.floor(formData.points * 0.02);

      formDataToSend.append('buyerRewardPoints', finalBuyerPoints.toString());

      // Create commission structure for 19 levels with the same points
      const commissionStructure = Array.from({ length: 19 }, (_, i) => ({
        level: i + 1,
        points: finalUplinePoints
      }));
      formDataToSend.append('commissionStructure', JSON.stringify(commissionStructure));

      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      let savedProduct;
      if (product) {
        savedProduct = await apiClient.updateProduct(product._id, formDataToSend);
      } else {
        savedProduct = await apiClient.createProduct(formDataToSend);
      }

      onSave(savedProduct);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'toys', 'other'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                {product ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-indigo-100 mt-1">
                {product ? 'Update your product details' : 'Fill in the details to create a new product'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <Plus className="h-6 w-6 transform rotate-45" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg mb-6 flex items-center">
              <div className="flex-shrink-0 h-5 w-5 text-red-400 mr-3">⚠</div>
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Section */}
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors">
              <div className="text-center">
                <div className="mx-auto w-32 h-32 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center mb-4 overflow-hidden">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG or GIF up to 10MB</p>
              </div>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Enter product name..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none text-gray-900 placeholder-gray-500"
                  placeholder="Describe your product..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Price (₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Cost (₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Reward Points *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-yellow-500 font-bold">★</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Stock Quantity *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* MLM Commission Structure */}
              <div className="md:col-span-2 bg-indigo-50 rounded-xl p-6 border-2 border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-indigo-900">MLM Points Distribution</h4>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {useManualDistribution ? 'Manual' : 'Auto (2% each)'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useManualDistribution}
                        onChange={(e) => setUseManualDistribution(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {!useManualDistribution && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Auto Distribution:</strong> Each recipient (1 buyer + 19 upline members) will automatically receive 2% of the total reward points.
                    </p>
                  </div>
                )}

                {/* Buyer Reward */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Buyer Reward Points - Points the buyer gets when they purchase
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-yellow-500 font-bold text-lg">★</span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={useManualDistribution ? buyerRewardPoints : Math.floor(formData.points * 0.02)}
                      onChange={(e) => setBuyerRewardPoints(parseInt(e.target.value) || 0)}
                      disabled={!useManualDistribution}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                        useManualDistribution ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {!useManualDistribution && (
                    <p className="text-xs text-indigo-600 mt-1">
                      Auto-calculated: {formData.points} × 2% = {Math.floor(formData.points * 0.02)} points
                    </p>
                  )}
                </div>

                {/* Upline Commission Points */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Upline Commission per Level (Points) - Applied to all 19 levels
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-yellow-500 font-bold text-lg">★</span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={useManualDistribution ? uplineCommissionPoints : Math.floor(formData.points * 0.02)}
                      onChange={(e) => setUplineCommissionPoints(parseInt(e.target.value) || 0)}
                      disabled={!useManualDistribution}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                        useManualDistribution ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {useManualDistribution ? (
                    <p className="text-xs text-gray-600 mt-1">
                      These points will be distributed to each of the 19 upline levels
                    </p>
                  ) : (
                    <p className="text-xs text-indigo-600 mt-1">
                      Auto-calculated: {formData.points} × 2% = {Math.floor(formData.points * 0.02)} points per level
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h5 className="text-sm font-semibold mb-2">Points Distribution Summary</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buyer Reward:</span>
                      <span className="font-semibold text-yellow-600">{calculateTotals().buyerRewardPoints} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Upline Commission (19 levels × {useManualDistribution ? uplineCommissionPoints : Math.floor(formData.points * 0.02)}):
                      </span>
                      <span className="font-semibold text-yellow-600">{calculateTotals().totalCommissionPoints} pts</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600">Total Points Distribution:</span>
                      <span className="font-semibold text-indigo-600">{calculateTotals().totalDistributionPoints} pts</span>
                    </div>
                    {!useManualDistribution && (
                      <div className="flex justify-between text-xs text-gray-500 pt-1">
                        <span>Percentage of total rewards:</span>
                        <span>{formData.points > 0 ? ((calculateTotals().totalDistributionPoints / formData.points) * 100).toFixed(1) : 0}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${formData.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <div>
                      <label htmlFor="isActive" className="text-sm font-semibold text-gray-800 cursor-pointer">
                        Product Status
                      </label>
                      <p className="text-xs text-gray-600">
                        {formData.isActive ? 'Product is active and visible to customers' : 'Product is inactive and hidden from customers'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {product ? 'Update Product' : 'Create Product'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Purchase for User Component
function PurchaseForUserTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/search-users?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${apiClient.getAuthToken()}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedUser || !selectedProduct) {
      setErrorMessage('Please select both user and product');
      return;
    }

    if (quantity < 1) {
      setErrorMessage('Quantity must be at least 1');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/purchase-for-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.getAuthToken()}`,
        },
        body: JSON.stringify({
          userId: selectedUser._id!,
          productId: selectedProduct._id,
          quantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Order created successfully for ${selectedUser.name}! Points distributed.`);
        // Reset form
        setSelectedUser(null);
        setSelectedProduct(null);
        setQuantity(1);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setErrorMessage(data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setErrorMessage('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0;
  const totalPoints = selectedProduct ? selectedProduct.points * quantity : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Product for User</h2>
        <p className="text-gray-600">Search for a user and create an auto-approved order on their behalf</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: User Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Select User</h3>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                placeholder="Search by name, email, mobile, or User ID..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={searchUsers}
                disabled={searching}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Selected User */}
          {selectedUser && (
            <div className="mb-4 p-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">ID: {selectedUser.uniqueUserId}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email || selectedUser.mobileNumber}</p>
                  <p className="text-sm text-indigo-600 font-medium">Points: {selectedUser.totalPoints}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {searchResults.map((user) => (
                <div
                  key={user._id!}
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchResults([]);
                  }}
                  className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">ID: {user.uniqueUserId}</p>
                  <p className="text-sm text-gray-600">{user.email || user.mobileNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-indigo-600 font-medium">{user.totalPoints} pts</span>
                    {user.isActive ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Select Product</h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {products.filter(p => p.isActive).map((product) => (
              <div
                key={product._id}
                onClick={() => setSelectedProduct(product)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedProduct?._id === product._id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {product.imageURL && (
                    <Image src={product.imageURL} alt={product.name} width={64} height={64} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">₹{product.price.toFixed(2)} • {product.points} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Summary & Purchase */}
      {selectedUser && selectedProduct && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Review & Purchase</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Price:</span>
                <span className="font-semibold text-gray-900">₹{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Points:</span>
                <span className="font-semibold text-indigo-600">{totalPoints} pts</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Order...' : 'Create & Approve Order'}
          </button>
        </div>
      )}
    </div>
  );
}