'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type { UserRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in - redirect to login
        router.push('/login');
      } else if (!allowedRoles.includes(user.role)) {
        // Logged in but wrong role - redirect to their dashboard
        const dashboardMap: Record<UserRole, string> = {
          'Admin': '/admin',
          'MD': '/md',
          'PM': '/pm',
          'HR': '/hr',
          'Manager': '/manager',
          'Supervisor': '/supervisor',
        };
        router.push(dashboardMap[user.role] || '/login');
      }
    }
  }, [user, loading, allowedRoles, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  // Render children if authorized
  return <>{children}</>;
}
