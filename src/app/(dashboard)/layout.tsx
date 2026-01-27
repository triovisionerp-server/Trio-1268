'use client';

import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex overflow-hidden relative font-sans bg-zinc-950 text-white">
      
      {/* Background Grid - Same as Login Page */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 relative z-10 h-screen overflow-y-auto">
        <main className="p-8 max-w-[1800px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}