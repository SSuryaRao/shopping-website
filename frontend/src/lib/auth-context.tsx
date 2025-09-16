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
            if (error.message?.includes('not registered')) {
              // User exists in Firebase but not in our backend - they need to complete registration
              console.log('User not registered in backend, redirecting to signup');
              setUser(null);
            } else {
              throw error;
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
      await signInWithPopup(auth, googleProvider);
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