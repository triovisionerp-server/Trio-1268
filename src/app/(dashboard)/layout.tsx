'use client';

import Sidebar from '@/components/Sidebar';
import { motion } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex overflow-hidden relative font-sans selection:bg-purple-500/30">
      
      {/* --- GLOBAL BACKGROUND (Login Style) --- */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>
      
      {/* Animated Blobs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse pointer-events-none z-0"></div>
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none z-0"></div>

      {/* --- SIDEBAR (Fixed Position) --- */}
      <Sidebar />

      {/* --- MAIN CONTENT (Pushed Right to fix Alignment) --- */}
      {/* Added 'ml-80' to ensure it doesn't hide behind sidebar */}
      <div className="flex-1 ml-80 relative z-10 h-screen overflow-y-auto scrollbar-hide">
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
          className="p-10 max-w-[1800px] mx-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}