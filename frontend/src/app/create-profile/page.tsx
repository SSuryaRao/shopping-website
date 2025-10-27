'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context-new';
import { User, ShoppingCart, UserCog, Key, Copy, CheckCircle, AlertCircle } from 'lucide-react';

function CreateProfileForm() {
  const { createProfile, firebaseUser, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    name: '',
    profileName: '',
    role: 'customer' as 'customer' | 'shopkeeper',
    inviteToken: '',
    referralCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdUserId, setCreatedUserId] = useState('');
  const [copied, setCopied] = useState(false);

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData((prev) => ({ ...prev, referralCode: refCode.toUpperCase() }));
    }
  }, [searchParams]);

  // Pre-fill name from Firebase
  useEffect(() => {
    if (firebaseUser && !formData.name) {
      const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '';
      setFormData((prev) => ({
        ...prev,
        name: displayName,
        profileName: prev.profileName || 'Main Account',
      }));
    }
  }, [firebaseUser, formData.name]);

  // Redirect if already have profile
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!firebaseUser && !authLoading) {
      router.push('/login-new');
    }
  }, [firebaseUser, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.profileName.trim()) {
      setError('Profile name is required');
      setLoading(false);
      return;
    }

    try {
      await createProfile({
        name: formData.name,
        profileName: formData.profileName,
        role: formData.role,
        inviteToken: formData.inviteToken || undefined,
        referralCode: formData.referralCode || undefined,
      });

      // Get the created user ID (will be set by auth context)
      // For now, redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(createdUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Set up your first profile to get started
          </p>
        </div>

        <div className="mt-8 bg-white shadow-lg rounded-xl p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Account Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    formData.role === 'customer'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setFormData({ ...formData, role: 'customer', inviteToken: '' })}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={formData.role === 'customer'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <ShoppingCart className="h-5 w-5 text-indigo-600 mr-2" />
                        <label className="text-sm font-medium text-gray-900">Customer</label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Shop and earn points
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    formData.role === 'shopkeeper'
                      ? 'border-indigo-500 bg-indigo-50'
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
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <UserCog className="h-5 w-5 text-indigo-600 mr-2" />
                        <label className="text-sm font-medium text-gray-900">Shopkeeper</label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Manage products
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Profile Name Input */}
            <div>
              <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-2">
                Profile Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="profileName"
                  name="profileName"
                  type="text"
                  required
                  value={formData.profileName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Main Account"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This helps you identify this profile if you create multiple accounts
              </p>
            </div>

            {/* Referral Code - Only for customers */}
            {formData.role === 'customer' && (
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
                    className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
                    placeholder="ABC12345"
                    maxLength={8}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter a referral code to join someone&apos;s MLM network
                </p>
              </div>
            )}

            {/* Invite Token - Only for shopkeepers */}
            {formData.role === 'shopkeeper' && (
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
                    className="appearance-none relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter invite token"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Have an invite token? Get immediate shopkeeper access. Otherwise, your request will be reviewed.
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

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating profile...' : 'Create Profile'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              You can create up to 5 profiles with this account. Each profile has its own points and MLM position.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <CreateProfileForm />
    </Suspense>
  );
}
