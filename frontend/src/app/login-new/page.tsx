'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context-new';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    user,
    loading: authLoading,
    profileOptions,
    needsProfileCreation,
    selectProfile,
    clearProfileOptions,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Only redirect if user is already logged in AND they're actually on the login-new page
  // This prevents redirects during hot reload when on other pages
  useEffect(() => {
    if (user && !authLoading && !profileOptions && !needsProfileCreation && pathname === '/login-new' && !hasRedirected.current) {
      console.log('Already logged in, redirecting from login page to dashboard');
      hasRedirected.current = true;
      router.replace('/dashboard');
    }
  }, [user, authLoading, profileOptions, needsProfileCreation, pathname, router]); // Proper dependencies

  // Redirect to profile creation if needed
  useEffect(() => {
    if (needsProfileCreation && !authLoading) {
      router.push('/create-profile');
    }
  }, [needsProfileCreation, authLoading, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmail(formData.email, formData.password);
      // Auth context will handle profile selection/creation
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      // Auth context will handle profile selection/creation
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = async (uniqueUserId: string) => {
    try {
      setLoading(true);
      await selectProfile(uniqueUserId);
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select profile';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Show profile selector if multiple profiles found
  if (profileOptions && profileOptions.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">Select Profile</h2>
              <p className="text-indigo-100 mt-1">
                You have {profileOptions.length} profile{profileOptions.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-6 space-y-3">
              {profileOptions.map((profile) => (
                <button
                  key={profile.uniqueUserId}
                  onClick={() => handleProfileSelect(profile.uniqueUserId)}
                  disabled={loading}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{profile.profileName}</h3>
                      <p className="text-sm text-gray-600">{profile.name} • {profile.uniqueUserId}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {profile.role}
                        </span>
                        <span className="text-xs text-gray-600">{profile.totalPoints} points</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="px-6 pb-4">
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              </div>
            )}

            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={clearProfileOptions}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-in */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-6" onSubmit={handleEmailSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup-new" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
