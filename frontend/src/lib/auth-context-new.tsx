'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { apiClient } from './api';
import { User, ProfileOption } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  profileOptions: ProfileOption[] | null;
  needsProfileCreation: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  selectProfile: (uniqueUserId: string) => Promise<void>;
  createProfile: (profileData: {
    name: string;
    profileName: string;
    role: 'customer' | 'shopkeeper';
    inviteToken?: string;
    referralCode?: string;
  }) => Promise<void>;
  switchProfile: (uniqueUserId: string) => Promise<void>;
  getMyProfiles: () => Promise<ProfileOption[]>;
  clearProfileOptions: () => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[] | null>(null);
  const [needsProfileCreation, setNeedsProfileCreation] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      setLoading(true);

      if (firebaseUser) {
        try {
          // Get Firebase token
          const firebaseToken = await firebaseUser.getIdToken(true);
          apiClient.setFirebaseToken(firebaseToken);

          // Check for existing JWT token (session restoration)
          const existingJWT = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null;

          if (existingJWT) {
            // Try to verify existing session
            apiClient.setAuthToken(existingJWT);
            try {
              const userProfile = await apiClient.getUserProfile();
              setUser(userProfile);
              setNeedsProfileCreation(false);
              setProfileOptions(null);
              setLoading(false);
              return;
            } catch {
              // JWT expired or invalid, continue with Firebase login
              console.log('Existing session invalid, logging in with Firebase');
              apiClient.clearTokens();
            }
          }

          // Login with Firebase
          const response = await apiClient.firebaseLogin(firebaseToken);

          if (response.needsProfileCreation) {
            // New user - needs to create first profile
            setNeedsProfileCreation(true);
            setUser(null);
            setProfileOptions(null);
          } else if (response.requiresSelection) {
            // Multiple profiles - show selector
            setProfileOptions(response.profiles);
            setNeedsProfileCreation(false);
            setUser(null);
          } else {
            // Single profile - auto login
            apiClient.setAuthToken(response.token);
            setUser(response.user);
            setNeedsProfileCreation(false);
            setProfileOptions(null);
          }
        } catch (error) {
          console.error('Firebase authentication error:', error);
          setUser(null);
          setNeedsProfileCreation(false);
          setProfileOptions(null);
        }
      } else {
        // No Firebase user - logged out
        setUser(null);
        setNeedsProfileCreation(false);
        setProfileOptions(null);
        apiClient.clearTokens();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('Email sign-up error:', error);
      throw error;
    }
  };

  const selectProfile = async (uniqueUserId: string) => {
    try {
      if (!firebaseUser) {
        throw new Error('No Firebase user found');
      }

      const firebaseToken = await firebaseUser.getIdToken();
      const response = await apiClient.selectProfile(firebaseToken, uniqueUserId);

      apiClient.setAuthToken(response.token);
      setUser(response.user);
      setProfileOptions(null);
      setNeedsProfileCreation(false);
    } catch (error) {
      console.error('Profile selection error:', error);
      throw error;
    }
  };

  const createProfile = async (profileData: {
    name: string;
    profileName: string;
    role: 'customer' | 'shopkeeper';
    inviteToken?: string;
    referralCode?: string;
  }) => {
    try {
      if (!firebaseUser) {
        throw new Error('No Firebase user found');
      }

      const firebaseToken = await firebaseUser.getIdToken();
      const response = await apiClient.createProfile(firebaseToken, profileData);

      apiClient.setAuthToken(response.token);
      setUser(response.user);
      setProfileOptions(null);
      setNeedsProfileCreation(false);
    } catch (error) {
      console.error('Profile creation error:', error);
      throw error;
    }
  };

  const switchProfile = async (uniqueUserId: string) => {
    try {
      const response = await apiClient.switchProfile(uniqueUserId);
      apiClient.setAuthToken(response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Profile switch error:', error);
      throw error;
    }
  };

  const getMyProfiles = async (): Promise<ProfileOption[]> => {
    try {
      const response = await apiClient.getMyProfiles();
      return response.profiles || [];
    } catch (error) {
      console.error('Get profiles error:', error);
      return [];
    }
  };

  const clearProfileOptions = () => {
    setProfileOptions(null);
    setNeedsProfileCreation(false);
  };

  const logout = async () => {
    try {
      // Clear Firebase auth
      await firebaseSignOut(auth);

      // Clear API client tokens
      apiClient.clearTokens();

      // Clear local state
      setUser(null);
      setProfileOptions(null);
      setNeedsProfileCreation(false);

      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // NEW: Refresh user profile data
  const refreshUser = async () => {
    try {
      if (!firebaseUser) {
        console.log('No firebase user to refresh');
        return;
      }

      const token = await firebaseUser.getIdToken(true);
      apiClient.setFirebaseToken(token);
      apiClient.setAuthToken(token);

      const userProfile = await apiClient.getUserProfile();
      console.log('User profile refreshed:', userProfile);
      setUser(userProfile);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      // Don't throw - just log the error
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    profileOptions,
    needsProfileCreation,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    selectProfile,
    createProfile,
    switchProfile,
    getMyProfiles,
    clearProfileOptions,
    refreshUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
