"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ShoppingCart, Package,
  Activity, AlertTriangle, CheckCircle, Zap, Award,
  BarChart3, Eye, FileText, Settings, Bell,
  Boxes, IndianRupee, Download, ChevronRight, X,
  AlertCircle, LayoutDashboard, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════
const fadeIn = {
  hidden: { opacity: 0,y: 20 },
  visible: { opacity: 1, y: 0 }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const REVENUE_DATA = [
  { month: 'Jan', revenue: 42, cost: 28, profit: 14 },
  { month: 'Feb', revenue: 45, cost: 29, profit: 16 },
  { month: 'Mar', revenue: 51, cost: 31, profit: 20 },
  { month: 'Apr', revenue: 48, cost: 30, profit: 18 },
  { month: 'May', revenue: 53, cost: 32, profit: 21 },
  { month: 'Jun', revenue: 58, cost: 34, profit: 24 },
];

const PRODUCTION_DATA = [
  { day: 'Mon', produced: 145, target: 150 },
  { day: 'Tue', produced: 162, target: 150 },
  { day: 'Wed', produced: 138, target: 150 },
  { day: 'Thu', produced: 171, target: 150 },
  { day: 'Fri', produced: 155, target: 150 },
  { day: 'Sat', produced: 128, target: 120 },
];

const DEPT_PERFORMANCE = [
  { name: 'Stock Building', efficiency: 94, active: 11, total: 12, status: 'running', output: 245, target: 250 },
  { name: 'Machining', efficiency: 87, active: 16, total: 18, status: 'running', output: 310, target: 350 },
  { name: 'Lamination', efficiency: 96, active: 14, total: 15, status: 'running', output: 420, target: 400 },
  { name: 'Assembly', efficiency: 91, active: 19, total: 20, status: 'running', output: 180, target: 200 },
  { name: 'Quality', efficiency: 98, active: 12, total: 12, status: 'running', output: 520, target: 500 },
  { name: 'Welding', efficiency: 89, active: 13, total: 14, status: 'running', output: 280, target: 300 },
  { name: 'Trimline', efficiency: 45, active: 2, total: 8, status: 'idle', output: 65, target: 150 },
  { name: 'Maintenance', efficiency: 85, active: 9, total: 10, status: 'running', output: 95, target: 100 },
];

const QUALITY_METRICS = [
  { subject: 'Accuracy', Current: 95, Previous: 88 },
  { subject: 'Efficiency', Current: 92, Previous: 85 },
  { subject: 'Safety', Current: 98, Previous: 91 },
  { subject: 'Output', Current: 88, Previous: 82 },
  { subject: 'Quality', Current: 94, Previous: 87 },
];

const COLORS = {
  primary: '#06b6d4',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MDDashboard() {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [tab, setTab] = useState<'overview' | 'analytics' | 'approvals' | 'inventory'>('overview');
  const [showAlerts, setShowAlerts] = useState(false);
  const [materials, setMaterials] = useState<Array<{id: string; current_stock?: number; min_stock?: number; unit_price?: number; name?: string; category?: string}>>([]);
  const [orders, setOrders] = useState<Array<{id: string; status?: string; poNumber?: string; supplierName?: string; totalAmount?: number; createdAt?: string; createdBy?: string}>>([]);
  
  // Get user name from localStorage on mount
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

  const lowStock = materials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0) && (m.current_stock || 0) > 0).length;
  const outOfStock = materials.filter(m => (m.current_stock || 0) === 0).length;
  const pendingApprovals = orders.filter(po => po.status === 'pending_md_approval').length;
  const totalValue = materials.reduce((sum, m) => sum + ((m.current_stock || 0) * (m.unit_price || 0)), 0);

  const greeting = time.getHours() < 12 ? 'Good Morning' : time.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = time.getHours() < 12 ? '☀️' : time.getHours() < 17 ? '🌤️' : '🌙';

  const kpis = [
    { label: 'Monthly Revenue', value: '₹58L', change: 12.5, icon: IndianRupee, color: 'emerald' },
    { label: 'Active Orders', value: orders.length, change: 8.3, icon: ShoppingCart, color: 'blue' },
    { label: 'Efficiency', value: '94%', change: 3.2, icon: Zap, color: 'purple' },
    { label: 'Quality Score', value: '98%', change: 1.5, icon: Award, color: 'amber' },
  ];

  const alerts = [
    { id: '1', type: 'critical', title: 'Low Stock Alert', message: `${lowStock} materials below minimum`, dept: 'Inventory', time: '5 min ago', show: lowStock > 0 },
    { id: '2', type: 'warning', title: 'Pending Approvals', message: `${pendingApprovals} orders awaiting approval`, dept: 'Purchase', time: '15 min ago', show: pendingApprovals > 0 },
    { id: '3', type: 'info', title: 'Department Alert', message: 'Trimline efficiency at 45%', dept: 'Production', time: '1h ago', show: true },
  ].filter(a => a.show);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.header initial="hidden" animate="visible" variants={fadeIn} className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-5xl">{emoji}</span>
                <div>
                  <h1 className="text-4xl font-light text-white">
                    {greeting}, <span className="font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{userName}</span>
                  </h1>
                  <p className="text-zinc-400 mt-1">
                    {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {' • '}
                    <span className="font-mono text-cyan-400">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
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
                <Bell className="w-5 h-5 text-zinc-400" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {alerts.length}
                  </span>
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

          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'approvals', label: 'Approvals', icon: FileText, badge: pendingApprovals },
              { id: 'inventory', label: 'Inventory', icon: Boxes, badge: lowStock },
            ].map((t) => (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id as 'overview' | 'analytics' | 'approvals' | 'inventory')}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  tab === t.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <t.icon className="w-4 h-4" />
                <span className="font-medium">{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold">{t.badge}</span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.header>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                  <motion.div
                    key={i}
                    variants={fadeIn}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className={`bg-${kpi.color}-500/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 cursor-pointer`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-${kpi.color}-500/10 border border-white/10`}>
                        <kpi.icon className={`w-6 h-6 text-${kpi.color}-400`} />
                      </div>
                      <div className={`flex items-center gap-1 text-sm font-medium text-emerald-400`}>
                        <TrendingUp className="w-4 h-4" />
                        {kpi.change}%
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">{kpi.label}</p>
                    <p className={`text-3xl font-bold text-${kpi.color}-400`}>{kpi.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts */}
              <div className=" grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">Revenue & Profit</h3>
                      <p className="text-sm text-zinc-400">Last 6 months (₹ Lakhs)</p>
                    </div>
                    <button 
                      onClick={() => router.push('/md/analytics')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                    >
                      Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
              <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill="url(#revenue)" />
                      <Area type="monotone" dataKey="profit" stroke={COLORS.success} fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">Production Output</h3>
                      <p className="text-sm text-zinc-400">This week</p>
                    </div>
                    <button 
                      onClick={() => router.push('/production')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                    >
                      Production <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={PRODUCTION_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="day" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
                      <Bar dataKey="target" fill="#4b5563" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="produced" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* Departments */}
              <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Department Performance</h3>
                    <p className="text-sm text-zinc-400">Real-time efficiency</p>
                  </div>
                  <button 
                    onClick={() => router.push('/supervisor')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                    >
                    Manage <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DEPT_PERFORMANCE.map((dept, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-xl border ${
                        dept.status === 'running' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium text-sm">{dept.name}</h4>
                        <div className={`w-2 h-2 rounded-full ${dept.status === 'running' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Efficiency</span>
                          <span className={`font-semibold ${
                            dept.efficiency >= 90 ? 'text-emerald-400' : dept.efficiency >= 70 ? 'text-amber-400' : 'text-red-400'
                          }`}>{dept.efficiency}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Active</span>
                          <span className="text-white">{dept.active}/{dept.total}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              dept.efficiency >= 90 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                              dept.efficiency >= 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                            style={{ width: `${dept.efficiency}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ActionCard icon={FileText} title="Purchase Approvals" desc={`${pendingApprovals} pending`} onClick={() => setTab('approvals')} badge={pendingApprovals} />
                <ActionCard icon={Boxes} title="Inventory Overview" desc={`${lowStock} need attention`} onClick={() => setTab('inventory')} badge={lowStock} />
                <ActionCard icon={BarChart3} title="Analytics" desc="View reports" onClick={() => setTab('analytics')} />
              </div>
            </motion.div>
          )}

          {tab === 'analytics' && (
            <motion.div key="analytics" initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Quality Metrics</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={QUALITY_METRICS}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" stroke="#666" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
                      <Radar name="Current" dataKey="Current" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                      <Radar name="Previous" dataKey="Previous" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.3} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Export Reports</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all">
                      <Download className="w-5 h-5 text-blue-400" />
                      <div className="text-left">
                        <p className="text-white font-medium">Production Report</p>
                        <p className="text-xs text-zinc-400">Last 30 days</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all">
                      <Download className="w-5 h-5 text-emerald-400" />
                      <div className="text-left">
                        <p className="text-white font-medium">Financial Report</p>
                        <p className="text-xs text-zinc-400">Q1 2026</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all">
                      <Download className="w-5 h-5 text-purple-400" />
                      <div className="text-left">
                        <p className="text-white font-medium">Inventory Report</p>
                        <p className="text-xs text-zinc-400">Current stock</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {tab === 'approvals' && (
            <motion.div key="approvals" initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Purchase Orders</h3>
                    <p className="text-sm text-zinc-400">{pendingApprovals} awaiting approval</p>
                  </div>
                  <button 
                    onClick={() => router.push('/purchase')}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Purchase
                  </button>
                </div>

                {pendingApprovals === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-zinc-400">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.filter(po => po.status === 'pending_md_approval').map((po) => (
                      <div key={po.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-medium">{po.poNumber || po.id}</h4>
                              <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-xs text-amber-400">Pending</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-zinc-500">Supplier</p>
                                <p className="text-white">{po.supplierName || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500">Amount</p>
                                <p className="text-white font-semibold">₹{po.totalAmount?.toLocaleString() || '0'}</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/purchase?po=${po.id}`)}
                            className="ml-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:bg-cyan-500/30 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'inventory' && (
            <motion.div key="inventory" initial="hidden" animate="visible" variants={stagger} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard icon={Package} label="Total Items" value={materials.length} color="blue" />
                <StatsCard icon={AlertTriangle} label="Low Stock" value={lowStock} color="amber" />
                <StatsCard icon={AlertCircle} label="Out of Stock" value={outOfStock} color="red" />
                <StatsCard icon={IndianRupee} label="Total Value" value={`₹${(totalValue / 100000).toFixed(1)}L`} color="emerald" />
              </div>

              <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Critical Items</h3>
                    <p className="text-sm text-zinc-400">Requiring attention</p>
                  </div>
                  <button 
                    onClick={() => router.push('/empStore')}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage
                  </button>
                </div>

                {lowStock === 0 && outOfStock === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-zinc-400">All inventory levels healthy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials
                      .filter(m => (m.current_stock || 0) <= (m.min_stock || 0))
                      .slice(0, 10)
                      .map((m) => (
                        <div
                          key={m.id}
                          className={`p-4 rounded-xl border ${
                            m.current_stock === 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-white font-medium">{m.name || 'Unnamed'}</h4>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  m.current_stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {m.current_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                </span>
                              </div>
                              <div className="flex gap-6 text-sm">
                                <span className="text-zinc-500">Current: <span className="text-white font-semibold">{m.current_stock || 0}</span></span>
                                <span className="text-zinc-500">Min: <span className="text-white">{m.min_stock || 0}</span></span>
                                <span className="text-zinc-500">Category: <span className="text-white">{m.category || 'N/A'}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alerts Panel */}
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
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white">Notifications</h2>
                  <button onClick={() => setShowAlerts(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border ${
                        alert.type === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                        alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {alert.type === 'critical' && <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />}
                        {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />}
                        {alert.type === 'info' && <Activity className="w-5 h-5 text-blue-400 mt-0.5" />}
                        <div>
                          <h4 className="text-white font-medium mb-1">{alert.title}</h4>
                          <p className="text-sm text-zinc-400 mb-2">{alert.message}</p>
                          <div className="flex gap-3 text-xs text-zinc-500">
                            <span>{alert.dept}</span>
                            <span>•</span>
                            <span>{alert.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════
interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  onClick: () => void;
  badge?: number;
}

function ActionCard({ icon: Icon, title, desc, onClick, badge }: ActionCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="relative p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 rounded-2xl text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-white/10 rounded-xl">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-1 bg-red-500 rounded-full text-xs font-bold text-white">{badge}</span>
        )}
      </div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      <p className="text-zinc-400 text-sm mb-3">{desc}</p>
      <div className="flex items-center gap-2 text-sm text-cyan-400 group-hover:gap-3 transition-all">
        <span>View</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </motion.button>
  );
}

interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}

function StatsCard({ icon: Icon, label, value, color }: StatsCardProps) {
  return (
    <motion.div variants={fadeIn} className={`bg-gradient-to-br from-${color}-500/10 to-${color}-500/5 backdrop-blur-sm border border-${color}-500/20 rounded-2xl p-6`}>
      <div className="flex items-center gap-3">
        <div className={`p-3 bg-${color}-500/20 rounded-xl`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}
