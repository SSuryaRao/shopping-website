'use client';

import { useAuth } from '@/lib/auth-context';
import { Clock, RefreshCw, Mail } from 'lucide-react';
import Link from 'next/link';

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Application Under Review
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your shopkeeper application is being reviewed by our team
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Mail className="h-6 w-6 text-yellow-600" />
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Thanks for your application!
            </h3>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Name:</strong> {user?.name}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Status:</strong> <span className="text-yellow-600 font-medium">Pending Review</span>
              </p>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>What happens next?</strong>
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside text-left space-y-1">
                <li>Our team will review your application</li>
                <li>We may contact you for additional information</li>
                <li>You&apos;ll receive an email notification when approved</li>
                <li>Typical review time is 1-3 business days</li>
              </ul>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRefresh}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </button>

              <button
                onClick={logout}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Questions about your application?{' '}
                <Link href="/contact" className="text-blue-600 hover:text-blue-500">
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}