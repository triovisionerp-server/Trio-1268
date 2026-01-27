'use client';

import DynamicSidebar from '@/components/DynamicSidebar';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, userProfile } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth redirect is handled by AuthProvider, but show minimal UI while redirecting
  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden relative font-sans bg-zinc-950 text-white">
      
      {/* Background Grid - Same as Login Page */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />

      {/* Dynamic Sidebar - Role-based */}
      <DynamicSidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 relative z-10 h-screen overflow-y-auto">
        <main className="p-8 max-w-[1800px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}