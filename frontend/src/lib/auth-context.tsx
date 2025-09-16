'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { apiClient } from './api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, registrationData: {
    role: 'customer' | 'shopkeeper';
    inviteToken?: string;
    profile?: {
      name?: string;
      message?: string;
    };
  }) => Promise<{ status: string; isAdmin: boolean; message: string; data: any }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      setLoading(true); // Ensure loading is true during auth state changes

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(true); // Force refresh to get custom claims
          apiClient.setAuthToken(token);

          // Try to get user profile, but handle case where user isn't registered yet
          try {
            const userProfile = await apiClient.getUserProfile();
            console.log('User profile loaded:', userProfile);
            setUser(userProfile);
          } catch (error: any) {
            console.error('Error loading user profile:', error);

            if (error.message?.includes('not registered') || error.message?.includes('404')) {
              // User exists in Firebase but not in our backend
              console.log('User not registered in backend');

              // For Google users, try auto-registration as customer
              if (firebaseUser.providerData.some(provider => provider.providerId === 'google.com')) {
                console.log('Auto-registering Google user as customer');
                try {
                  const registrationData = {
                    role: 'customer' as const,
                    profile: {
                      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    }
                  };

                  await apiClient.register(registrationData);
                  console.log('Auto-registration successful');

                  // Fetch the newly created user profile
                  const newUserProfile = await apiClient.getUserProfile();
                  setUser(newUserProfile);
                  return; // Exit early on success
                } catch (registerError: any) {
                  console.error('Auto-registration failed:', registerError);
                }
              }

              // If not Google user or auto-registration failed
              setUser(null);
            } else if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
              // Network error - backend is not running
              console.warn('Backend server appears to be offline. User can still browse products but cannot access authenticated features.');
              setUser(null);
            } else {
              // Other API errors
              console.warn('API error, continuing without user profile:', error.message);
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        apiClient.setAuthToken('');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, registrationData: {
    role: 'customer' | 'shopkeeper';
    inviteToken?: string;
    profile?: {
      name?: string;
      message?: string;
    };
  }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      // Register user in backend with role information
      apiClient.setAuthToken(token);
      const result = await apiClient.register(registrationData);

      // Force refresh token to get custom claims if user was approved
      if (result.status === 'approved' && result.isAdmin) {
        await userCredential.user.getIdToken(true);
      }

      return result;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get the Firebase token
      const token = await user.getIdToken();
      apiClient.setAuthToken(token);

      // Try to get user profile to see if they're already registered
      try {
        const userProfile = await apiClient.getUserProfile();
        console.log('Existing user profile found:', userProfile);
        setUser(userProfile);
      } catch (error: any) {
        if (error.message?.includes('not registered') || error.message?.includes('404')) {
          // User needs to be registered in backend - auto-register as customer
          console.log('Auto-registering Google user as customer');
          try {
            const registrationData = {
              role: 'customer' as const,
              profile: {
                name: user.displayName || user.email?.split('@')[0] || 'User',
              }
            };

            const result = await apiClient.register(registrationData);
            console.log('Auto-registration successful:', result);

            // Fetch the newly created user profile
            const newUserProfile = await apiClient.getUserProfile();
            setUser(newUserProfile);
          } catch (registerError: any) {
            console.error('Auto-registration failed:', registerError);
            // If registration fails, sign out and throw error
            await signOut(auth);
            throw new Error('Failed to create user account. Please try again.');
          }
        } else {
          // Other API error
          console.error('API error during Google sign-in:', error);
          await signOut(auth);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
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