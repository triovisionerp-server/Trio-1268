'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Layers, 
  Factory, 
  PackageCheck, 
  Truck, 
  LogOut,
  Cog,
  Warehouse
} from 'lucide-react';
import { auth, db } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';

const MENU = [
  { name: 'MD Dashboard', path: '/md', icon: LayoutDashboard, showNotification: true },
  { name: 'Tooling', path: '/md/tooling', icon: Cog },
  { name: 'Store', path: '/store', icon: Warehouse },  // Store Manager - GRN + Inventory
  { name: 'Purchase', path: '/purchase', icon: ShoppingCart },  // Purchase Team - Create POs
  { name: 'Data Entry', path: '/empStore', icon: Layers },  // Store Team Data Entry
  { name: 'Manufacturing', path: '/production', icon: Factory },
  { name: 'Finished Goods', path: '/fg-store', icon: PackageCheck },
  { name: 'Dispatch', path: '/dispatch', icon: Truck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Listen for pending MD approvals
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      where('status', '==', 'pending_md_approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingApprovals(snapshot.docs.length);
    }, (error) => {
      console.error('Error listening to pending approvals:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/md') return pathname === '/md';
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-r border-white/10">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center font-bold text-white mr-3 shadow-lg shadow-cyan-500/20">
            TV
          </div>
          <span className="font-bold tracking-wider text-white">TRIOVISION</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="relative flex-1 p-4 space-y-1.5 overflow-y-auto">
        {MENU.map((item) => {
          const isActive = isActivePath(item.path);
          const showRedDot = item.showNotification && pendingApprovals > 0;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:border-white/10 border border-transparent'
              }`}>
                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                {item.name}
                
                {/* Red notification dot */}
                {showRedDot && (
                  <span className="absolute right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/10">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}