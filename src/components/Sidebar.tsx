'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, ClipboardList, 
  Factory, ShoppingCart, LogOut, Wrench, ChevronRight,
  TrendingUp, ShoppingBag, Truck, FileText, Settings, HardHat, Store
} from 'lucide-react';

// 1. MASTER MENU CONFIGURATION (Reordered)
const ALL_MENUS = [
  // Executive
  { label: "MD Overview", path: "/md", icon: LayoutDashboard, roles: ['md'] },
  
  // Operations (Moved Up as requested)
  { label: "Tooling Dept", path: "/tooling", icon: Wrench, roles: ['md', 'pm', 'supervisor'] }, 
  
  // Management
  { label: "Project Manager", path: "/pm", icon: ClipboardList, roles: ['md', 'pm'] },
  
  // Departments (In Order)
  { label: "Sales Management", path: "/sales", icon: TrendingUp, roles: ['md', 'sales', 'pm'] },
  { label: "Purchase Management", path: "/purchase", icon: ShoppingBag, roles: ['md', 'purchase', 'pm'] },
  { label: "Store Management", path: "/store", icon: Store, roles: ['md', 'store', 'pm'] },
  { label: "Delivery Dispatch", path: "/dispatch", icon: Truck, roles: ['md', 'dispatch', 'pm'] },
  { label: "Invoice", path: "/invoice", icon: FileText, roles: ['md', 'accounts'] },
  { label: "Employees", path: "/employees", icon: Users, roles: ['md', 'hr'] },
  { label: "Settings", path: "/settings", icon: Settings, roles: ['md', 'admin'] },

  // Supervisor Only
  { label: "Production Floor", path: "/supervisor", icon: HardHat, roles: ['supervisor'] }, 
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('guest');

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    setRole(currentUser || 'guest');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  // Filter menus based on role
  const visibleMenus = ALL_MENUS.filter(item => item.roles.includes(role));

  return (
    <aside className="w-72 h-screen fixed left-0 top-0 z-50 p-4 flex flex-col">
      <div className="h-full w-full backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
        
        <div className="p-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-white">TV</span>
            </div>
            <h1 className="text-lg font-bold text-white">Composite ERP</h1>
          </div>
          <p className="text-xs text-zinc-500 ml-1 uppercase tracking-wider">
            {role === 'md' ? 'Executive Access' : role}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto scrollbar-hide">
          {visibleMenus.map((item) => {
            // Active state check (includes sub-paths)
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                  isActive 
                    ? "bg-white/10 text-white border border-white/10 shadow-lg" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase tracking-wider">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}