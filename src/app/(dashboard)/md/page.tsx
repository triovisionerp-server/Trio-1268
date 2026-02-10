"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Package, Activity, CheckCircle, 
  Zap, Award, FileText, Settings, Bell, IndianRupee, 
  ChevronRight, X, Users, Briefcase, LucideIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
};



// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const REVENUE_DATA = [
  { month: 'Jan', revenue: 42, target: 40, growth: 105 },
  { month: 'Feb', revenue: 45, target: 43, growth: 104 },
  { month: 'Mar', revenue: 51, target: 46, growth: 111 },
  { month: 'Apr', revenue: 48, target: 48, growth: 100 },
  { month: 'May', revenue: 53, target: 50, growth: 106 },
  { month: 'Jun', revenue: 58, target: 52, growth: 112 },
];

const DEPT_EFFICIENCY = [
  { name: 'Stock', efficiency: 94 },
  { name: 'Machine', efficiency: 87 },
  { name: 'Laminate', efficiency: 96 },
  { name: 'Assembly', efficiency: 91 },
  { name: 'Quality', efficiency: 98 },
  { name: 'Welding', efficiency: 89 },
];

const PROJECT_STATUS = [
  { name: 'Completed', value: 35, color: '#10b981' },
  { name: 'In Progress', value: 45, color: '#3b82f6' },
  { name: 'Planning', value: 15, color: '#f59e0b' },
  { name: 'On Hold', value: 5, color: '#ef4444' },
];

const QUALITY_METRICS = [
  { subject: 'Accuracy', Current: 95, Target: 90 },
  { subject: 'Efficiency', Current: 92, Target: 88 },
  { subject: 'Safety', Current: 98, Target: 95 },
  { subject: 'Output', Current: 88, Target: 85 },
  { subject: 'Quality', Current: 94, Target: 90 },
  { subject: 'Delivery', Current: 91, Target: 88 },
];

const COLORS = {
  primary: '#06b6d4',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════
interface QuickActionBtnProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  onClick?: () => void;
}

