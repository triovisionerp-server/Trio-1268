'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard,
  ShoppingCart,
  FileText,
  PackageCheck,
  Receipt,
  AlertTriangle,
  Settings,
  BarChart3,
  ArrowLeftRight,
  ClipboardList,
  LogOut,
  Bell,
  Loader2,
  Home,
  Truck
} from 'lucide-react';
import { auth, db } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// ==========================================
// PURCHASE MODULE LAYOUT - Independent from main sidebar
// ==========================================

const PURCHASE_MENU = [
  { name: 'Dashboard', path: '/purchase', icon: LayoutDashboard, exact: true },
  { name: 'Material Requests', path: '/purchase/requests', icon: ClipboardList },
  { name: 'Purchase Orders', path: '/purchase/orders', icon: ShoppingCart },
  { name: 'Goods Receipt', path: '/purchase/grn', icon: PackageCheck },
  { name: 'Invoices', path: '/purchase/invoices', icon: Receipt },
  { name: 'Alerts', path: '/purchase/alerts', icon: AlertTriangle },
  { name: 'Reports', path: '/purchase/reports', icon: BarChart3 },
  { name: 'Transfers', path: '/purchase/transfers', icon: ArrowLeftRight },
  { name: 'Settings', path: '/purchase/setup', icon: Settings },
];

export default function PurchaseLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Listen for pending items
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'material_requests'),
        where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingCount(snapshot.docs.length);
      }, console.error);
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up listener:', error);
    }
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('currentUser');
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const isActivePath = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen flex overflow-hidden relative font-sans bg-zinc-950 text-white">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />
      
      {/* Ambient Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Sidebar */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${sidebarCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col fixed left-0 top-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-r border-white/10 transition-all duration-300`}
      >
        {/* Header */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3">
                <span className="font-bold tracking-wider text-white">PURCHASE</span>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Management</p>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        {!sidebarCollapsed && currentUser && (
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm text-white font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-zinc-500 capitalize">{currentUser.role}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Home Link */}
          <Link href="/store">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-white/5 hover:text-white transition-all mb-4">
              <Home className="w-4 h-4" />
              {!sidebarCollapsed && 'Back to Store'}
            </div>
          </Link>
          
          <div className="h-px bg-zinc-800 mb-4" />
          
          {PURCHASE_MENU.map((item) => {
            const isActive = isActivePath(item.path, item.exact);
            const showBadge = item.name === 'Material Requests' && pendingCount > 0;
            
            return (
              <Link key={item.path} href={item.path}>
                <motion.div 
                  whileHover={{ x: 4 }}
                  className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {!sidebarCollapsed && item.name}
                  
                  {showBadge && !sidebarCollapsed && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                  
                  {showBadge && sidebarCollapsed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
          >
            {sidebarCollapsed ? '→' : '← Collapse'}
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} relative z-10 h-screen overflow-y-auto transition-all duration-300`}>
        <main className="p-6 max-w-[1800px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
