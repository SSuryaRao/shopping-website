'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not authenticated at all
    if (!firebaseUser) {
      router.push(redirectTo);
      return;
    }

    // Firebase user exists but not registered in our backend
    if (!user) {
      router.push('/signup');
      return;
    }

    // User is pending approval
    if (user.role === 'pending') {
      router.push('/pending-approval');
      return;
    }

    // Requires admin access
    if (requireAdmin && !user.isAdmin) {
      router.push('/unauthorized');
      return;
    }

    // Requires super admin access
    if (requireSuperAdmin && !user.isSuperAdmin) {
      router.push('/unauthorized');
      return;
    }
  }, [user, firebaseUser, loading, router, requireAdmin, requireSuperAdmin, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!firebaseUser || !user || (requireAdmin && !user.isAdmin) || (requireSuperAdmin && !user.isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}