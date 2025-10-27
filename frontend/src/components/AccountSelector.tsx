'use client';

import { useState } from 'react';
import { AccountOption } from '@/types';
import { User, ChevronRight, Star, Shield } from 'lucide-react';

interface AccountSelectorProps {
  accounts: AccountOption[];
  onSelect: (uniqueUserId: string) => Promise<void>;
  onBack: () => void;
}

export default function AccountSelector({ accounts, onSelect, onBack }: AccountSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = async (uniqueUserId: string) => {
    setLoading(true);
    setSelectedId(uniqueUserId);
    try {
      await onSelect(uniqueUserId);
    } catch (error) {
      console.error('Account selection error:', error);
      setLoading(false);
      setSelectedId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'shopkeeper':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
            <h2 className="text-2xl font-bold">Select Your Account</h2>
            <p className="text-indigo-100 mt-1">
              Multiple accounts found ({accounts.length}). Select using your User ID.
            </p>
          </div>

          {/* Account List */}
          <div className="p-6 space-y-3">
            {accounts.map((account) => (
              <button
                key={account.uniqueUserId}
                onClick={() => handleSelect(account.uniqueUserId)}
                disabled={loading}
                className={`
                  w-full text-left p-5 rounded-xl border-2 transition-all
                  ${
                    selectedId === account.uniqueUserId
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                        <User className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="flex-1">
                      {/* Primary: User ID */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-indigo-600">
                          {account.uniqueUserId}
                        </h3>
                        {account.isAdmin && (
                          <Shield className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>

                      {/* Secondary: Display Name and Name */}
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                        <span className="font-medium">{account.displayName}</span>
                        {account.displayName !== account.name && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{account.name}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {/* Role Badge */}
                        <span
                          className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${getRoleBadgeColor(account.role)}
                          `}
                        >
                          {account.role}
                        </span>

                        {/* Points */}
                        <div className="flex items-center text-xs text-yellow-600 font-medium">
                          <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                          {account.totalPoints} pts
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0 ml-4">
                    {loading && selectedId === account.uniqueUserId ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onBack}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>About User IDs:</strong> Each account is identified by a unique User ID (e.g., USR123456).
          </p>
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Remember your User ID for direct login! Each account has separate MLM position, points, and settings.
          </p>
        </div>
      </div>
    </div>
  );
}
