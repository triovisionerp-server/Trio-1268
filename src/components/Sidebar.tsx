'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Factory, 
  PackageCheck, 
  Truck, 
  LogOut,
  Cog,
  Warehouse,
  ClipboardList,
  Users,
  FileText,
  Calendar,
  BarChart3,
  Zap
} from 'lucide-react';

// ==========================================
// ROLE-BASED MENU CONFIGURATION
// ==========================================
// Each role sees only their relevant menu items

type MenuItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  showNotification?: boolean;
  roles: string[]; // Which roles can see this item
};

const ALL_MENU_ITEMS: MenuItem[] = [
  // MD sees everything - top-level overview
  { name: 'MD Dashboard', path: '/md', icon: LayoutDashboard, showNotification: true, roles: ['md'] },
  { name: 'Analytics', path: '/md/analytics', icon: BarChart3, roles: ['md'] },
  { name: 'Calendar', path: '/calendar', icon: Calendar, roles: ['md', 'pm', 'project_manager', 'supervisor', 'hr', 'admin', 'manager'] },
  { name: 'Tooling Overview', path: '/md/tooling', icon: Cog, roles: ['md'] },
  
  // Project Manager
  { name: 'PM Dashboard', path: '/pm', icon: ClipboardList, roles: ['pm', 'project_manager'] },
  { name: 'PM Ultra', path: '/pm/ultra', icon: Zap, roles: ['pm', 'project_manager'] },
  
  // Store/Inventory
  { name: 'Store', path: '/store', icon: Warehouse, roles: ['md', 'store', 'store_manager', 'inventory'] },
  { name: 'Data Entry', path: '/empStore', icon: FileText, roles: ['store', 'store_manager', 'inventory', 'data_entry'] },
  
  // Purchase Team - their own dashboard
  { name: 'Purchase', path: '/purchase', icon: ShoppingCart, roles: ['md', 'purchase', 'purchase_manager', 'purchase_team'] },
  
  // Manufacturing
  { name: 'Production', path: '/production', icon: Factory, roles: ['md', 'production', 'supervisor', 'manufacturing'] },
  { name: 'Tooling', path: '/tooling', icon: Cog, roles: ['tooling', 'tool_room'] },
  
  // Completed Goods & Dispatch
  { name: 'Completed Products', path: '/fg-store', icon: PackageCheck, roles: ['md', 'fg_store', 'dispatch'] },
  { name: 'Dispatch', path: '/dispatch', icon: Truck, roles: ['md', 'dispatch', 'logistics'] },
  
  // HR & Admin
  { name: 'Employees', path: '/employees', icon: Users, roles: ['md', 'hr', 'admin'] },
];

// Helper to get user role from localStorage
function getUserRole(): string {
  if (typeof window === 'undefined') return '';
  
  // Try reading from currentUserRole first (direct value)
  const directRole = localStorage.getItem('currentUserRole');
  if (directRole) {
    return directRole.toLowerCase().trim();
  }
  
  // Fallback to parsing currentUser JSON
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user.role?.toLowerCase()?.trim() || '';
    } catch {
      return '';
    }
  }
  
  return '';
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [userRole, setUserRole] = useState('');

  // Get user role on mount and when window regains focus
  useEffect(() => {
    const loadRole = () => {
      const role = getUserRole();
      if (role) {
        setUserRole(role);
      }
    };
    
    loadRole();
    
    // Reload role when window regains focus (after login redirect)
    window.addEventListener('focus', loadRole);
    return () => window.removeEventListener('focus', loadRole);
  }, []);

  // Filter menu based on user role
  const visibleMenu = useMemo(() => {
    if (!userRole) return [];
    return ALL_MENU_ITEMS.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  // Lazy load pending approvals listener only for MD role
  useEffect(() => {
    if (userRole !== 'md') return;

    let unsubscribe: (() => void) | undefined;

    // Dynamic Firebase import
    (async () => {
      try {
        const [{ db }, { collection, query, where, onSnapshot }] = await Promise.all([
          import('@/lib/firebase/client'),
          import('firebase/firestore')
        ]);

        const { COLLECTIONS } = await import('@/types/purchase');

        const q = query(
          collection(db, COLLECTIONS.PURCHASE_ORDERS),
          where('status', '==', 'pending_md_approval')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          setPendingApprovals(snapshot.docs.length);
        }, (error) => {
          console.error('Error listening to pending approvals:', error);
        });
      } catch (error) {
        console.error('Failed to load pending approvals:', error);
      }
    })();

    return () => unsubscribe?.();
  }, [userRole]);

  const handleLogout = async () => {
    try {
      // Dynamic Firebase auth import only when needed
      const [{ auth }, { signOut }] = await Promise.all([
        import('@/lib/firebase/client'),
        import('firebase/auth')
      ]);
      
      await signOut(auth);
      
      // Clear local storage
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentUserRole');
      
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
      // Force logout anyway
      localStorage.clear();
      router.push('/login');
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/md') return pathname === '/md';
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50 bg-zinc-950/95 border-r border-white/10">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      
      {/* Glow Effect - simplified */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/3 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/3 rounded-full pointer-events-none" />
      
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
        {visibleMenu.length === 0 ? (
          <div className="text-zinc-500 text-sm px-4 py-2">
            No menu items available for your role
          </div>
        ) : (
          visibleMenu.map((item) => {
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
          })
        )}
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