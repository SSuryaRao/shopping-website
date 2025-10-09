'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { ShoppingBag, User, LogOut, Settings, Star, ShoppingCart, Menu, X, Home, LayoutDashboard, Network } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close menus when clicking outside - more reliable version
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Close mobile menu if clicking outside and not on the hamburger button
      if (showMobileMenu &&
          !target.closest('.mobile-menu-container') &&
          !target.closest('.hamburger-button')) {
        setShowMobileMenu(false);
      }

      // Close user menu if clicking outside of it
      if (showUserMenu && !target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    // Use a slight delay to avoid conflicts with click handlers
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu, showUserMenu]);

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      setShowMobileMenu(false);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Simple and reliable toggle function
  const toggleMobileMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Hamburger clicked, current state:', showMobileMenu);

    // Use functional update to ensure we get the latest state
    setShowMobileMenu(prevState => {
      const newState = !prevState;
      console.log('Setting mobile menu to:', newState);
      return newState;
    });
  };

  // Additional safety: direct click handler without events
  const handleHamburgerClick = () => {
    setShowMobileMenu(prev => !prev);
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
                  Smart Shoppy
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
                  <Link href="/mlm" className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50">
                    <Network className="h-4 w-4" />
                    <span>MLM</span>
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
                      className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 hidden md:block max-w-20 truncate">
                        {user?.name || 'User'}
                      </span>
                    </button>

                    {/* Profile Dropdown Menu */}
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
                            href="/dashboard?tab=profile"
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">View Profile</span>
                          </Link>

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

                          <div className="border-t border-gray-100 mt-2 pt-2">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                            >
                              <LogOut className="h-4 w-4" />
                              <span className="text-sm">Sign Out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={toggleMobileMenu}
                    onTouchStart={handleHamburgerClick}
                    className="hamburger-button md:hidden p-3 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="button"
                    aria-label="Toggle mobile menu"
                    aria-expanded={showMobileMenu}
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
                    onClick={toggleMobileMenu}
                    onTouchStart={handleHamburgerClick}
                    className="hamburger-button md:hidden p-3 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="button"
                    aria-label="Toggle mobile menu"
                    aria-expanded={showMobileMenu}
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
          <div
            className="mobile-menu-container absolute top-16 left-0 right-0 bg-white shadow-2xl border-b border-gray-200 max-h-[calc(100vh-4rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {user ? (
              <>
                {/* Mobile user info */}
                <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900">{user?.name || 'User'}</p>
                      <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg mt-1">
                        <Star className="h-3 w-3" />
                        <span>{user?.totalPoints || 0} points</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile menu items */}
                <div className="py-4">
                  <Link
                    href="/"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors active:bg-indigo-100"
                    onClick={closeMobileMenu}
                  >
                    <div className="p-2 rounded-xl bg-indigo-100">
                      <Home className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Home</span>
                      <p className="text-sm text-gray-500">Browse products</p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors active:bg-indigo-100"
                    onClick={closeMobileMenu}
                  >
                    <div className="p-2 rounded-xl bg-blue-100">
                      <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Dashboard</span>
                      <p className="text-sm text-gray-500">View your stats & orders</p>
                    </div>
                  </Link>

                  <Link
                    href="/mlm"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors active:bg-indigo-100"
                    onClick={closeMobileMenu}
                  >
                    <div className="p-2 rounded-xl bg-indigo-100">
                      <Network className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">MLM Network</span>
                      <p className="text-sm text-gray-500">Referrals & commissions</p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard?tab=profile"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors active:bg-indigo-100"
                    onClick={closeMobileMenu}
                  >
                    <div className="p-2 rounded-xl bg-purple-100">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Profile</span>
                      <p className="text-sm text-gray-500">Manage your account</p>
                    </div>
                  </Link>

                  <Link
                    href="/cart"
                    className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors active:bg-indigo-100"
                    onClick={closeMobileMenu}
                  >
                    <div className="p-2 rounded-xl bg-green-100 relative">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      {getItemCount() > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {getItemCount()}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Shopping Cart</span>
                      <p className="text-sm text-gray-500">
                        {getItemCount() > 0 ? `${getItemCount()} items in cart` : 'Your cart is empty'}
                      </p>
                    </div>
                  </Link>

                  {user?.isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center space-x-4 px-6 py-4 hover:bg-green-50 transition-colors active:bg-green-100 border-t border-gray-200 mt-2 pt-6"
                      onClick={closeMobileMenu}
                    >
                      <div className="p-2 rounded-xl bg-green-100">
                        <Settings className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-bold text-green-800">Admin Panel</span>
                        <p className="text-sm text-green-600">Manage products & users</p>
                      </div>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-4 px-6 py-4 hover:bg-red-50 text-red-600 transition-colors active:bg-red-100 border-t border-gray-200 mt-4 pt-6"
                  >
                    <div className="p-2 rounded-xl bg-red-100">
                      <LogOut className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-red-600">Sign Out</span>
                      <p className="text-sm text-red-500">Logout from your account</p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-6">
                <Link
                  href="/"
                  className="flex items-center space-x-4 px-6 py-4 hover:bg-indigo-50 transition-colors active:bg-indigo-100"
                  onClick={closeMobileMenu}
                >
                  <div className="p-2 rounded-xl bg-indigo-100">
                    <Home className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">Home</span>
                    <p className="text-sm text-gray-500">Browse our products</p>
                  </div>
                </Link>

                <div className="px-6 py-6 border-t border-gray-200 mt-4">
                  <div className="space-y-4">
                    <Link
                      href="/login"
                      className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-center shadow-lg hover:shadow-xl transition-all transform active:scale-95"
                      onClick={closeMobileMenu}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="block w-full border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-2xl font-bold text-center hover:bg-indigo-50 transition-all active:bg-indigo-100"
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