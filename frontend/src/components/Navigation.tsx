'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { ShoppingBag, User, LogOut, Settings, Star, ShoppingCart, Menu, X, Home, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu') && !target.closest('.mobile-menu')) {
        setShowUserMenu(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
      setShowMobileMenu(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                  ShopPoints
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
              {user && (
                <>
                  <Link href="/dashboard" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50">
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Right side items */}
            <div className="flex items-center space-x-2">
              {/* Cart for logged-in users */}
              {user && (
                <Link
                  href="/cart"
                  className="relative p-3 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {getItemCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse">
                      {getItemCount()}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <>
                  {/* Points display - Hidden on mobile */}
                  <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-2xl border border-yellow-200">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-bold text-yellow-700">
                      {user?.totalPoints || 0}
                    </span>
                    <span className="text-xs text-yellow-600">pts</span>
                  </div>

                  {/* User menu */}
                  <div className="relative user-menu">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 hidden md:block max-w-20 truncate">
                        {user?.name || 'User'}
                      </span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user?.name || 'User'}</p>
                              <div className="flex items-center space-x-1 text-yellow-600">
                                <Star className="h-3 w-3" />
                                <span className="text-sm font-medium">{user?.totalPoints || 0} points</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-2">
                          <Link
                            href="/dashboard"
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <LayoutDashboard className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Dashboard</span>
                          </Link>

                          {user?.isAdmin && (
                            <Link
                              href="/admin"
                              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <Settings className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">Admin Panel</span>
                            </Link>
                          )}

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            <span className="text-sm">Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="md:hidden p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium text-sm shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    Sign In
                  </Link>
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="md:hidden p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={closeMobileMenu}>
          <div className="mobile-menu absolute top-16 left-0 right-0 bg-white shadow-2xl border-b border-gray-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {user && (
              <>
                {/* Mobile user info */}
                <div className="px-4 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{user?.name || 'User'}</p>
                      <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        <Star className="h-3 w-3" />
                        <span>{user?.totalPoints || 0} points</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile menu items */}
                <div className="py-2">
                  <Link
                    href="/"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Home className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-700">Home</span>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <LayoutDashboard className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-700">Dashboard</span>
                  </Link>

                  {user?.isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      <Settings className="h-5 w-5 text-gray-500" />
                      <span className="font-medium text-gray-700">Admin Panel</span>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-4 px-6 py-4 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </>
            )}

            {/* Mobile menu for non-authenticated users */}
            {!user && (
              <div className="py-4">
                <Link
                  href="/"
                  className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Home className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Home</span>
                </Link>

                <div className="px-6 py-4 border-t border-gray-200 mt-2">
                  <div className="space-y-3">
                    <Link
                      href="/login"
                      className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium text-center shadow-lg"
                      onClick={closeMobileMenu}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="block w-full border-2 border-indigo-600 text-indigo-600 px-6 py-3 rounded-xl font-medium text-center hover:bg-indigo-50"
                      onClick={closeMobileMenu}
                    >
                      Join Free
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}