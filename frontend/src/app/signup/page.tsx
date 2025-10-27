'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { Mail, Lock, User, Eye, EyeOff, UserCog, ShoppingCart, Key, MessageSquare, Smartphone, Copy, CheckCircle } from 'lucide-react';

type RegistrationType = 'mobile' | 'email' | 'google';

function SignUpForm() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registrationType, setRegistrationType] = useState<RegistrationType>('mobile');
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer' as 'customer' | 'shopkeeper',
    inviteToken: '',
    message: '',
    referralCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uniqueUserId, setUniqueUserId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [existingAccountsCount, setExistingAccountsCount] = useState<number>(0);

  // Check for referral code in URL on component mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData((prev) => ({ ...prev, referralCode: refCode.toUpperCase() }));
    }
  }, [searchParams]);

  // Check existing accounts when mobile/email changes
  useEffect(() => {
    const checkExistingAccounts = async () => {
      // Only check for mobile or email registration types
      if (registrationType === 'google') {
        setExistingAccountsCount(0);
        return;
      }

      const identifier = registrationType === 'mobile' ? formData.mobile : formData.email;
      if (!identifier || identifier.length < 5) {
        setExistingAccountsCount(0);
        return;
      }

      try {
        const result = await apiClient.checkAccounts(identifier, registrationType);
        setExistingAccountsCount(result.accountCount || 0);
      } catch {
        // Ignore errors - user might not exist
        setExistingAccountsCount(0);
      }
    };

    const timeoutId = setTimeout(checkExistingAccounts, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.mobile, formData.email, registrationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Use new registration API for mobile/email
      if (registrationType === 'mobile' || registrationType === 'email') {
        const result = await apiClient.registerNew({
          registrationType,
          mobileNumber: registrationType === 'mobile' ? formData.mobile : undefined,
          email: registrationType === 'email' ? formData.email : undefined,
          password: formData.password,
          name: formData.name,
          displayName: formData.displayName || formData.name,
          role: formData.role,
          referralCode: formData.referralCode || undefined,
        });

        console.log('Registration result:', result);

        // Show success modal with unique ID
        setUniqueUserId(result.user.uniqueUserId);
        setShowSuccessModal(true);
      } else {
        // Google registration (existing flow)
        const result = await signUp(formData.email, formData.password, {
          role: formData.role,
          inviteToken: formData.inviteToken || undefined,
          referralCode: formData.referralCode || undefined,
          profile: {
            name: formData.name,
            message: formData.message || undefined,
          },
        });

        if (result.status === 'approved') {
          setSuccess(result.message + ' Redirecting...');
          setTimeout(() => {
            router.push(result.isAdmin ? '/admin' : '/dashboard');
          }, 2000);
        } else if (result.status === 'pending') {
          setSuccess(result.message + ' You can close this page or sign in to check your status.');
        }
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(uniqueUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleContinueToLogin = () => {
    router.push('/login');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Success Modal
  if (showSuccessModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 text-white text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Account Created!</h2>
            </div>

            <div className="px-8 py-6 space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Your account has been successfully created. Save your Unique User ID for quick login:
                </p>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Your Unique User ID
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-2xl font-bold text-indigo-600 bg-white px-4 py-3 rounded-lg border border-indigo-300">
                      {uniqueUserId}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="flex-shrink-0 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      Copied to clipboard!
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>Save this User ID!</strong> You&apos;ll need it to:
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 ml-2">
                  <li>Login directly using User ID + Password</li>
                  <li>Select this account if you have multiple accounts</li>
                  <li>Quick access without typing {registrationType === 'mobile' ? 'mobile number' : 'email'}</li>
                </ul>
              </div>

              {existingAccountsCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    You now have <strong>{existingAccountsCount + 1}</strong> account(s) linked to your {registrationType === 'mobile' ? 'mobile number' : 'email'}.
                  </p>
                </div>
              )}

              <button
                onClick={handleContinueToLogin}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-md"
              >
                Continue to Login
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join us and start earning points on every purchase
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Registration Type Selector */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setRegistrationType('mobile')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                registrationType === 'mobile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Smartphone className="w-5 h-5 mx-auto mb-1" />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType('email')}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                registrationType === 'email'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Mail className="w-5 h-5 mx-auto mb-1" />
              Email
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Account Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                    formData.role === 'customer'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setFormData({ ...formData, role: 'customer', inviteToken: '', message: '' })}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={formData.role === 'customer'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <ShoppingCart className="h-5 w-5 text-blue-600 mr-2" />
                        <label className="text-sm font-medium text-gray-900">Customer</label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Shop and earn points on purchases
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                    formData.role === 'shopkeeper'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setFormData({ ...formData, role: 'shopkeeper' })}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="shopkeeper"
                      checked={formData.role === 'shopkeeper'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <UserCog className="h-5 w-5 text-blue-600 mr-2" />
                        <label className="text-sm font-medium text-gray-900">Shopkeeper</label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Manage products and orders
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {existingAccountsCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> You already have {existingAccountsCount} account(s) with this {registrationType === 'mobile' ? 'mobile number' : 'email'}.
                </p>
              </div>
            )}

            {formData.referralCode && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Referral Code Applied:</strong> {formData.referralCode}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  You will join the network of the person who referred you!
                </p>
              </div>
            )}

            {/* Mobile or Email Input based on registration type */}
            {registrationType === 'mobile' ? (
              <div>
                <label htmlFor="mobile" className="sr-only">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Mobile Number"
                  />
                </div>
              </div>
            ) : (
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
                    className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="name" className="sr-only">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="sr-only">
                Account Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Account Display Name (optional)"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This name will help you identify this account if you create multiple accounts
              </p>
            </div>

            {/* Referral Code Input - Only show for customer accounts and if not already set from URL */}
            {formData.role === 'customer' && !searchParams.get('ref') && (
              <div>
                <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="referralCode"
                    name="referralCode"
                    type="text"
                    value={formData.referralCode}
                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                    className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm uppercase"
                    placeholder="Enter referral code (e.g., ABC12345)"
                    maxLength={8}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Have a referral code? Enter it to join someone&apos;s MLM network.
                </p>
              </div>
            )}

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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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

            {/* Shopkeeper-specific fields */}
            {formData.role === 'shopkeeper' && (
              <>
                <div>
                  <label htmlFor="inviteToken" className="block text-sm font-medium text-gray-700 mb-2">
                    Invite Token (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="inviteToken"
                      name="inviteToken"
                      type="text"
                      value={formData.inviteToken}
                      onChange={handleInputChange}
                      className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Enter invite token for immediate approval"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Have an invite token? Enter it for immediate shopkeeper access. Otherwise, your request will be reviewed.
                  </p>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Application Message (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      id="message"
                      name="message"
                      rows={3}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm resize-none"
                      placeholder="Tell us why you want to become a shopkeeper..."
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            {/* Google Sign-in - Only show on email tab */}
            {registrationType === 'email' && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                  </button>
                </div>
              </>
            )}

            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </span>
            </div>

            <div className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}