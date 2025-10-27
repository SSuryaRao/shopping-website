'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Product, CommissionLevel } from '@/types';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export default function ProductCommissionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [commissionStructure, setCommissionStructure] = useState<CommissionLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProductCommission = useCallback(async () => {
    try {
      setLoading(true);
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/admin/product/${productId}/commission`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setProduct(data.data);
        setCommissionStructure(data.data.commissionStructure || []);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch product commission');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.push('/unauthorized');
      return;
    }

    fetchProductCommission();
  }, [user, router, fetchProductCommission]);

  const addLevel = () => {
    const nextLevel = commissionStructure.length + 1;
    if (nextLevel > 20) {
      setError('Maximum 20 levels allowed');
      return;
    }

    setCommissionStructure([...commissionStructure, { level: nextLevel, points: 0 }]);
  };

  const removeLevel = (index: number) => {
    const newStructure = commissionStructure.filter((_, i) => i !== index);
    // Re-index levels
    const reindexed = newStructure.map((item, i) => ({ ...item, level: i + 1 }));
    setCommissionStructure(reindexed);
  };

  const updatePoints = (index: number, points: number) => {
    const newStructure = [...commissionStructure];
    newStructure[index].points = Math.max(0, points);
    setCommissionStructure(newStructure);
  };

  const calculateTotals = () => {
    if (!product) return { totalCommissionPoints: 0 };

    const totalCommissionPoints = commissionStructure.reduce((sum, level) => sum + level.points, 0);

    return { totalCommissionPoints };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mlm/admin/product/${productId}/commission`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commissionStructure }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Commission structure saved successfully');
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save commission structure');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const { totalCommissionPoints } = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Product not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">MLM Points Distribution</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Product:</p>
              <p className="font-semibold">{product.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Price:</p>
              <p className="font-semibold">₹{product.price}</p>
            </div>
            <div>
              <p className="text-gray-600">Cost:</p>
              <p className="font-semibold">₹{product.cost}</p>
            </div>
            <div>
              <p className="text-gray-600">Product Points:</p>
              <p className="font-semibold text-yellow-600">{product.points} pts</p>
            </div>
          </div>
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

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Commission Levels</h2>
            <button
              onClick={addLevel}
              disabled={commissionStructure.length >= 20}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Level
            </button>
          </div>

          <div className="space-y-3">
            {commissionStructure.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No commission levels configured. Click &quot;Add Level&quot; to start.</p>
            ) : (
              commissionStructure.map((level, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0 w-20">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                    <input
                      type="number"
                      value={level.level}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Points</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-500 font-bold">★</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={level.points}
                        onChange={(e) => updatePoints(index, parseInt(e.target.value) || 0)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeLevel(index)}
                    className="flex-shrink-0 mt-6 p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Points Distribution Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Commission Points:</span>
              <span className="font-semibold text-yellow-600">{totalCommissionPoints} pts</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Points Distribution'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
