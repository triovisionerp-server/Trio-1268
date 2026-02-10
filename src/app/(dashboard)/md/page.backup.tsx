"use client";

import React, { useState, useEffect } from "react";
import { 
  Factory, Users, TrendingUp, TrendingDown, Calendar, BarChart3, 
  ArrowRight, Activity, CheckCircle, AlertTriangle, Clock,
  X, Cog, Building2, Warehouse, Bell, Package, Phone, Mail,
  MapPin, FileText, ShoppingCart, User, Building, Eye, Boxes,
  LayoutDashboard, FileCheck, Truck
} from "lucide-react";
import MDPurchaseApproval from './MDPurchaseApproval';
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { db } from '@/lib/firebase/client';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDocs, limit } from 'firebase/firestore';
import { COLLECTIONS, MD_APPROVAL_THRESHOLD } from '@/types/purchase';
import type { PurchaseOrder, GoodsReceipt } from '@/types/purchase';
import type { DailyStockRecord } from '@/types/inventory';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// Firebase Collections
const FB_MATERIALS = 'inventory_materials';
const FB_DAILY_STOCK = 'daily_stock_records';

// ═══════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const notificationPanelVariants = {
  hidden: { opacity: 0, x: 20, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
  exit: { opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }
};

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT & PROJECT DATA
// ═══════════════════════════════════════════════════════════════
interface Department {
  id: number;
  name: string;
  employees: number;
  active: number;
  efficiency: number;
  status: "running" | "maintenance" | "blocked";
  trend: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  progress: number;
  status: "active" | "on-hold" | "completed";
  sheds: ("shed1" | "shed2")[];  // Projects can span multiple sheds
  priority: "high" | "medium" | "low";
  deadline: string;
  assignedDepts: string[];
}

// ALL DEPARTMENTS (Tooling contains all departments)
const ALL_DEPARTMENTS: Department[] = [
  { id: 1, name: "Stock Building", employees: 12, active: 11, efficiency: 94, status: "running", trend: +2 },
  { id: 2, name: "Machining", employees: 18, active: 16, efficiency: 87, status: "running", trend: -1 },
  { id: 3, name: "Pattern Finishing", employees: 8, active: 8, efficiency: 92, status: "running", trend: +3 },
  { id: 4, name: "Lamination", employees: 15, active: 14, efficiency: 96, status: "running", trend: +1 },
  { id: 5, name: "Mold Finishing", employees: 10, active: 0, efficiency: 0, status: "maintenance", trend: 0 },
  { id: 6, name: "Welding", employees: 14, active: 13, efficiency: 89, status: "running", trend: +2 },
  { id: 7, name: "Assembly", employees: 20, active: 19, efficiency: 91, status: "running", trend: +4 },
  { id: 8, name: "CMM (Inspection)", employees: 6, active: 6, efficiency: 100, status: "running", trend: +1 },
  { id: 9, name: "Trimline", employees: 8, active: 2, efficiency: 45, status: "blocked", trend: -5 },
  { id: 10, name: "Quality Control", employees: 12, active: 12, efficiency: 98, status: "running", trend: +2 },
  { id: 11, name: "Maintenance", employees: 10, active: 9, efficiency: 85, status: "running", trend: 0 },
];

// PROJECTS - Can span across Shed 1, Shed 2, or both
const PROJECTS: Project[] = [
  { 
    id: "p1", name: "Project Alpha", code: "PA-2026-001", client: "TATA Motors",
    progress: 78, status: "active", sheds: ["shed1", "shed2"], priority: "high",
    deadline: "Feb 15, 2026", assignedDepts: ["Lamination", "Assembly", "Quality Control"]
  },
  { 
    id: "p2", name: "Project Beta", code: "PB-2026-002", client: "Mahindra",
    progress: 45, status: "active", sheds: ["shed1"], priority: "medium",
    deadline: "Mar 20, 2026", assignedDepts: ["Stock Building", "Machining", "Welding"]
  },
  { 
    id: "p3", name: "Project Gamma", code: "PG-2026-003", client: "Ashok Leyland",
    progress: 92, status: "active", sheds: ["shed2"], priority: "high",
    deadline: "Jan 30, 2026", assignedDepts: ["Assembly", "CMM (Inspection)", "Quality Control"]
  },
  { 
    id: "p4", name: "Project Delta", code: "PD-2026-004", client: "Volvo",
    progress: 23, status: "active", sheds: ["shed1", "shed2"], priority: "low",
    deadline: "Apr 10, 2026", assignedDepts: ["Pattern Finishing", "Mold Finishing", "Trimline"]
  },
  { 
    id: "p5", name: "Maintenance Job", code: "MJ-2026-005", client: "Internal",
    progress: 60, status: "on-hold", sheds: ["shed1"], priority: "medium",
    deadline: "Feb 28, 2026", assignedDepts: ["Maintenance"]
  },
];

// Get projects by shed
const getShedProjects = (shedId: "shed1" | "shed2") => 
  PROJECTS.filter(p => p.sheds.includes(shedId));

// Get shared projects (spanning both sheds)
const SHARED_PROJECTS = PROJECTS.filter(p => p.sheds.length === 2);

const WEEKLY_DATA = [
  { day: "Mon", production: 145, target: 150, quality: 96 },
  { day: "Tue", production: 162, target: 150, quality: 98 },
  { day: "Wed", production: 138, target: 150, quality: 94 },
  { day: "Thu", production: 171, target: 150, quality: 97 },
  { day: "Fri", production: 155, target: 150, quality: 95 },
  { day: "Sat", production: 128, target: 120, quality: 99 },
  { day: "Sun", production: 89, target: 80, quality: 100 },
];

const OEE_DATA = [
  { name: "Availability", value: 92, color: "#10b981" },
  { name: "Performance", value: 88, color: "#3b82f6" },
  { name: "Quality", value: 96, color: "#8b5cf6" },
];

const ACTIVITIES = [
  { id: 1, text: "Job T436B completed successfully", dept: "Assembly", time: "2 min ago", type: "success" },
  { id: 2, text: "Quality inspection passed - Batch #127", dept: "CMM", time: "15 min ago", type: "success" },
  { id: 3, text: "Scheduled maintenance started", dept: "Mold Finishing", time: "1 hour ago", type: "warning" },
  { id: 4, text: "Material shortage detected", dept: "Trimline", time: "2 hours ago", type: "error" },
  { id: 5, text: "New production batch initiated", dept: "Lamination", time: "3 hours ago", type: "info" },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
type ModalType = "shed1" | "shed2" | null;
type ViewType = "dashboard" | "approvals";

// Helper function to get greeting based on time
const getGreeting = (hour: number): { greeting: string; emoji: string } => {
  if (hour >= 5 && hour < 12) return { greeting: "Good Morning", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { greeting: "Good Afternoon", emoji: "🌤️" };
  if (hour >= 17 && hour < 21) return { greeting: "Good Evening", emoji: "🌅" };
  return { greeting: "Good Night", emoji: "🌙" };
};

// Helper to get user from localStorage
const getCurrentUserName = (): string => {
  if (typeof window === 'undefined') return 'Director';
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      // Extract first name from displayName
      const fullName = user.displayName || user.name || 'Director';
      return fullName.split(' ')[0]; // Return first name only
    } catch {
      return 'Director';
    }
  }
  return 'Director';
};

