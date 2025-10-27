'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context-new';
import { User, ChevronDown, Plus, Check, Star, Shield } from 'lucide-react';
import { ProfileOption } from '@/types';

export default function ProfileSwitcher() {
  const { user, getMyProfiles, switchProfile, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load profiles when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      const fetchedProfiles = await getMyProfiles();
      setProfiles(fetchedProfiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const handleSwitchProfile = async (uniqueUserId: string) => {
    if (uniqueUserId === user?.uniqueUserId) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      await switchProfile(uniqueUserId);
      setIsOpen(false);
      // Refresh the page to reload data for new profile
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch profile:', error);
      alert('Failed to switch profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    setIsOpen(false);
    router.push('/create-profile');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login-new');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  const currentProfileCount = profiles.length || 1;
  const canCreateMore = currentProfileCount < 5;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.profileName || user.displayName || user.name}
          </div>
          <div className="text-xs text-gray-500">{user.uniqueUserId}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* Current Profile Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.profileName || user.displayName || user.name}
                </p>
                <p className="text-xs text-gray-500">{user.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.isAdmin && (
                  <Shield className="w-4 h-4 text-indigo-600" />
                )}
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                  {user.role}
                </span>
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              <span className="mr-3">{user.uniqueUserId}</span>
              <span className="flex items-center">
                <Star className="w-3 h-3 mr-1 text-yellow-500 fill-current" />
                {user.totalPoints} pts
              </span>
            </div>
          </div>

          {/* Profile List */}
          {profiles.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                Switch Profile ({currentProfileCount}/5)
              </div>
              <div className="max-h-60 overflow-y-auto">
                {profiles.map((profile) => (
                  <button
                    key={profile.uniqueUserId}
                    onClick={() => handleSwitchProfile(profile.uniqueUserId)}
                    disabled={loading || profile.uniqueUserId === user.uniqueUserId}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                      profile.uniqueUserId === user.uniqueUserId ? 'bg-indigo-50' : ''
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{profile.profileName}</p>
                        {profile.isAdmin && (
                          <Shield className="w-3 h-3 text-indigo-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-500">{profile.uniqueUserId}</p>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {profile.role}
                        </span>
                        <span className="text-xs text-gray-600 flex items-center">
                          <Star className="w-3 h-3 mr-0.5 text-yellow-500 fill-current" />
                          {profile.totalPoints}
                        </span>
                      </div>
                    </div>
                    {profile.uniqueUserId === user.uniqueUserId && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 py-2">
            {canCreateMore && (
              <button
                onClick={handleCreateProfile}
                disabled={loading}
                className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Profile
              </button>
            )}
            {!canCreateMore && (
              <div className="px-4 py-2 text-xs text-gray-500">
                Maximum profiles reached (5/5)
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
