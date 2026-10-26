'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import { RewardItem, RewardRedemption } from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Plus, Edit, Trash2, Upload, Gift, ArrowLeft, Star, X } from 'lucide-react';

type Tab = 'items' | 'pending' | 'history';

export default function AdminRewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [items, setItems] = useState<RewardItem[]>([]);
  const [pending, setPending] = useState<RewardRedemption[]>([]);
  const [history, setHistory] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [itemsData, pendingData, allData] = await Promise.all([
        apiClient.getAdminRewardItems(),
        apiClient.getRedemptions('pending'),
        apiClient.getRedemptions(),
      ]);
      setItems(itemsData || []);
      setPending(pendingData || []);
      setHistory((allData || []).filter((r: RewardRedemption) => r.status !== 'pending'));
    } catch (error) {
      console.error('Error loading rewards admin data:', error);
      alert('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      fetchData();
    }
  }, [user, authLoading, fetchData]);

  const handleDeactivate = async (item: RewardItem) => {
    if (!confirm(`Hide "${item.name}" from the Rewards tab?`)) return;
    try {
      await apiClient.deactivateRewardItem(item._id);
      await fetchData();
    } catch (error) {
      console.error('Error deactivating reward item:', error);
      alert('Failed to deactivate reward item');
    }
  };

  const handleApprove = async (redemption: RewardRedemption) => {
    const notes = prompt('Enter notes (optional), e.g. "Handed over at shop":');
    if (notes === null) return;
    try {
      await apiClient.approveRedemption(redemption._id, notes || undefined);
      await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve redemption');
    }
  };

  const handleReject = async (redemption: RewardRedemption) => {
    const reason = prompt('Enter rejection reason (points will be returned to the user):');
    if (!reason) return;
    try {
      await apiClient.rejectRedemption(redemption._id, reason);
      await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reject redemption');
    }
  };

  if (authLoading || (user?.isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading rewards...</div>
      </div>
    );
  }

  const tabClass = (tab: Tab) =>
    `flex items-center px-5 py-3 rounded-lg font-medium transition-all ${
      activeTab === tab
        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
    }`;

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rewards</h1>
            <p className="text-gray-600 mt-1">Products users can redeem with their points</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Reward Product
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <div className="inline-flex gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-2 min-w-max">
            <button onClick={() => setActiveTab('items')} className={tabClass('items')}>
              <Gift className="h-5 w-5 mr-2" />
              Reward Products
            </button>
            <button onClick={() => setActiveTab('pending')} className={tabClass('pending')}>
              Pending Redemptions
              {pending.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{pending.length}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
              History
            </button>
          </div>
        </div>

        {/* Reward products */}
        {activeTab === 'items' && (
          items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No reward products yet</p>
              <p className="text-gray-400 text-sm">Click &quot;Add Reward Product&quot; to create one</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item._id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${item.isActive ? '' : 'opacity-60'}`}>
                  <div className="relative w-full aspect-square bg-gray-100">
                    <Image src={item.imageURL} alt={item.name} fill className="object-cover" />
                    {!item.isActive && (
                      <span className="absolute top-2 left-2 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">Hidden</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="flex items-center text-yellow-600 font-bold">
                        <Star className="h-4 w-4 mr-1" />
                        {item.pointsRequired} pts
                      </span>
                      <span className="text-gray-600">Stock: {item.stock}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      {item.isActive && (
                        <button
                          onClick={() => handleDeactivate(item)}
                          className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                          aria-label="Hide reward"
                          title="Hide from Rewards tab"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Pending redemptions */}
        {activeTab === 'pending' && (
          <RedemptionList
            redemptions={pending}
            emptyText="No pending redemptions"
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* History */}
        {activeTab === 'history' && (
          <RedemptionList redemptions={history} emptyText="No processed redemptions yet" />
        )}

        {(showAddModal || editingItem) && (
          <RewardItemModal
            item={editingItem}
            onClose={() => {
              setShowAddModal(false);
              setEditingItem(null);
            }}
            onSaved={async () => {
              setShowAddModal(false);
              setEditingItem(null);
              await fetchData();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

interface RedemptionListProps {
  redemptions: RewardRedemption[];
  emptyText: string;
  onApprove?: (r: RewardRedemption) => void;
  onReject?: (r: RewardRedemption) => void;
}

function RedemptionList({ redemptions, emptyText, onApprove, onReject }: RedemptionListProps) {
  if (redemptions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-200">
      {redemptions.map((r) => {
        const customer = typeof r.userId === 'object' ? r.userId : null;
        return (
          <div key={r._id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{r.rewardName}</p>
              <p className="text-sm text-gray-600">
                {customer ? `${customer.name} (${customer.uniqueUserId})` : 'Unknown user'}
                {customer?.mobileNumber ? ` · ${customer.mobileNumber}` : ''}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleString()} · {r.pointsSpent} pts
              </p>
              {r.adminNotes && <p className="text-xs text-gray-600 mt-1">Note: {r.adminNotes}</p>}
            </div>
            {onApprove && onReject ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(r)}
                  className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(r)}
                  className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm"
                >
                  Reject
                </button>
              </div>
            ) : (
              <span className={`self-start sm:self-center px-3 py-1 text-xs font-semibold rounded-full ${
                r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {r.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface RewardItemModalProps {
  item: RewardItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function RewardItemModal({ item, onClose, onSaved }: RewardItemModalProps) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [pointsRequired, setPointsRequired] = useState(item?.pointsRequired?.toString() || '');
  const [stock, setStock] = useState(item?.stock?.toString() || '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageURL || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !pointsRequired || stock === '') {
      setError('Name, points and stock are required');
      return;
    }
    if (parseInt(pointsRequired) < 1) {
      setError('Points must be at least 1');
      return;
    }
    if (!item && !imageFile) {
      setError('Please choose an image');
      return;
    }

    const data = new FormData();
    data.append('name', name.trim());
    data.append('description', description.trim());
    data.append('pointsRequired', pointsRequired);
    data.append('stock', stock);
    data.append('isActive', String(isActive));
    if (imageFile) data.append('image', imageFile);

    setSaving(true);
    try {
      if (item) {
        await apiClient.updateRewardItem(item._id, data);
      } else {
        await apiClient.createRewardItem(data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reward product');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{item ? 'Edit Reward Product' : 'Add Reward Product'}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-indigo-400">
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover rounded" unoptimized />
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-600">Choose image</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) setImagePreview(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points required</label>
              <input type="number" min="1" value={pointsRequired} onChange={(e) => setPointsRequired(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
            Show in Rewards tab
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
