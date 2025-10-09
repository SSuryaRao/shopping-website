'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Commission, CommissionSummary, DownlineUser, MLMTreeNode } from '@/types';
import { Copy, Users, DollarSign, TrendingUp, Share2, CheckCircle, Network } from 'lucide-react';
import MLMTree from '@/components/MLMTree';

export default function MLMDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [downline, setDownline] = useState<{ left: DownlineUser | null; right: DownlineUser | null }>({
    left: null,
    right: null,
  });
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasReferrer, setHasReferrer] = useState(false);
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [joiningTree, setJoiningTree] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [treeData, setTreeData] = useState<MLMTreeNode | null>(null);
  const [showTree, setShowTree] = useState(false);

  const fetchMLMData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('MLM Page - User object:', user);
      console.log('MLM Page - User referralCode:', user?.referralCode);

      // Force refresh token to get latest user data
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken(true);

      // If user doesn't have referralCode, fetch fresh profile
      if (!user?.referralCode) {
        const { apiClient } = await import('@/lib/api');
        apiClient.setAuthToken(token!);
        const freshProfile = await apiClient.getUserProfile();
        console.log('Fresh profile fetched:', freshProfile);
        if (freshProfile.referralCode) {
          setReferralCode(freshProfile.referralCode);
          setReferralLink(`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/signup?ref=${freshProfile.referralCode}`);
        }
      }

      // Fetch summary
      const summaryRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const summaryData = await summaryRes.json();
      if (summaryData.success) setSummary(summaryData.data);

      // Fetch commissions
      const commissionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/commissions?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const commissionsData = await commissionsRes.json();
      if (commissionsData.success) setCommissions(commissionsData.data.commissions);

      // Fetch downline
      const downlineRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/downline/direct`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const downlineData = await downlineRes.json();
      if (downlineData.success) setDownline(downlineData.data);

      // Get user's referral code (should already exist from registration)
      if (user?.referralCode) {
        setReferralCode(user.referralCode);
        setReferralLink(`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/signup?ref=${user.referralCode}`);
      }

      // Check if user has a referrer
      setHasReferrer(!!user?.referredBy);

      // Fetch tree structure
      const treeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/tree?maxDepth=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const treeResData = await treeRes.json();
      if (treeResData.success) {
        setTreeData(treeResData.data);
      }
    } catch (err) {
      console.error('Error fetching MLM data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchMLMData();
  }, [user, router, fetchMLMData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinTree = async () => {
    if (!inputReferralCode.trim()) {
      setJoinError('Please enter a referral code');
      return;
    }

    try {
      setJoiningTree(true);
      setJoinError('');
      setJoinSuccess('');

      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/join-tree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode: inputReferralCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (data.success) {
        setJoinSuccess(data.message);
        setHasReferrer(true);
        setInputReferralCode('');
        // Refresh MLM data
        await fetchMLMData();
      } else {
        setJoinError(data.message);
      }
    } catch (err) {
      setJoinError('Failed to join MLM tree. Please try again.');
      console.error('Error joining tree:', err);
    } finally {
      setJoiningTree(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading MLM Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">MLM Dashboard</h1>

        {/* Referral Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center mb-4">
            <Share2 className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-semibold">Your Referral Link</h2>
          </div>
          <p className="text-sm mb-4 opacity-90">Share this link to invite others and earn commissions on their purchases</p>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-3">
            <p className="text-sm font-mono break-all text-black">{referralLink || 'Loading your referral link...'}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => copyToClipboard(referralLink)}
              className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium"
            >
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => copyToClipboard(referralCode)}
              className="flex items-center px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 font-medium"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code: {referralCode}
            </button>
          </div>
        </div>

        {/* Join MLM Tree Section - Only show if user doesn't have a referrer */}
        {!hasReferrer && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Join the MLM Network</h3>
                <p className="text-sm text-yellow-800 mb-4">
                  You haven&apos;t joined anyone&apos;s network yet. Enter a referral code from someone who invited you to join their downline and start earning commissions.
                </p>

                {joinSuccess && (
                  <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    {joinSuccess}
                  </div>
                )}

                {joinError && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {joinError}
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputReferralCode}
                    onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code (e.g., ABC12345)"
                    className="flex-1 px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent uppercase"
                    maxLength={8}
                    disabled={joiningTree}
                  />
                  <button
                    onClick={handleJoinTree}
                    disabled={joiningTree || !inputReferralCode.trim()}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
                  >
                    {joiningTree ? 'Joining...' : 'Join Network'}
                  </button>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  ⚠️ Note: Once you join a network, you cannot change it later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">₹{summary?.totalEarnings.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Withdrawal</p>
                <p className="text-3xl font-bold text-gray-900">₹{summary?.pendingWithdrawal.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Withdrawn</p>
                <p className="text-3xl font-bold text-gray-900">₹{summary?.withdrawnAmount.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Network Tree Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Network className="w-6 h-6 mr-2 text-gray-700" />
              <h2 className="text-xl font-semibold text-black">Your MLM Network</h2>
            </div>
            {treeData && (
              <button
                onClick={() => setShowTree(!showTree)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center"
              >
                <Network className="w-4 h-4 mr-2" />
                {showTree ? 'Hide Tree View' : 'Show Tree View'}
              </button>
            )}
          </div>

          {!showTree ? (
            // Simple View - Direct Downline
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Position */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Left Position</h3>
                {downline.left ? (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{downline.left.name}</p>
                    <p className="text-sm text-gray-600">{downline.left.email}</p>
                    <p className="text-sm text-green-600 mt-2">Earnings: ₹{downline.left.totalEarnings.toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Position Available</p>
                  </div>
                )}
              </div>

              {/* Right Position */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Right Position</h3>
                {downline.right ? (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{downline.right.name}</p>
                    <p className="text-sm text-gray-600">{downline.right.email}</p>
                    <p className="text-sm text-green-600 mt-2">Earnings: ₹{downline.right.totalEarnings.toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Position Available</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Tree View
            treeData ? (
              <MLMTree treeData={treeData} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Loading tree structure...</p>
              </div>
            )
          )}
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Recent Commissions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No commissions yet. Start referring to earn!
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <tr key={commission._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.fromUserId.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.productId.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Level {commission.level}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₹{commission.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            commission.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : commission.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {commission.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
