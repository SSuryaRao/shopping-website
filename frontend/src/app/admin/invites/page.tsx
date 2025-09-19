'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { InviteToken, ShopkeeperRequest } from '@/types';
import { Plus, Clock, CheckCircle, XCircle, Copy, Eye, EyeOff, Calendar, User } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function InvitesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'tokens' | 'requests'>('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate token form
  const [generateForm, setGenerateForm] = useState({
    expiresInHours: 72,
    note: '',
  });
  const [generatedToken, setGeneratedToken] = useState<{ token: string; tokenData: InviteToken } | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Tokens and requests
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [requests, setRequests] = useState<ShopkeeperRequest[]>([]);
  // const [selectedRequest, setSelectedRequest] = useState<ShopkeeperRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadTokens();
      loadRequests();
    }
  }, [user]);

  const loadTokens = async () => {
    try {
      const tokensData = await apiClient.getInviteTokens();
      setTokens(tokensData);
    } catch {
      setError('Failed to load invite tokens');
    }
  };

  const loadRequests = async () => {
    try {
      const requestsData = await apiClient.getShopkeeperRequests();
      setRequests(requestsData);
    } catch {
      setError('Failed to load shopkeeper requests');
    }
  };

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiClient.generateInviteToken(generateForm);
      setGeneratedToken({ token: result.token, tokenData: result });
      setSuccess('Invite token generated successfully!');
      setGenerateForm({ expiresInHours: 72, note: '' });
      await loadTokens();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to generate invite token');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await apiClient.approveShopkeeperRequest(requestId);
      setSuccess('Shopkeeper request approved successfully!');
      await loadRequests();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string, reason?: string) => {
    setActionLoading(requestId);
    try {
      await apiClient.rejectShopkeeperRequest(requestId, reason);
      setSuccess('Shopkeeper request rejected');
      await loadRequests();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  if (!user?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need super admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invite & Approval Management</h1>
          <p className="mt-2 text-gray-600">
            Generate invite tokens and manage shopkeeper requests.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'generate', label: 'Generate Token', icon: Plus },
              { id: 'tokens', label: 'Invite Tokens', icon: Eye },
              { id: 'requests', label: 'Pending Requests', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'generate' | 'tokens' | 'requests')}
                className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
                {tab.id === 'requests' && requests.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Generate Token Tab */}
        {activeTab === 'generate' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Invite Token</h2>

            <form onSubmit={handleGenerateToken} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires In (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={generateForm.expiresInHours}
                    onChange={(e) => setGenerateForm({ ...generateForm, expiresInHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum 168 hours (7 days)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={generateForm.note}
                    onChange={(e) => setGenerateForm({ ...generateForm, note: e.target.value })}
                    placeholder="e.g., For John Doe, Marketing team"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Token'}
              </button>
            </form>

            {/* Generated Token Display */}
            {generatedToken && (
              <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-yellow-800">Token Generated Successfully</h3>
                    <p className="text-yellow-700">Share this token securely. It will not be shown again.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 mb-2">
                      Invite Token
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={generatedToken.token}
                          readOnly
                          className="w-full px-3 py-2 bg-white border border-yellow-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2 top-2 text-yellow-600 hover:text-yellow-800"
                        >
                          {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedToken.token)}
                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-yellow-800">Expires:</span>
                      <span className="ml-2 text-yellow-700">
                        {formatDate(generatedToken.tokenData.expiresAt)}
                      </span>
                    </div>
                    {generatedToken.tokenData.note && (
                      <div>
                        <span className="font-medium text-yellow-800">Note:</span>
                        <span className="ml-2 text-yellow-700">{generatedToken.tokenData.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Invite Tokens</h2>
              <p className="mt-1 text-sm text-gray-600">All generated invite tokens and their status.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Used By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tokens.map((token) => (
                    <tr key={token.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            token.used
                              ? 'bg-green-100 text-green-800'
                              : token.isExpired
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {token.used ? 'Used' : token.isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(token.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(token.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {token.usedBy ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            {token.usedBy.name || token.usedBy.email}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {token.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tokens.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <Eye className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">No invite tokens</h3>
                  <p className="text-sm text-gray-500">Generate your first invite token to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pending Shopkeeper Requests</h2>
              <p className="mt-1 text-sm text-gray-600">Review and approve or reject shopkeeper applications.</p>
            </div>

            <div className="divide-y divide-gray-200">
              {requests.map((request) => (
                <div key={request._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">{request.name}</h3>
                        <span className="ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{request.email}</p>
                      <p className="mt-2 text-sm text-gray-500">
                        Applied on {formatDate(request.createdAt)}
                      </p>
                      {request.message && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{request.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex space-x-3">
                      <button
                        onClick={() => handleApproveRequest(request._id)}
                        disabled={actionLoading === request._id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request._id)}
                        disabled={actionLoading === request._id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <Clock className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">No pending requests</h3>
                  <p className="text-sm text-gray-500">All shopkeeper requests have been processed.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}