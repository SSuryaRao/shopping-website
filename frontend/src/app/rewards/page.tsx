'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { RewardItem, RewardRedemption } from '@/types';
import { Gift, Star, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function RewardsPage() {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [itemsData, redemptionsData] = await Promise.all([
        apiClient.getRewardItems(),
        apiClient.getMyRedemptions(),
      ]);
      setItems(itemsData || []);
      setRedemptions(redemptionsData || []);
    } catch (error) {
      console.error('Error loading rewards:', error);
      setMessage({ type: 'error', text: 'Failed to load rewards. Please refresh the page.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, fetchData]);

  const handleRedeem = async (item: RewardItem) => {
    if (!confirm(`Redeem ${item.pointsRequired} points for "${item.name}"?`)) return;

    setRedeemingId(item._id);
    setMessage(null);
    try {
      await apiClient.redeemReward(item._id);
      setMessage({ type: 'success', text: `Requested "${item.name}". The admin will review it soon.` });
      await Promise.all([fetchData(), refreshUser()]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to redeem reward' });
    } finally {
      setRedeemingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
        <p className="text-gray-600 mb-6">You need to be signed in to view rewards.</p>
        <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading Rewards...</div>
      </div>
    );
  }

  const points = user.totalPoints || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Rewards</h1>

        {/* Points balance */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg shadow-lg p-5 sm:p-6 mb-6 text-white">
          <p className="text-sm opacity-90">Your points</p>
          <div className="flex items-center gap-2 mt-1">
            <Star className="h-7 w-7" />
            <span className="text-3xl sm:text-4xl font-bold">{points}</span>
          </div>
          <p className="text-sm opacity-90 mt-2">
            Earn points by shopping and through <Link href="/refer-earn" className="underline font-medium">Refer &amp; Earn</Link>
          </p>
        </div>

        {!user.isActive && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm px-4 py-3 rounded-lg">
            Your account must be activated by the admin before you can redeem rewards.
          </div>
        )}

        {message && (
          <div className={`mb-6 text-sm px-4 py-3 rounded-lg border ${
            message.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Reward items */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center mb-8">
            <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No rewards available yet</p>
            <p className="text-gray-400 text-sm">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {items.map((item) => {
              const outOfStock = item.stock < 1;
              const notEnough = points < item.pointsRequired;
              const disabled = outOfStock || notEnough || !user.isActive || redeemingId !== null;

              return (
                <div key={item._id} className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
                  <div className="relative w-full aspect-square bg-gray-100">
                    <Image src={item.imageURL} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="flex items-center text-yellow-600 font-bold">
                        <Star className="h-4 w-4 mr-1" />
                        {item.pointsRequired} pts
                      </span>
                      <span className={`text-xs ${outOfStock ? 'text-red-600' : 'text-gray-500'}`}>
                        {outOfStock ? 'Out of stock' : `${item.stock} left`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={disabled}
                      className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {redeemingId === item._id
                        ? 'Redeeming...'
                        : outOfStock
                        ? 'Out of stock'
                        : notEnough
                        ? `Need ${item.pointsRequired - points} more pts`
                        : 'Redeem'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Redemption history */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Redemptions</h2>
          {redemptions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">You haven&apos;t redeemed any rewards yet.</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {redemptions.map((r) => (
                <div key={r._id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.rewardName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()} · {r.pointsSpent} pts
                    </p>
                    {r.status === 'rejected' && r.adminNotes && (
                      <p className="text-xs text-red-600 mt-1">{r.adminNotes} (points returned)</p>
                    )}
                  </div>
                  <RedemptionStatus status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RedemptionStatus({ status }: { status: RewardRedemption['status'] }) {
  if (status === 'approved') {
    return (
      <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">
        <CheckCircle className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 whitespace-nowrap">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