function QuickActionBtn({ icon: Icon, label, count, onClick }: QuickActionBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="relative p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-lg">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium">{label}</p>
          {count !== undefined && <p className="text-zinc-400 text-sm">{count} pending</p>}
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdvancedMDDashboard() {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [showAlerts, setShowAlerts] = useState(false);
  const [materials, setMaterials] = useState<Array<{id: string; current_stock?: number; min_stock?: number; unit_price?: number; name?: string; category?: string}>>([]);
  const [orders, setOrders] = useState<Array<{id: string; status?: string; poNumber?: string; supplierName?: string; totalAmount?: number}>>([]);
  
  const [userName] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          return user.displayName?.split(' ')[0] || 'Director';
        } catch {}
      }
    }
    return 'Director';
  });

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'inventory_materials'),
      (snapshot) => setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CALCULATIONS
  // ═══════════════════════════════════════════════════════════════
  const lowStock = materials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0) && (m.current_stock || 0) > 0).length;
  const outOfStock = materials.filter(m => (m.current_stock || 0) === 0).length;
  const pendingApprovals = orders.filter(po => po.status === 'pending_md_approval').length;
  const totalAlerts = pendingApprovals + lowStock + outOfStock;

  const greeting = time.getHours() < 12 ? 'Good Morning' : time.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = time.getHours() < 12 ? '☀️' : time.getHours() < 17 ? '🌤️' : '🌙';

  const kpis = [
    { label: 'Revenue', value: '₹58L', change: 12.5, trend: 'up', icon: IndianRupee, color: 'emerald', target: '₹52L' },
    { label: 'Active Projects', value: 24, change: 8.3, trend: 'up', icon: Briefcase, color: 'blue', target: '20' },
    { label: 'Efficiency', value: '94%', change: 3.2, trend: 'up', icon: Zap, color: 'purple', target: '90%' },
    { label: 'Quality Score', value: '98%', change: 1.5, trend: 'up', icon: Award, color: 'amber', target: '95%' },
  ];

  // Alert notifications data
  const alerts = [
    { 
      id: '1', 
      type: 'critical' as const, 
      title: 'Purchase Approvals', 
      message: `${pendingApprovals} orders awaiting your approval`, 
      count: pendingApprovals,
      action: () => router.push('/purchase')
    },
    { 
      id: '2', 
      type: 'warning' as const, 
      title: 'Low Stock Alert', 
      message: `${lowStock} materials below minimum level`, 
      count: lowStock,
      action: () => router.push('/empStore')
    },
    { 
      id: '3', 
      type: 'danger' as const, 
      title: 'Out of Stock', 
      message: `${outOfStock} items need immediate purchase`, 
      count: outOfStock,
      action: () => router.push('/empStore')
    },
  ].filter(alert => alert.count > 0);

  // ═══════════════════════════════════════════════════════════════
  // RENDER SECTIONS
  // ═══════════════════════════════════════════════════════════════
  const renderOverview = () => (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            variants={fadeIn}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`relative overflow-hidden bg-gradient-to-br from-${kpi.color}-500/10 via-${kpi.color}-500/5 to-transparent backdrop-blur-sm border border-white/10 rounded-2xl p-6 group cursor-pointer`}
          >
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${kpi.color}-500/10 rounded-full blur-3xl group-hover:blur-2xl transition-all`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${kpi.color}-500/10 border border-${kpi.color}-500/20`}>
                  <kpi.icon className={`w-6 h-6 text-${kpi.color}-400`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${kpi.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  <TrendingUp className="w-4 h-4" />
                  {kpi.change}%
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold text-white mb-1`}>{kpi.value}</p>
              <p className="text-xs text-zinc-500">Target: {kpi.target}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <motion.div variants={fadeIn} className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">Revenue Performance</h3>
              <p className="text-sm text-zinc-400">Monthly trends vs targets (₹ Lakhs)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill="url(#revenue)" name="Revenue" />
              <Area type="monotone" dataKey="target" stroke={COLORS.warning} fill="none" strokeDasharray="5 5" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Efficiency */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Department Efficiency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={DEPT_EFFICIENCY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis domain={[0, 100]} stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
              <Bar dataKey="efficiency" fill={COLORS.success} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Project Status & Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Project Distribution</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={PROJECT_STATUS}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PROJECT_STATUS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quality Metrics */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Quality Metrics Radar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={QUALITY_METRICS}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" stroke="#666" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
              <Radar name="Current" dataKey="Current" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
              <Radar name="Target" dataKey="Target" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.1} />
              <Legend />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionBtn icon={FileText} label="Approvals" count={pendingApprovals} onClick={() => router.push('/purchase')} />
        <QuickActionBtn icon={Package} label="Inventory" count={lowStock} onClick={() => router.push('/empStore')} />
        <QuickActionBtn icon={TrendingUp} label="Production" onClick={() => router.push('/production')} />
        <QuickActionBtn icon={Users} label="Quality" onClick={() => router.push('/design')} />
      </div>
    </motion.div>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-6 space-y-6 max-w-screen-2xl mx-auto">
        {/* Executive Header */}
        <motion.header initial="hidden" animate="visible" variants={fadeIn} className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-5xl">{emoji}</span>
                <div>
                  <h1 className="text-4xl md:text-5xl font-light text-white">
                    {greeting}, <span className="font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{userName}</span>
                  </h1>
                  <p className="text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
                    <span>{time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono text-cyan-400">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <Bell className={`w-5 h-5 ${totalAlerts > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`} />
                {totalAlerts > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold px-1.5"
                  >
                    {totalAlerts}
                  </motion.span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/setup')}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <Settings className="w-5 h-5 text-zinc-400" />
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Content Area */}
        {renderOverview()}
      </div>

      {/* Alerts Notification Panel */}
      <AnimatePresence>
        {showAlerts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowAlerts(false)}
            />
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-white/10 z-50 overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Notifications</h2>
                    <p className="text-sm text-zinc-400 mt-1">{totalAlerts} items need attention</p>
                  </div>
                  <button 
                    onClick={() => setShowAlerts(false)} 
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                      <p className="text-zinc-400 text-lg">All clear!</p>
                      <p className="text-zinc-600 text-sm mt-2">No pending notifications</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                          alert.type === 'critical' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' :
                          alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' :
                          'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                        }`}
                        onClick={alert.action}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center ${
                            alert.type === 'critical' ? 'bg-red-500/20' :
                            alert.type === 'warning' ? 'bg-amber-500/20' : 'bg-orange-500/20'
                          }`}>
                            {alert.type === 'critical' ? <Bell className="w-5 h-5 text-red-400" /> :
                             alert.type === 'warning' ? <Package className="w-5 h-5 text-amber-400" /> :
                             <Activity className="w-5 h-5 text-orange-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-white font-semibold">{alert.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                alert.type === 'critical' ? 'bg-red-500/30 text-red-300' :
                                alert.type === 'warning' ? 'bg-amber-500/30 text-amber-300' :
                                'bg-orange-500/30 text-orange-300'
                              }`}>
                                {alert.count}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400">{alert.message}</p>
                            <button className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                              View Details <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