export default function MDDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [userName, setUserName] = useState('Director');
  
  // Inventory Overview States
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);
  const [inventoryMaterials, setInventoryMaterials] = useState<{id: string; name?: string; current_stock?: number; min_stock?: number; supplier_name?: string; category?: string; unit?: string;}[]>([]);
  const [latestDailyStock, setLatestDailyStock] = useState<DailyStockRecord | null>(null);
  
  // Approval action states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [mdSignature, setMdSignature] = useState('');
  const [actionSuccess, setActionSuccess] = useState<'approved' | 'rejected' | null>(null);

  // All Purchase Orders (for overview)
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // GRNs for Received Today
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get user name on mount
  useEffect(() => {
    setUserName(getCurrentUserName());
  }, []);

  // Fetch ALL purchase orders from Firebase (for overview)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.PURCHASE_ORDERS), (snapshot) => {
      const orders: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() } as PurchaseOrder);
      });
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllPurchaseOrders(orders);
      // Filter pending orders
      setPendingOrders(orders.filter(o => o.status === 'pending_md_approval'));
    }, (error) => {
      console.error('Error fetching purchase orders:', error);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Goods Receipts (for Received Today section)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.GOODS_RECEIPTS), (snapshot) => {
      const grns: GoodsReceipt[] = [];
      snapshot.forEach((docSnap) => {
        grns.push({ id: docSnap.id, ...docSnap.data() } as GoodsReceipt);
      });
      grns.sort((a, b) => new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime());
      setGoodsReceipts(grns);
    }, (error) => {
      console.error('Error fetching GRNs:', error);
    });

    return () => unsubscribe();
  }, []);

  // Fetch inventory materials
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, FB_MATERIALS), (snapshot) => {
      const materials: {id: string; name?: string; current_stock?: number; min_stock?: number; supplier_name?: string; category?: string; unit?: string;}[] = [];
      snapshot.forEach((doc) => {
        materials.push({ id: doc.id, ...doc.data() } as {id: string; name?: string; current_stock?: number; min_stock?: number; supplier_name?: string; category?: string; unit?: string;});
      });
      setInventoryMaterials(materials);
    });

    return () => unsubscribe();
  }, []);

  // Fetch latest daily stock record
  useEffect(() => {
    const fetchLatestDailyStock = async () => {
      try {
        const q = query(
          collection(db, FB_DAILY_STOCK),
          orderBy('date', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setLatestDailyStock({ id: doc.id, ...doc.data() } as DailyStockRecord);
        }
      } catch (error) {
        console.error('Error fetching daily stock:', error);
      }
    };
    
    fetchLatestDailyStock();
  }, []);

  // Handle opening order details
  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    setShowNotifications(false);
    setActionSuccess(null);
    setRejectReason('');
    setMdSignature('');
  };

  // Handle Approve Order
  const handleApproveOrder = async () => {
    if (!selectedOrder?.id || !mdSignature.trim()) return;
    
    setIsApproving(true);
    try {
      const orderRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, selectedOrder.id);
      await updateDoc(orderRef, {
        status: 'approved',
        approvedBy: 'MD',
        approvedAt: new Date().toISOString(),
        mdSignature: mdSignature.trim(),
        updatedAt: new Date().toISOString()
      });
      
      setActionSuccess('approved');
      setTimeout(() => {
        setShowOrderDetails(false);
        setSelectedOrder(null);
        setMdSignature('');
        setActionSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Error approving order:', error);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject Order
  const handleRejectOrder = async () => {
    if (!selectedOrder?.id || !rejectReason.trim()) return;
    
    setIsRejecting(true);
    try {
      const orderRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, selectedOrder.id);
      await updateDoc(orderRef, {
        status: 'rejected',
        rejectedBy: 'MD',
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectReason.trim(),
        updatedAt: new Date().toISOString()
      });
      
      setActionSuccess('rejected');
      setShowRejectModal(false);
      setTimeout(() => {
        setShowOrderDetails(false);
        setSelectedOrder(null);
        setRejectReason('');
        setActionSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Error rejecting order:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const today = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const timeString = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  // Get personalized greeting
  const { greeting, emoji } = getGreeting(currentTime.getHours());

  // Calculations
  const totalEmployees = ALL_DEPARTMENTS.reduce((sum, d) => sum + d.employees, 0);
  const activeEmployees = ALL_DEPARTMENTS.reduce((sum, d) => sum + d.active, 0);
  const onLeave = totalEmployees - activeEmployees;
  const runningDepts = ALL_DEPARTMENTS.filter(d => d.status === "running").length;
  const avgEfficiency = Math.round(
    ALL_DEPARTMENTS.filter(d => d.status === "running").reduce((sum, d) => sum + d.efficiency, 0) / runningDepts
  );
  const overallOEE = Math.round((92 * 88 * 96) / 10000);

  // View Tab Data
  const views = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals' as ViewType, label: 'Purchase Approvals', icon: FileCheck, badge: pendingOrders.length },
  ];

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-1/2 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Content */}
      <motion.div 
        className="relative z-10 w-full px-6 lg:px-8 py-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* ════════════════════ PERSONALIZED HEADER - NOTION STYLE ════════════════════ */}
        <motion.header variants={fadeInUp} className="mb-8">
          {/* Notion-style Greeting Section */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Big Emoji + Greeting */}
              <motion.div
                className="flex items-center gap-4 mb-3"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-5xl">{emoji}</span>
                <div>
                  <h1 className="text-4xl font-light text-white">
                    {greeting}, <span className="font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{userName}</span>
                  </h1>
                  <p className="text-zinc-500 mt-1 flex items-center gap-3">
                    <span>{today}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono text-cyan-400">{timeString}</span>
                  </p>
                </div>
              </motion.div>

              {/* Today's Quick Stats Strip */}
              <motion.div 
                className="flex items-center gap-6 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-zinc-300">
                    <span className="font-bold text-amber-400">{pendingOrders.length}</span> POs awaiting approval
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
                  <Factory className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">
                    <span className="font-bold text-emerald-400">{runningDepts}</span>/{ALL_DEPARTMENTS.length} departments running
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-300">
                    <span className="font-bold text-blue-400">{activeEmployees}</span> employees active
                  </span>
                </div>
              </motion.div>
            </div>
          
            <motion.div 
              className="flex items-center gap-4 relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Inventory Overview Button */}
              <motion.button
                onClick={() => setShowInventoryPanel(!showInventoryPanel)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 ${
                  showInventoryPanel 
                  ? 'bg-emerald-500/20 border border-emerald-500/40' 
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Boxes className={`w-5 h-5 ${showInventoryPanel ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <span className={`text-sm font-medium ${showInventoryPanel ? 'text-emerald-400' : 'text-zinc-300'}`}>
                Inventory
              </span>
              {inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0) && (m.current_stock || 0) > 0).length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                >
                  {inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0) && (m.current_stock || 0) > 0).length}
                </motion.span>
              )}
            </motion.button>
            
            {/* Notification Toggle Button */}
            <motion.button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 ${
                showNotifications 
                  ? 'bg-cyan-500/20 border border-cyan-500/40' 
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Bell className={`w-5 h-5 ${showNotifications ? 'text-cyan-400' : 'text-zinc-400'}`} />
              <span className={`text-sm font-medium ${showNotifications ? 'text-cyan-400' : 'text-zinc-300'}`}>
                Notifications
              </span>
              {pendingOrders.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                >
                  {pendingOrders.length}
                </motion.span>
              )}
            </motion.button>

            {/* Inventory Panel Dropdown */}
            <AnimatePresence>
              {showInventoryPanel && (
                <motion.div
                  variants={notificationPanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full right-28 mt-2 w-[500px] max-h-[600px] overflow-hidden rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50"
                >
                  <div className="p-4 border-b border-white/10 bg-gradient-to-r from-emerald-900/30 to-transparent">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Boxes className="w-5 h-5 text-emerald-400" />
                        Inventory Overview
                      </h3>
                      <Link
                        href="/store"
                        className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Full View
                      </Link>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Real-time stock status from warehouse</p>
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="p-4 grid grid-cols-4 gap-2 border-b border-white/5">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-2xl font-bold text-white">{inventoryMaterials.length}</div>
                      <div className="text-[10px] text-zinc-500">Total Items</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                      <div className="text-2xl font-bold text-emerald-400">
                        {inventoryMaterials.filter(m => (m.current_stock || 0) > (m.min_stock || 0)).length}
                      </div>
                      <div className="text-[10px] text-emerald-500">In Stock</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-500/10">
                      <div className="text-2xl font-bold text-amber-400">
                        {inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0) && (m.current_stock || 0) > 0).length}
                      </div>
                      <div className="text-[10px] text-amber-500">Low Stock</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-500/10">
                      <div className="text-2xl font-bold text-red-400">
                        {inventoryMaterials.filter(m => (m.current_stock || 0) === 0).length}
                      </div>
                      <div className="text-[10px] text-red-500">Out of Stock</div>
                    </div>
                  </div>

                  {/* Latest Daily Stock Info */}
                  {latestDailyStock && (
                    <div className="p-4 border-b border-white/5 bg-indigo-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm text-white font-medium">Latest Stock Record</span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {new Date(latestDailyStock.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="text-zinc-400">
                          Value: <span className="text-emerald-400 font-medium">₹{latestDailyStock.summary.totalStockValue.toLocaleString()}</span>
                        </div>
                        <div className="text-zinc-400">
                          Inward: <span className="text-cyan-400 font-medium">{latestDailyStock.summary.totalInward}</span>
                        </div>
                        <div className="text-zinc-400">
                          Issued: <span className="text-amber-400 font-medium">{latestDailyStock.summary.totalIssued}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Critical Items List */}
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="p-3 border-b border-white/5 sticky top-0 bg-zinc-900/95">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Critical Stock Items</span>
                    </div>
                    {inventoryMaterials
                      .filter(m => (m.current_stock || 0) <= (m.min_stock || 0))
                      .sort((a, b) => (a.current_stock || 0) - (b.current_stock || 0))
                      .slice(0, 10)
                      .map((material) => (
                        <div
                          key={material.id}
                          className="p-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-white text-sm">{material.name}</div>
                              <div className="text-xs text-zinc-500 mt-0.5">
                                {material.supplier_name || 'No supplier'} • {material.category || 'Raw Material'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${
                                (material.current_stock || 0) === 0 ? 'text-red-400' : 'text-amber-400'
                              }`}>
                                {material.current_stock || 0} {material.unit}
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                Min: {material.min_stock || 0}
                              </div>
                            </div>
                          </div>
                          {(material.current_stock || 0) === 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span className="text-xs text-red-400">Immediate purchase required</span>
                            </div>
                          )}
                        </div>
                      ))}
                    {inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0)).length === 0 && (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                        <p className="text-zinc-400">All items are well stocked</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notification Panel Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  variants={notificationPanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full right-0 mt-2 w-96 max-h-[500px] overflow-hidden rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Pending Approvals</h3>
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg">
                        {pendingOrders.length} pending
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Orders requiring your approval</p>
                  </div>
                  
                  <div className="max-h-[380px] overflow-y-auto">
                    {pendingOrders.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-zinc-400">No pending approvals</p>
                        <p className="text-xs text-zinc-600 mt-1">All orders are up to date</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {pendingOrders.map((order) => (
                          <motion.button
                            key={order.id}
                            onClick={() => handleViewOrder(order)}
                            className="w-full p-4 text-left hover:bg-white/5 transition-colors group"
                            whileHover={{ x: 4 }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="w-5 h-5 text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-sm">{order.poNumber}</span>
                                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-medium rounded">
                                    Needs Approval
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                                  {order.vendorDetails?.name || 'Unknown Vendor'}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-zinc-500">
                                    {order.items?.length || 0} items
                                  </span>
                                  <span className="text-sm font-semibold text-emerald-400">
                                    ₹{order.totalAmount?.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {pendingOrders.length > 0 && (
                    <div className="p-3 border-t border-white/10">
                      <motion.button
                        onClick={() => {
                          setShowNotifications(false);
                          setActiveView('approvals');
                        }}
                        className="w-full py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        View All Approvals
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </div>
        </motion.header>

        {/* ════════════════════ VIEW TABS ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-6">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit">
            {views.map((view) => (
              <motion.button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeView === view.id
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <view.icon className={`w-4 h-4 ${activeView === view.id ? 'text-cyan-400' : ''}`} />
                {view.label}
                {view.badge !== undefined && view.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeView === view.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {view.badge}
                  </motion.span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ════════════════════ VIEW CONTENT ════════════════════ */}
        <AnimatePresence mode="wait">
          {activeView === 'approvals' ? (
            <motion.div
              key="approvals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MDPurchaseApproval />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >

        {/* ════════════════════ NOTION-STYLE TODAY'S OVERVIEW ════════════════════ */}
        <motion.div 
          variants={fadeInUp}
          className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Today's Priority Tasks */}
          <motion.div 
            className="lg:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
            whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Today&apos;s Priority Tasks</h3>
                  <p className="text-xs text-zinc-500">What needs your attention today</p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            
            <div className="space-y-3">
              {/* Task 1 - PO Approvals */}
              {pendingOrders.length > 0 && (
                <motion.div 
                  className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors"
                  whileHover={{ x: 4 }}
                  onClick={() => setActiveView('approvals')}
                >
                  <div className="w-6 h-6 rounded-lg border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Review & Approve Purchase Orders</p>
                    <p className="text-xs text-zinc-400">{pendingOrders.length} PO{pendingOrders.length > 1 ? 's' : ''} pending • Total: ₹{pendingOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">Urgent</span>
                </motion.div>
              )}
              
              {/* Task 2 - Low Stock Alert */}
              {inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0)).length > 0 && (
                <motion.div 
                  className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/15 transition-colors"
                  whileHover={{ x: 4 }}
                  onClick={() => setShowInventoryPanel(true)}
                >
                  <div className="w-6 h-6 rounded-lg border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Critical Stock Levels</p>
                    <p className="text-xs text-zinc-400">{inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0)).length} items need immediate attention</p>
                  </div>
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">Critical</span>
                </motion.div>
              )}
              
              {/* Task 3 - Production Review */}
              <motion.div 
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors"
                whileHover={{ x: 4 }}
              >
                <div className="w-6 h-6 rounded-lg border-2 border-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Factory className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Review Production Status</p>
                  <p className="text-xs text-zinc-400">{avgEfficiency}% avg efficiency across {runningDepts} running departments</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">In Progress</span>
              </motion.div>
              
              {/* Task 4 - Weekly Reports */}
              <motion.div 
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors"
                whileHover={{ x: 4 }}
              >
                <div className="w-6 h-6 rounded-lg border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-3 h-3 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Weekly Performance Analysis</p>
                  <p className="text-xs text-zinc-400">Review OEE: {overallOEE}% • Prepare for Monday sync</p>
                </div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">Scheduled</span>
              </motion.div>
              
              {/* All caught up message */}
              {pendingOrders.length === 0 && inventoryMaterials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0)).length === 0 && (
                <motion.div 
                  className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-400">All caught up! 🎉</p>
                    <p className="text-xs text-zinc-400">No urgent tasks pending approval</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions - Notion Style */}
          <motion.div 
            className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
            whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Cog className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                <p className="text-xs text-zinc-500">Frequently used shortcuts</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => setActiveView('approvals')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <FileText className="w-6 h-6 text-amber-400" />
                <span className="text-xs text-zinc-300">Approvals</span>
                {pendingOrders.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingOrders.length}</span>
                )}
              </motion.button>
              
              <motion.button
                onClick={() => setShowInventoryPanel(true)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Boxes className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-zinc-300">Inventory</span>
              </motion.button>
              
              <Link href="/md/tooling">
                <motion.div
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Cog className="w-6 h-6 text-purple-400" />
                  <span className="text-xs text-zinc-300">Tooling</span>
                </motion.div>
              </Link>
              
              <Link href="/md/analytics">
                <motion.div
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  <span className="text-xs text-zinc-300">Analytics</span>
                </motion.div>
              </Link>
            </div>
            
            {/* Today's Quote */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <p className="text-sm italic text-zinc-300">&quot;Excellence is not a destination but a continuous journey.&quot;</p>
              <p className="text-xs text-zinc-500 mt-2">— Triovision Vision</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ════════════════════ MAIN CONTENT ════════════════════ */}
        {/* ════════════════════ KPI CARDS ════════════════════ */}
        <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
          <KPICard
            icon={Users}
            value={totalEmployees}
            label="Total Employees"
            sub={`${activeEmployees} active today`}
            color="cyan"
            trend={3}
            delay={0}
          />
          <KPICard
            icon={Warehouse}
            value="3"
            label="Total Sheds"
            sub="1 Tooling • 2 Production"
            color="emerald"
            delay={0.1}
          />
          <KPICard
            icon={BarChart3}
            value={`${avgEfficiency}%`}
            label="Avg. Efficiency"
            sub="Across departments"
            color="violet"
            trend={2.5}
            delay={0.2}
          />
          <KPICard
            icon={Calendar}
            value={onLeave}
            label="On Leave Today"
            sub={`${Math.round((onLeave/totalEmployees)*100)}% of workforce`}
            color="amber"
            delay={0.3}
          />
        </motion.div>

        {/* ════════════════════ SHEDS SECTION ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-medium text-white">Manufacturing Overview</h2>
              <p className="text-sm text-zinc-500 mt-1">Tooling (All Departments) • Production Shed 1 & 2 (Project Work)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <StatusLegend color="emerald" label="Active" />
              <StatusLegend color="amber" label="On Hold" />
              <StatusLegend color="red" label="Blocked" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* TOOLING CARD - Links to separate page */}
            <ToolingCard />
            
            {/* PRODUCTION SHED 1 */}
            <ProductionShedCard 
              shedId="shed1"
              name="Production Shed 1"
              color="violet"
              projects={getShedProjects("shed1")}
              onClick={() => setActiveModal("shed1")}
            />
            
            {/* PRODUCTION SHED 2 */}
            <ProductionShedCard 
              shedId="shed2"
              name="Production Shed 2"
              color="emerald"
              projects={getShedProjects("shed2")}
              onClick={() => setActiveModal("shed2")}
            />
          </div>

          {/* Shared Projects Indicator */}
          {SHARED_PROJECTS.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-transparent to-emerald-500/10 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="w-6 h-6 rounded-full bg-violet-500/30 border-2 border-zinc-900 flex items-center justify-center text-[10px] text-violet-300">S1</span>
                  <span className="w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-zinc-900 flex items-center justify-center text-[10px] text-emerald-300">S2</span>
                </div>
                <span className="text-sm text-zinc-400">
                  <span className="text-white font-medium">{SHARED_PROJECTS.length} projects</span> span across both production sheds
                </span>
                <div className="flex gap-2 ml-auto">
                  {SHARED_PROJECTS.slice(0, 3).map(p => (
                    <span key={p.id} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-zinc-300">{p.code}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ════════════════════ MAIN GRID ════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-8">
          {/* Charts Section */}
          <motion.div variants={staggerContainer} className="xl:col-span-8 space-y-5">
            {/* Weekly Production Trend */}
            <motion.div 
              variants={fadeInUp}
              className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-white">Weekly Production</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Units produced vs target</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-500"></span> Actual</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-zinc-600"></span> Target</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={WEEKLY_DATA}>
                  <defs>
                    <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #27272a', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="target" stroke="#52525b" strokeWidth={2} fill="none" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="production" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorProduction)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Department Efficiency Bar Chart */}
            <motion.div 
              variants={fadeInUp}
              className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-white">Efficiency by Department</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Current performance metrics</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ALL_DEPARTMENTS.filter(d => d.efficiency > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #27272a', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                    formatter={(value) => value !== undefined ? [`${value}%`, 'Efficiency'] : ['', '']}
                  />
                  <Bar 
                    dataKey="efficiency" 
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          {/* Right Column */}
          <motion.div variants={staggerContainer} className="xl:col-span-4 space-y-5">
            {/* OEE Donut Chart */}
            <motion.div 
              variants={scaleIn}
              className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-6"
            >
              <h3 className="text-lg font-medium text-white mb-2">OEE Performance</h3>
              <p className="text-xs text-zinc-500 mb-4">Overall Equipment Effectiveness</p>
              
              <div className="flex items-center justify-center">
                <div className="relative">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={OEE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {OEE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{overallOEE}%</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">OEE</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 mt-4">
                {OEE_DATA.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-zinc-500 uppercase">{item.name}</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Production Summary */}
            <motion.div 
              variants={scaleIn}
              className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-6"
            >
              <h3 className="text-lg font-medium text-white mb-4">Production Summary</h3>
              <div className="space-y-4">
                {[
                  { icon: CheckCircle, label: "Jobs Completed", value: "127", trend: "+12%", color: "emerald" },
                  { icon: Clock, label: "In Progress", value: "34", color: "blue" },
                  { icon: Activity, label: "Pending QC", value: "8", color: "violet" },
                  { icon: AlertTriangle, label: "Issues", value: "3", trend: "-2", color: "amber" },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-${item.color}-500/10 flex items-center justify-center`}>
                        <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                      </div>
                      <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">{item.value}</span>
                      {item.trend && (
                        <span className={`text-xs font-medium ${item.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.trend}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Employee Management Card */}
            <Link href="/employees">
              <motion.div 
                variants={scaleIn}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-violet-500/10 border border-cyan-500/20 hover:border-cyan-500/40 p-6 cursor-pointer transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <motion.div 
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"
                    whileHover={{ rotate: 5 }}
                  >
                    <Users className="w-7 h-7 text-cyan-400" />
                  </motion.div>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight className="w-6 h-6 text-cyan-400" />
                  </motion.div>
                </div>
                <h3 className="text-xl font-medium text-white group-hover:text-cyan-300 transition-colors">
                  Employee Management
                </h3>
                <p className="text-sm text-zinc-500 mt-1">View all {totalEmployees} employees</p>
                <div className="flex gap-3 mt-4">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    {activeEmployees} Active
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                    {onLeave} On Leave
                  </span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* ════════════════════ PURCHASE OVERVIEW SECTION ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-8">
          <motion.div 
            className="rounded-3xl bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-cyan-900/20 backdrop-blur-2xl border border-indigo-500/20 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  Purchase Orders Overview
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">All purchase orders status summary</p>
              </div>
              <Link
                href="/purchase"
                className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors flex items-center gap-2 border border-indigo-500/30"
              >
                <Eye className="w-4 h-4" />
                Full Purchase Page
              </Link>
            </div>

            {/* PO Summary Stats */}
            <div className="p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-3xl font-bold text-white">{allPurchaseOrders.length}</div>
                  <div className="text-xs text-zinc-500 mt-1">Total POs</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-3xl font-bold text-amber-400">
                    {allPurchaseOrders.filter(o => o.status === 'pending_md_approval').length}
                  </div>
                  <div className="text-xs text-amber-500 mt-1">Pending Approval</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-3xl font-bold text-emerald-400">
                    {allPurchaseOrders.filter(o => o.status === 'approved').length}
                  </div>
                  <div className="text-xs text-emerald-500 mt-1">Approved</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-400">
                    {allPurchaseOrders.filter(o => o.status === 'ordered' || o.status === 'partially_received').length}
                  </div>
                  <div className="text-xs text-blue-500 mt-1">🚚 Incoming</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <div className="text-3xl font-bold text-cyan-400">
                    {allPurchaseOrders.filter(o => o.status === 'received').length}
                  </div>
                  <div className="text-xs text-cyan-500 mt-1">Received</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="text-3xl font-bold text-red-400">
                    {allPurchaseOrders.filter(o => o.status === 'rejected').length}
                  </div>
                  <div className="text-xs text-red-500 mt-1">Rejected</div>
                </div>
              </div>

              {/* Recent POs List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-400 mb-3">Recent Purchase Orders</div>
                {allPurchaseOrders.slice(0, 5).map((po) => (
                  <div
                    key={po.id}
                    onClick={() => handleViewOrder(po)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        po.status === 'pending_md_approval' ? 'bg-amber-500/20' :
                        po.status === 'approved' ? 'bg-emerald-500/20' :
                        po.status === 'rejected' ? 'bg-red-500/20' :
                        po.status === 'ordered' || po.status === 'partially_received' ? 'bg-blue-500/20' :
                        'bg-cyan-500/20'
                      }`}>
                        <ShoppingCart className={`w-5 h-5 ${
                          po.status === 'pending_md_approval' ? 'text-amber-400' :
                          po.status === 'approved' ? 'text-emerald-400' :
                          po.status === 'rejected' ? 'text-red-400' :
                          po.status === 'ordered' || po.status === 'partially_received' ? 'text-blue-400' :
                          'text-cyan-400'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-white">{po.poNumber}</div>
                        <div className="text-xs text-zinc-500">
                          {po.vendorDetails?.name || 'Unknown Vendor'} • {po.items?.length || 0} items
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">₹{(po.totalAmount || 0).toLocaleString()}</div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        po.status === 'pending_md_approval' ? 'bg-amber-500/20 text-amber-400' :
                        po.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                        po.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        po.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                        po.status === 'partially_received' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {po.status === 'pending_md_approval' ? 'PENDING' : 
                         po.status === 'ordered' ? '🚚 INCOMING' :
                         po.status === 'partially_received' ? '📦 PARTIAL' :
                         po.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
                {allPurchaseOrders.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No purchase orders yet</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ════════════════════ INCOMING STOCK DETAILS SECTION ════════════════════ */}
        {(allPurchaseOrders || []).filter(o => o && (o.status === 'approved' || o.status === 'ordered' || o.status === 'partially_received')).length > 0 && (
          <motion.div variants={fadeInUp} className="mb-8">
            <motion.div 
              className="rounded-3xl bg-gradient-to-br from-blue-900/20 via-cyan-900/10 to-emerald-900/20 backdrop-blur-2xl border border-blue-500/20 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-400" />
                    🚚 Incoming Stock Details
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Products approved for purchase - arriving soon</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/30">
                    {(allPurchaseOrders || []).filter(o => o && (o.status === 'approved' || o.status === 'ordered' || o.status === 'partially_received')).reduce((sum, po) => sum + (po.items?.length || 0), 0)} items incoming
                  </span>
                  <Link
                    href="/store"
                    className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2 border border-blue-500/30"
                  >
                    <Warehouse className="w-4 h-4" />
                    Go to Store
                  </Link>
                </div>
              </div>

              {/* Incoming Items Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(allPurchaseOrders || [])
                    .filter(o => o && (o.status === 'approved' || o.status === 'ordered' || o.status === 'partially_received'))
                    .flatMap(po => 
                      (po.items || []).map(item => ({
                        itemID: item?.itemID || '',
                        itemName: item?.itemName || 'Unknown Item',
                        itemCode: item?.itemCode || '',
                        quantity: item?.quantity || 0,
                        unit: item?.unit || 'pcs',
                        unitPrice: item?.unitPrice || 0,
                        poNumber: po.poNumber || '',
                        poId: po.id || '',
                        vendorName: po.vendorDetails?.name || 'Unknown Vendor',
                        status: po.status,
                        expectedDelivery: po.expectedDelivery,
                        approvedAt: po.approvedAt
                      }))
                    )
                    .slice(0, 9)
                    .map((item, idx) => (
                      <motion.div
                        key={`${item.poNumber}-${item.itemID}-${idx}`}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                              {item.itemName}
                            </h4>
                            <p className="text-xs text-zinc-500 mt-0.5">{item.itemCode || item.itemID || '-'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                            item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {item.status === 'approved' ? '✓ Approved' : 
                             item.status === 'ordered' ? '🚚 In Transit' : 
                             '📦 Partial'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-blue-400">{item.quantity}</div>
                            <div className="text-[10px] text-zinc-500">{item.unit}</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-emerald-400">₹{(item.quantity * item.unitPrice).toLocaleString()}</div>
                            <div className="text-[10px] text-zinc-500">Value</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">
                              <span className="text-zinc-400">{item.vendorName}</span>
                            </span>
                            <span className="text-blue-400 font-mono">{item.poNumber}</span>
                          </div>
                          {item.expectedDelivery && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                              <Clock className="w-3 h-3" />
                              Expected: {new Date(item.expectedDelivery).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                </div>

                {/* Show more indicator */}
                {(allPurchaseOrders || [])
                  .filter(o => o && (o.status === 'approved' || o.status === 'ordered' || o.status === 'partially_received'))
                  .flatMap(po => po.items || []).length > 9 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/store"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View all {(allPurchaseOrders || []).filter(o => o && (o.status === 'approved' || o.status === 'ordered' || o.status === 'partially_received')).flatMap(po => po.items || []).length} incoming items
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* Summary by Vendor */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Incoming by Supplier</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const vendorMap = new Map<string, { name: string; count: number; value: number }>();
                      (allPurchaseOrders || [])
                        .filter(o => o && (o.status === 'approved' || o.status === 'ordered' || o.status === 'partially_received'))
                        .forEach(po => {
                          const vendorName = po.vendorDetails?.name || 'Unknown';
                          const existing = vendorMap.get(vendorName);
                          if (existing) {
                            existing.count += (po.items?.length || 0);
                            existing.value += (po.totalAmount || 0);
                          } else {
                            vendorMap.set(vendorName, {
                              name: vendorName,
                              count: po.items?.length || 0,
                              value: po.totalAmount || 0
                            });
                          }
                        });
                      return Array.from(vendorMap.values());
                    })().map((vendor, idx) => (
                      <div 
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
                      >
                        <span className="text-white font-medium">{vendor.name}</span>
                        <span className="text-zinc-500 ml-2">•</span>
                        <span className="text-blue-400 ml-2">{vendor.count} items</span>
                        <span className="text-zinc-500 ml-2">•</span>
                        <span className="text-emerald-400 ml-2">₹{(vendor.value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ════════════════════ RECEIVED TODAY SECTION ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-8">
          <motion.div 
            className="rounded-3xl bg-gradient-to-br from-emerald-900/20 via-green-900/10 to-teal-900/20 backdrop-blur-2xl border border-emerald-500/20 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ✅ Materials Received Today
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Stock received and added to inventory today</p>
              </div>
              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-lg border border-emerald-500/30">
                {goodsReceipts.filter(grn => {
                  const today = new Date();
                  const receivedDate = grn.receivedAt ? new Date(grn.receivedAt) : null;
                  return receivedDate && 
                    receivedDate.getDate() === today.getDate() &&
                    receivedDate.getMonth() === today.getMonth() &&
                    receivedDate.getFullYear() === today.getFullYear();
                }).length} receipts today
              </span>
            </div>

            <div className="p-6">
              {(() => {
                const today = new Date();
                const todayReceipts = goodsReceipts.filter(grn => {
                  const receivedDate = grn.receivedAt ? new Date(grn.receivedAt) : null;
                  return receivedDate && 
                    receivedDate.getDate() === today.getDate() &&
                    receivedDate.getMonth() === today.getMonth() &&
                    receivedDate.getFullYear() === today.getFullYear();
                });

                if (todayReceipts.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">No materials received today yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Receipts will appear here when store receives goods</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {todayReceipts.map((grn) => (
                      <motion.div
                        key={grn.id}
                        className="p-4 rounded-xl bg-white/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-emerald-400">{grn.grnNumber || 'GRN'}</span>
                              <span className="text-zinc-500">•</span>
                              <span className="text-blue-400 text-sm">{grn.poNumber || ''}</span>
                            </div>
                            <p className="text-sm text-zinc-400 mt-0.5">
                              From: <span className="text-white">{grn.vendorName || 'Unknown Vendor'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-400">
                              ₹{(grn.totalReceivedValue || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {grn.receivedAt ? new Date(grn.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                        </div>

                        {/* Items received */}
                        <div className="flex flex-wrap gap-2">
                          {(grn.items || []).slice(0, 5).map((item, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-emerald-500/10 px-2 py-1 rounded-lg text-emerald-300 border border-emerald-500/20"
                            >
                              {item.itemName || 'Item'}: {item.receivedQty || 0} {item.unit || ''}
                            </span>
                          ))}
                          {(grn.items || []).length > 5 && (
                            <span className="text-xs text-zinc-500">
                              +{(grn.items || []).length - 5} more
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-zinc-500">
                            Received by: <span className="text-white">{grn.receivedByName || grn.receivedBy || 'Store'}</span>
                          </span>
                          {grn.invoiceNumber && (
                            <span className="text-zinc-500">
                              Invoice: <span className="text-zinc-300">{grn.invoiceNumber}</span>
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Summary */}
                    <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-400 font-medium">Today&apos;s Total Received Value</span>
                        <span className="text-xl font-bold text-emerald-400">
                          ₹{todayReceipts.reduce((sum, grn) => sum + (grn.totalReceivedValue || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>

        {/* ════════════════════ ACTIVITY SECTION ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-8">
          <motion.div 
            className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Recent Activity</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Latest updates from production floor</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Feed
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {ACTIVITIES.map((activity, i) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="px-6 py-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${
                    activity.type === 'success' ? 'bg-emerald-500' :
                    activity.type === 'warning' ? 'bg-amber-500' :
                    activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{activity.text}</p>
                    <p className="text-xs text-zinc-600 mt-1">{activity.dept} • {activity.time}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase ${
                    activity.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                    activity.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    activity.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {activity.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer 
          variants={fadeInUp}
          className="mt-10 pt-6 border-t border-white/[0.04] flex items-center justify-between text-xs text-zinc-600"
        >
          <span>© 2026 TrioVision International • Composites ERP System</span>
          <span>Last updated: {timeString}</span>
        </motion.footer>
      </motion.div>

      {/* ════════════════════ MODALS (Production Sheds Only) ════════════════════ */}
      <AnimatePresence>
        {activeModal === "shed1" && (
          <ProductionShedModal 
            shedId="shed1"
            name="Production Shed 1"
            color="violet"
            projects={getShedProjects("shed1")}
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === "shed2" && (
          <ProductionShedModal 
            shedId="shed2"
            name="Production Shed 2"
            color="emerald"
            projects={getShedProjects("shed2")}
            onClose={() => setActiveModal(null)} 
          />
        )}

        {/* ════════════════════ ORDER DETAILS MODAL ════════════════════ */}
        {showOrderDetails && selectedOrder && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowOrderDetails(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            
            <motion.div
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-zinc-900 border border-amber-500/30 shadow-2xl"
            >
              {/* Header */}
              <div className="relative px-8 py-6 bg-gradient-to-b from-amber-500/20 to-transparent border-b border-white/10">
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
                
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-white">{selectedOrder.poNumber}</h2>
                      <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold">
                        PENDING APPROVAL
                      </span>
                    </div>
                    <p className="text-zinc-500 mt-1">
                      Created on {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-6 mt-6">
                  <div className="px-4 py-2 rounded-xl bg-white/5">
                    <span className="text-sm text-zinc-400">Total Items</span>
                    <span className="ml-2 text-lg font-semibold text-white">{selectedOrder.items?.length || 0}</span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white/5">
                    <span className="text-sm text-zinc-400">Total Quantity</span>
                    <span className="ml-2 text-lg font-semibold text-cyan-400">
                      {selectedOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} units
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-sm text-zinc-400">Total Amount</span>
                    <span className="ml-2 text-lg font-semibold text-emerald-400">
                      ₹{selectedOrder.totalAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Vendor Information */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Vendor / Supplier Details
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-2xl font-semibold text-white">{selectedOrder.vendorDetails?.name || 'N/A'}</p>
                      <p className="text-sm text-zinc-500 mt-1">Supplier Name</p>
                    </div>
                    <div className="space-y-3">
                      {selectedOrder.vendorDetails?.contact && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-zinc-500" />
                          <span className="text-zinc-300">{selectedOrder.vendorDetails.contact}</span>
                          <span className="text-zinc-600">• Contact Person</span>
                        </div>
                      )}
                      {selectedOrder.vendorDetails?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-zinc-500" />
                          <span className="text-zinc-300">{selectedOrder.vendorDetails.phone}</span>
                        </div>
                      )}
                      {selectedOrder.vendorDetails?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-zinc-500" />
                          <span className="text-zinc-300">{selectedOrder.vendorDetails.email}</span>
                        </div>
                      )}
                      {selectedOrder.vendorDetails?.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                          <span className="text-zinc-300">{selectedOrder.vendorDetails.address}, {selectedOrder.vendorDetails.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedOrder.vendorDetails?.gstin && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <span className="text-xs text-zinc-500">GSTIN: </span>
                      <span className="text-sm font-mono text-zinc-300">{selectedOrder.vendorDetails.gstin}</span>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Order Items ({selectedOrder.items?.length || 0})
                  </h3>
                  <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white/[0.03]">
                          <th className="text-left text-xs font-semibold text-zinc-500 uppercase px-4 py-3">Item</th>
                          <th className="text-center text-xs font-semibold text-zinc-500 uppercase px-4 py-3">Quantity</th>
                          <th className="text-right text-xs font-semibold text-zinc-500 uppercase px-4 py-3">Unit Price</th>
                          <th className="text-right text-xs font-semibold text-zinc-500 uppercase px-4 py-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {selectedOrder.items?.map((item, index) => (
                          <tr key={index} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-white">{item.itemName}</p>
                              {item.itemCode && <p className="text-xs text-zinc-500">{item.itemCode}</p>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm text-zinc-300">{item.quantity}</span>
                              <span className="text-xs text-zinc-500 ml-1">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-zinc-400">
                              ₹{item.unitPrice?.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                              ₹{item.totalPrice?.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-500/10 border-t border-emerald-500/20">
                          <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-zinc-300">
                            Grand Total
                          </td>
                          <td className="px-4 py-3 text-right text-lg font-bold text-emerald-400">
                            ₹{selectedOrder.totalAmount?.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Approval Threshold Info */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">MD Approval Required</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        All Purchase Orders require MD approval before processing
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Notes</h4>
                    <p className="text-sm text-zinc-300">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* MD Signature for Approval */}
                {!actionSuccess && (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <label className="text-sm font-medium text-cyan-400 mb-2 block">
                      MD Signature / Name (Required for Approval)
                    </label>
                    <input
                      type="text"
                      value={mdSignature}
                      onChange={(e) => setMdSignature(e.target.value)}
                      placeholder="Enter your name to approve"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}

                {/* Success Message */}
                {actionSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-xl border ${
                      actionSuccess === 'approved' 
                        ? 'bg-emerald-500/20 border-emerald-500/30' 
                        : 'bg-red-500/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`w-6 h-6 ${actionSuccess === 'approved' ? 'text-emerald-400' : 'text-red-400'}`} />
                      <div>
                        <p className={`font-semibold ${actionSuccess === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                          Order {actionSuccess === 'approved' ? 'Approved' : 'Rejected'} Successfully!
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">This window will close automatically...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-zinc-500">
                    Created by: <span className="text-zinc-300">{selectedOrder.createdBy || 'Purchase Team'}</span>
                  </div>
                </div>
                
                {!actionSuccess && (
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setShowOrderDetails(false)}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Close
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isRejecting}
                      className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X className="w-4 h-4" />
                      Reject Order
                    </motion.button>
                    
                    <motion.button
                      onClick={handleApproveOrder}
                      disabled={isApproving || !mdSignature.trim()}
                      className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isApproving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve Order
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Rejection Reason Modal */}
        {showRejectModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-red-500/30 p-6 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Reject Order</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Please provide a reason for rejecting {selectedOrder.poNumber}
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 resize-none"
              />
              
              <div className="flex gap-3 mt-4">
                <motion.button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleRejectOrder}
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isRejecting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Rejecting...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOOLING CARD COMPONENT (All Departments) - Links to separate page
// ═══════════════════════════════════════════════════════════════
const ToolingCard = () => {
  const totalStaff = ALL_DEPARTMENTS.reduce((sum, d) => sum + d.employees, 0);
  const activeStaff = ALL_DEPARTMENTS.reduce((sum, d) => sum + d.active, 0);
  const runningDepts = ALL_DEPARTMENTS.filter(d => d.status === "running").length;
  const avgEfficiency = Math.round(
    ALL_DEPARTMENTS.filter(d => d.efficiency > 0).reduce((sum, d) => sum + d.efficiency, 0) / 
    Math.max(ALL_DEPARTMENTS.filter(d => d.efficiency > 0).length, 1)
  );

  return (
    <Link href="/md/tooling">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        whileHover={{ y: -8, transition: { type: "spring", stiffness: 400 } }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-500/30 hover:border-cyan-400/60 backdrop-blur-2xl cursor-pointer transition-all duration-300 group"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <motion.div 
              className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
              whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
            >
              <Cog className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300">
              All Departments
            </span>
          </div>

          <h3 className="text-2xl font-semibold text-white mb-1">Tooling</h3>
          <p className="text-sm text-zinc-500">Master control center for all departments</p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/10">
            <div>
              <p className="text-3xl font-bold text-white">{ALL_DEPARTMENTS.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Total Depts</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400">{runningDepts}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Running</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">{activeStaff}/{totalStaff} staff</span>
            </div>
            <span className={`text-lg font-bold ${avgEfficiency >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {avgEfficiency}% avg
            </span>
          </div>

          <motion.div 
            className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-zinc-500"
            animate={{ x: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <span>Open Page</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION SHED CARD COMPONENT (Projects)
// ═══════════════════════════════════════════════════════════════
interface ProductionShedCardProps {
  shedId: "shed1" | "shed2";
  name: string;
  color: "violet" | "emerald";
  projects: Project[];
  onClick: () => void;
}

const ProductionShedCard = ({ shedId, name, color, projects, onClick }: ProductionShedCardProps) => {
  const activeProjects = projects.filter(p => p.status === "active").length;
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;
  const sharedCount = projects.filter(p => p.sheds.length === 2).length;
  const highPriorityCount = projects.filter(p => p.priority === "high").length;

  const colorStyles = {
    violet: {
      gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
      border: "border-violet-500/30 hover:border-violet-400/60",
      glow: "bg-violet-500/30",
      icon: "text-violet-400",
      badge: "bg-violet-500/20 text-violet-300",
    },
    emerald: {
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      border: "border-emerald-500/30 hover:border-emerald-400/60",
      glow: "bg-emerald-500/30",
      icon: "text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-300",
    }
  };
  const styles = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shedId === "shed1" ? 0.3 : 0.4, duration: 0.5 }}
      whileHover={{ y: -8, transition: { type: "spring", stiffness: 400 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${styles.gradient} border ${styles.border} backdrop-blur-2xl cursor-pointer transition-all duration-300 group`}
    >
      <div className={`absolute -top-20 -right-20 w-40 h-40 ${styles.glow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
            whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
          >
            {shedId === "shed1" ? (
              <Factory className={`w-8 h-8 ${styles.icon}`} />
            ) : (
              <Building2 className={`w-8 h-8 ${styles.icon}`} />
            )}
          </motion.div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
              {projects.length} Projects
            </span>
            {highPriorityCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                {highPriorityCount} High Priority
              </span>
            )}
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-1">{name}</h3>
        <p className="text-sm text-zinc-500">Active project production work</p>
        
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{activeProjects}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Active</p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className={`text-2xl font-bold ${avgProgress >= 70 ? 'text-emerald-400' : avgProgress >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {avgProgress}%
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Avg Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{sharedCount}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Shared</p>
          </div>
        </div>

        {/* Project Pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          {projects.slice(0, 3).map((project) => (
            <span 
              key={project.id}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                project.status === 'on-hold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {project.code}
            </span>
          ))}
          {projects.length > 3 && (
            <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white/5 text-zinc-400">
              +{projects.length - 3} more
            </span>
          )}
        </div>

        <motion.div 
          className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-zinc-500"
          animate={{ x: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <span>View Projects</span>
          <ArrowRight className="w-4 h-4" />
        </motion.div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION SHED MODAL (Projects)
// ═══════════════════════════════════════════════════════════════
interface ProductionShedModalProps {
  shedId: "shed1" | "shed2";
  name: string;
  color: "violet" | "emerald";
  projects: Project[];
  onClose: () => void;
}

const ProductionShedModal = ({ shedId, name, color, projects, onClose }: ProductionShedModalProps) => {
  const colorStyles = {
    violet: { icon: "text-violet-400", header: "from-violet-500/20 to-transparent", border: "border-violet-500/30" },
    emerald: { icon: "text-emerald-400", header: "from-emerald-500/20 to-transparent", border: "border-emerald-500/30" },
  };
  const styles = colorStyles[color];

  const activeCount = projects.filter(p => p.status === "active").length;
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <motion.div
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-zinc-900 border ${styles.border} shadow-2xl`}
      >
        <div className={`relative px-8 py-6 bg-gradient-to-b ${styles.header} border-b border-white/10`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              {shedId === "shed1" ? (
                <Factory className={`w-8 h-8 ${styles.icon}`} />
              ) : (
                <Building2 className={`w-8 h-8 ${styles.icon}`} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{name}</h2>
              <p className="text-zinc-500 mt-1">{projects.length} Projects • Production Work</p>
            </div>
          </div>

          <div className="flex gap-6 mt-6">
            <div className="px-4 py-2 rounded-xl bg-white/5">
              <span className="text-sm text-zinc-400">Active Projects</span>
              <span className="ml-2 text-lg font-semibold text-emerald-400">{activeCount}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/5">
              <span className="text-sm text-zinc-400">Avg Progress</span>
              <span className={`ml-2 text-lg font-semibold ${avgProgress >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{avgProgress}%</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/5">
              <span className="text-sm text-zinc-400">Shared with other shed</span>
              <span className="ml-2 text-lg font-semibold text-blue-400">
                {projects.filter(p => p.sheds.length === 2).length}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Projects</h3>
          <div className="space-y-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-semibold text-white">{project.name}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
                        project.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        project.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {project.priority}
                      </span>
                      {project.sheds.length === 2 && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase bg-blue-500/20 text-blue-400">
                          Shared
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">{project.code} • {project.client}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    project.status === 'on-hold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {project.status === 'active' ? 'Active' : project.status === 'on-hold' ? 'On Hold' : 'Completed'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-500">Progress</span>
                    <span className={`font-semibold ${
                      project.progress >= 70 ? 'text-emerald-400' : 
                      project.progress >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                      className={`h-full rounded-full ${
                        project.progress >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                        project.progress >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                        'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Assigned Departments & Deadline */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">Depts:</span>
                    <div className="flex gap-1">
                      {project.assignedDepts.slice(0, 3).map((dept, j) => (
                        <span key={j} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-zinc-400">
                          {dept.split(' ')[0]}
                        </span>
                      ))}
                      {project.assignedDepts.length > 3 && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-zinc-500">
                          +{project.assignedDepts.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{project.deadline}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface KPICardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  sub: string;
  color: "cyan" | "emerald" | "violet" | "amber";
  trend?: number;
  delay: number;
}

const KPICard = ({ icon: Icon, value, label, sub, color, trend, delay }: KPICardProps) => {
  const colorStyles = {
    cyan: { bg: "from-cyan-500/10 to-cyan-500/5", border: "border-cyan-500/20 hover:border-cyan-500/40", icon: "bg-cyan-500/15 text-cyan-400", glow: "bg-cyan-500/20" },
    emerald: { bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/20 hover:border-emerald-500/40", icon: "bg-emerald-500/15 text-emerald-400", glow: "bg-emerald-500/20" },
    violet: { bg: "from-violet-500/10 to-violet-500/5", border: "border-violet-500/20 hover:border-violet-500/40", icon: "bg-violet-500/15 text-violet-400", glow: "bg-violet-500/20" },
    amber: { bg: "from-amber-500/10 to-amber-500/5", border: "border-amber-500/20 hover:border-amber-500/40", icon: "bg-amber-500/15 text-amber-400", glow: "bg-amber-500/20" },
  };
  const c = colorStyles[color];

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
      className={`relative overflow-hidden p-5 lg:p-6 rounded-3xl bg-gradient-to-br ${c.bg} border ${c.border} backdrop-blur-2xl transition-all duration-300 group`}
    >
      <div className={`absolute -top-16 -right-16 w-32 h-32 ${c.glow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl ${c.icon} flex items-center justify-center`}
            whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
          >
            <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
          </motion.div>
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <motion.p 
          className="text-3xl lg:text-4xl font-bold text-white mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2 }}
        >
          {value}
        </motion.p>
        <p className="text-sm text-zinc-300 font-medium">{label}</p>
        <p className="text-xs text-zinc-500 mt-1">{sub}</p>
      </div>
    </motion.div>
  );
};

const StatusLegend = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-2 text-zinc-500">
    <span className={`w-2.5 h-2.5 rounded-full bg-${color}-500`}></span>
    {label}
  </span>
);