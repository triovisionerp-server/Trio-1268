'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowDown,
  FileCheck,
  Building2,
  IndianRupee,
  Eye,
  PackageCheck,
  XCircle,
  Warehouse,
  Image as ImageIcon,
  Grid3X3,
  List,
  Home,
  Sparkles,
  ArrowRight,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  onSnapshot, 
  addDoc,
  doc,
  runTransaction
} from 'firebase/firestore';
import { 
  PurchaseOrder, 
  GoodsReceipt,
  GRNItem,
  COLLECTIONS,
  POStatus
} from '@/types/purchase';

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

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } }
};

// Helper function to get greeting based on time
const getGreeting = (hour: number): { greeting: string; emoji: string } => {
  if (hour >= 5 && hour < 12) return { greeting: "Good Morning", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { greeting: "Good Afternoon", emoji: "🌤️" };
  if (hour >= 17 && hour < 21) return { greeting: "Good Evening", emoji: "🌅" };
  return { greeting: "Good Night", emoji: "🌙" };
};

// Helper to get user from localStorage
const getCurrentUserName = (): string => {
  if (typeof window === 'undefined') return 'Store Manager';
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      const fullName = user.displayName || user.name || 'Store Manager';
      return fullName.split(' ')[0];
    } catch {
      return 'Store Manager';
    }
  }
  return 'Store Manager';
};

// Motivational quotes for store managers
const STORE_QUOTES = [
  "Inventory is money sitting around in another form.",
  "The goal is to turn data into information, and information into insight.",
  "Efficiency is doing things right; effectiveness is doing the right things.",
  "What gets measured gets managed.",
  "Quality means doing it right when no one is looking."
];

// Firebase collection name - same as empStore for sync
const FB_MATERIALS = 'inventory_materials';

// Material Item type matching empStore sync
interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier_id?: string;
  supplier_name: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  unit: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// STORE PAGE - INVENTORY + INCOMING ORDERS
// ==========================================

export default function StorePage() {
  const router = useRouter();
  
  // State for data
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<'inventory' | 'incoming' | 'grn'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // GRN Form state
  const [receivedItems, setReceivedItems] = useState<GRNItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Personalization State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('Store Manager');
  const [dailyQuote] = useState(() => STORE_QUOTES[Math.floor(Math.random() * STORE_QUOTES.length)]);

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get user name on mount
  useEffect(() => {
    setUserName(getCurrentUserName());
  }, []);

  // Get greeting info
  const hour = currentTime.getHours();
  const { greeting, emoji } = getGreeting(hour);
  const today = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  const timeString = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });

  // ==========================================
  // FIREBASE LISTENERS
  // ==========================================

  useEffect(() => {
    // Listen to Materials (same collection as empStore)
    const unsubMaterials = onSnapshot(
      collection(db, FB_MATERIALS),
      (snapshot) => {
        const items: MaterialItem[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as MaterialItem[];
        // Sort by name
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMaterials(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to materials:', error);
        setLoading(false);
      }
    );

    // Listen to Approved Purchase Orders (Incoming)
    const unsubPO = onSnapshot(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      (snapshot) => {
        const orders: PurchaseOrder[] = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() })) as PurchaseOrder[];
        // Filter to only show approved/partially received orders
        const incoming = orders.filter(po => 
          po.status === 'approved' || po.status === 'partially_received'
        );
        // Sort by createdAt
        incoming.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setIncomingOrders(incoming);
      },
      (error) => {
        console.error('Error listening to POs:', error);
      }
    );

    // Listen to GRNs
    const unsubGRN = onSnapshot(
      collection(db, COLLECTIONS.GOODS_RECEIPTS),
      (snapshot) => {
        const grns: GoodsReceipt[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as GoodsReceipt[];
        // Sort by receivedAt
        grns.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
        setGoodsReceipts(grns);
      },
      (error) => {
        console.error('Error listening to GRNs:', error);
      }
    );

    return () => {
      unsubMaterials();
      unsubPO();
      unsubGRN();
    };
  }, []);

  // ==========================================
  // STATS
  // ==========================================

  const categories = ['All', ...new Set(materials.map(m => m.category).filter(Boolean))];

  const stats = {
    totalItems: materials.length,
    lowStock: materials.filter(item => item.current_stock <= item.min_stock).length,
    totalValue: materials.reduce((sum, item) => sum + (item.current_stock * (item.purchase_price || 0)), 0),
    incomingOrders: incomingOrders.length,
    pendingReceive: incomingOrders.filter(po => po.status === 'approved').length
  };

  // ==========================================
  // GENERATE GRN NUMBER
  // ==========================================

  const generateGRNNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `GRN-${year}${month}-${random}`;
  };

  // ==========================================
  // START RECEIVING ORDER
  // ==========================================

  const handleStartReceive = (order: PurchaseOrder) => {
    // Check if order can be received
    if (order.status === 'pending_md_approval') {
      alert('This order is pending MD approval. Cannot receive yet.');
      return;
    }

    setSelectedOrder(order);
    // Initialize received items from order items
    const items: GRNItem[] = order.items.map(item => ({
      itemID: item.itemID,
      itemName: item.itemName,
      orderedQty: item.quantity,
      receivedQty: item.quantity, // Default to full quantity
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalValue: item.quantity * item.unitPrice,
      qualityStatus: 'pending' as const,
      remarks: ''
    }));
    setReceivedItems(items);
    setShowReceiveModal(true);
  };

  // ==========================================
  // UPDATE RECEIVED QUANTITY
  // ==========================================

  const updateReceivedQty = (index: number, qty: number) => {
    const updated = [...receivedItems];
    updated[index].receivedQty = Math.max(0, Math.min(qty, updated[index].orderedQty));
    setReceivedItems(updated);
  };

  // ==========================================
  // CONFIRM GOODS RECEIPT (GRN)
  // ==========================================

  const handleConfirmReceipt = async () => {
    if (!selectedOrder) return;
    if (!invoiceNumber) {
      alert('Please enter invoice number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use transaction to update inventory atomically
      await runTransaction(db, async (transaction) => {
        // 1. Update inventory stock for each received item
        for (const item of receivedItems) {
          if (item.receivedQty > 0) {
            const materialRef = doc(db, FB_MATERIALS, item.itemID);
            const currentItem = materials.find(i => i.id === item.itemID);
            if (currentItem) {
              const newStock = currentItem.current_stock + item.receivedQty;
              transaction.update(materialRef, { 
                current_stock: newStock,
                updated_at: new Date().toISOString()
              });
            }
          }
        }

        // 2. Check if all items fully received
        const allFullyReceived = receivedItems.every(
          item => item.receivedQty === item.orderedQty
        );

        // 3. Update PO status
        const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, selectedOrder.id);
        transaction.update(poRef, {
          status: allFullyReceived ? 'received' : 'partially_received',
          updatedAt: new Date().toISOString()
        });
      });

      // 4. Create GRN record (outside transaction)
      const totalValue = receivedItems.reduce((sum, item) => {
        const orderItem = selectedOrder.items.find(i => i.itemID === item.itemID);
        return sum + (item.receivedQty * (orderItem?.unitPrice || 0));
      }, 0);

      // Get current user for received by
      const currentUser = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
      let receivedByName = 'Store Manager';
      let receivedById = 'store_manager';
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          receivedByName = user.displayName || user.name || 'Store Manager';
          receivedById = user.uid || user.id || 'store_manager';
        } catch { /* use defaults */ }
      }

      const grn: Omit<GoodsReceipt, 'id'> = {
        grnNumber: generateGRNNumber(),
        poID: selectedOrder.id,
        poNumber: selectedOrder.poNumber,
        vendorId: selectedOrder.vendorDetails.id || '',
        vendorName: selectedOrder.vendorDetails.name,
        items: receivedItems.map(item => ({
          ...item,
          totalValue: item.receivedQty * item.unitPrice,
          qualityStatus: 'passed' as const
        })),
        totalReceivedValue: totalValue,
        receivedBy: receivedById,
        receivedByName: receivedByName,
        receivedAt: new Date().toISOString(),
        status: 'completed',
        invoiceNumber,
        invoiceDate: invoiceDate || undefined,
        remarks: remarks || undefined
      };

      await addDoc(collection(db, COLLECTIONS.GOODS_RECEIPTS), grn);

      // Reset form
      setShowReceiveModal(false);
      setSelectedOrder(null);
      setReceivedItems([]);
      setInvoiceNumber('');
      setInvoiceDate('');
      setRemarks('');

      alert(`Goods received successfully!\nGRN: ${grn.grnNumber}\n\n✅ Stock has been updated.`);

    } catch (error) {
      console.error('Error confirming receipt:', error);
      alert('Failed to confirm receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // VIEW ORDER DETAILS
  // ==========================================

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  // ==========================================
  // FILTER INVENTORY
  // ==========================================

  const filteredMaterials = materials.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ==========================================
  // STATUS BADGE
  // ==========================================

  const getStatusBadge = (status: POStatus) => {
    const badges: Partial<Record<POStatus, { bg: string; text: string; label: string }>> = {
      draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
      pending_md_approval: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending MD' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Ready to Receive' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
      partially_received: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Partial' },
      received: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Received' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' },
      ordered: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Ordered' }
    };
    const badge = badges[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Content */}
      <motion.div 
        className="relative z-10 w-full px-6 lg:px-8 py-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* ════════════════════ TOP NAVIGATION BAR ════════════════════ */}
        <motion.div 
          variants={fadeInUp}
          className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/md')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => router.push('/purchase')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white transition-all shadow-lg shadow-blue-500/20"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-medium">Purchase Hub</span>
            </button>
            <button
              onClick={() => router.push('/empStore')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
            >
              <FileCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Data Entry</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-medium">Live Sync</span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('currentUser');
                router.push('/login');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-all border border-red-500/20"
            >
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </motion.div>

        {/* ════════════════════ PERSONALIZED HEADER - NOTION STYLE ════════════════════ */}
        <motion.header variants={fadeInUp} className="mb-8">
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
                    {greeting}, <span className="font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{userName}</span>
                  </h1>
                  <p className="text-zinc-500 mt-1 flex items-center gap-3">
                    <span>{today}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono text-emerald-400">{timeString}</span>
                  </p>
                </div>
              </motion.div>

              {/* Today's Quick Stats Strip */}
              <motion.div 
                className="flex items-center gap-4 mt-4 flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {stats.pendingReceive > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                    <PackageCheck className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-zinc-300">
                      <span className="font-bold text-green-400">{stats.pendingReceive}</span> orders ready to receive
                    </span>
                  </div>
                )}
                {stats.lowStock > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-zinc-300">
                      <span className="font-bold text-red-400">{stats.lowStock}</span> items low stock
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-300">
                    <span className="font-bold text-blue-400">{stats.totalItems}</span> total items
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-xl border border-purple-500/20">
                  <IndianRupee className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-zinc-300">
                    ₹<span className="font-bold text-purple-400">{(stats.totalValue / 1000).toFixed(1)}K</span> stock value
                  </span>
                </div>
              </motion.div>

              {/* Motivational Quote */}
              <motion.div
                className="mt-4 flex items-center gap-2 text-zinc-500 text-sm italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles className="w-4 h-4 text-amber-400/50" />
                <span>&ldquo;{dailyQuote}&rdquo;</span>
              </motion.div>
            </div>

            {/* Right Side - Warehouse Icon */}
            <motion.div 
              className="hidden lg:flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-3xl border border-emerald-500/30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Warehouse className="w-12 h-12 text-emerald-400" />
            </motion.div>
          </div>
        </motion.header>

        {/* ════════════════════ QUICK ACTIONS ════════════════════ */}
        <motion.div variants={fadeInUp} className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('incoming')}
              className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl text-left hover:border-green-500/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Truck className="w-6 h-6 text-green-400" />
                {stats.pendingReceive > 0 && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                    {stats.pendingReceive}
                  </span>
                )}
              </div>
              <h3 className="font-medium text-white group-hover:text-green-400 transition-colors">Receive Orders</h3>
              <p className="text-xs text-zinc-500 mt-1">Process incoming shipments</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('inventory')}
              className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-2xl text-left hover:border-blue-500/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Package className="w-6 h-6 text-blue-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">View Stock</h3>
              <p className="text-xs text-zinc-500 mt-1">Check current inventory</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('grn')}
              className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 rounded-2xl text-left hover:border-purple-500/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <FileCheck className="w-6 h-6 text-purple-400" />
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full">
                  {goodsReceipts.length}
                </span>
              </div>
              <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">GRN History</h3>
              <p className="text-xs text-zinc-500 mt-1">View receipt records</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/purchase')}
              className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl text-left hover:border-amber-500/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-6 h-6 text-amber-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-medium text-white group-hover:text-amber-400 transition-colors">Create PO</h3>
              <p className="text-xs text-zinc-500 mt-1">New purchase order</p>
            </motion.button>
          </div>
        </motion.div>

        {/* ════════════════════ STATS CARDS ════════════════════ */}
        <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <motion.div 
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-blue-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
                <p className="text-xs text-zinc-500">Total Items</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-red-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.lowStock}</p>
                <p className="text-xs text-zinc-500">Low Stock</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-yellow-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/20 rounded-xl">
                <Truck className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.incomingOrders}</p>
                <p className="text-xs text-zinc-500">Incoming</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/20 rounded-xl">
                <PackageCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pendingReceive}</p>
                <p className="text-xs text-zinc-500">To Receive</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/20 rounded-xl">
                <FileCheck className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{goodsReceipts.length}</p>
                <p className="text-xs text-zinc-500">GRNs</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ════════════════════ TABS ════════════════════ */}
        <motion.div variants={fadeInUp} className="flex gap-2 mb-6">
          {[
            { id: 'incoming', label: 'Incoming Orders', icon: Truck, count: incomingOrders.length, color: 'from-yellow-500 to-orange-500' },
            { id: 'inventory', label: 'Current Stock', icon: Package, count: materials.length, color: 'from-blue-500 to-cyan-500' },
            { id: 'grn', label: 'GRN History', icon: FileCheck, count: goodsReceipts.length, color: 'from-purple-500 to-violet-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </motion.div>

        {/* ════════════════════ TAB CONTENT ════════════════════ */}
        <motion.div variants={fadeInUp} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {/* Incoming Orders Tab */}
        {activeTab === 'incoming' && (
          <div>
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold flex items-center gap-2 text-white">
                <Truck className="w-5 h-5 text-yellow-400" />
                Incoming Purchase Orders
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Approved orders ready to receive. Click &ldquo;Receive&rdquo; to create GRN and update stock.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : incomingOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-10 h-10 text-yellow-400/50" />
                </div>
                <p className="text-white font-medium">No incoming orders</p>
                <p className="text-sm text-zinc-500 mt-1">Approved purchase orders will appear here</p>
                <button
                  onClick={() => router.push('/purchase')}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white text-sm font-medium hover:from-blue-500 hover:to-purple-500 transition-all"
                >
                  Create Purchase Order
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {incomingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-blue-400">{order.poNumber}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {order.vendorDetails.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {order.items.length} items
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            ₹{order.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        {/* Items Preview */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-white/10 px-2 py-1 rounded-lg text-zinc-300"
                            >
                              {item.itemName}: {item.quantity} {item.unit}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-xs text-zinc-500">
                              +{order.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5 text-zinc-400" />
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStartReceive(order)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                          Receive
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div>
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="font-semibold flex items-center gap-2 text-white">
                  <Package className="w-5 h-5 text-blue-400" />
                  Current Stock Levels
                  <span className="text-sm font-normal text-zinc-500">({filteredMaterials.length} items)</span>
                </h2>
                <div className="flex items-center gap-3">
                  {/* Category Filter */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                    ))}
                  </select>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-white placeholder-zinc-500"
                    />
                  </div>
                  {/* View Toggle */}
                  <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-blue-400/50" />
                </div>
                <p className="text-white font-medium">No items found</p>
                <p className="text-sm text-zinc-500 mt-1">Try a different search term or category</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View with Images */
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMaterials.map((item) => {
                  const isLow = item.current_stock <= item.min_stock;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className={`bg-white/5 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all cursor-pointer ${
                        isLow ? 'border-red-500/50 hover:border-red-500' : 'border-white/10 hover:border-blue-500/50'
                      }`}
                    >
                      {/* Image Section */}
                      <div className="aspect-square bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 relative flex items-center justify-center">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-600">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span className="text-xs">No Image</span>
                          </div>
                        )}
                        {/* Category Badge */}
                        <span className="absolute top-2 left-2 px-2.5 py-1 bg-zinc-900/90 backdrop-blur-sm text-xs rounded-full text-zinc-300 border border-white/10">
                          {item.category || 'Uncategorized'}
                        </span>
                        {/* Low Stock Warning */}
                        {isLow && (
                          <span className="absolute top-2 right-2 px-2.5 py-1 bg-red-500 text-xs rounded-full flex items-center gap-1 text-white font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                      </div>
                      {/* Info Section */}
                      <div className="p-4">
                        <h3 className="font-semibold text-sm truncate text-white" title={item.name}>
                          {item.name || 'Unnamed Item'}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">{item.code}</p>
                        <p className="text-xs text-zinc-400 mt-1 truncate">{item.supplier_name}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                          <div>
                            <p className="text-xs text-zinc-500">Stock</p>
                            <p className={`font-bold ${isLow ? 'text-red-400' : 'text-green-400'}`}>
                              {item.current_stock} <span className="text-xs font-normal text-zinc-500">{item.unit}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Price</p>
                            <p className="font-semibold text-blue-400">₹{item.purchase_price || 0}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Image</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Item</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Supplier</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Stock</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Min</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Price</th>
                    <th className="text-center text-xs font-medium text-zinc-400 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMaterials.map((item) => {
                    const isLow = item.current_stock <= item.min_stock;
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center border border-white/10">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{item.name}</div>
                          <div className="text-xs text-zinc-500">{item.code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{item.category}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{item.supplier_name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${isLow ? 'text-red-400' : 'text-green-400'}`}>
                            {item.current_stock}
                          </span>
                          <span className="text-zinc-500 text-sm ml-1">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">
                          {item.min_stock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-blue-400">
                          ₹{item.purchase_price || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                              <CheckCircle className="w-3 h-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {/* GRN History Tab */}
        {activeTab === 'grn' && (
          <div>
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold flex items-center gap-2 text-white">
                <FileCheck className="w-5 h-5 text-purple-400" />
                Goods Receipt Notes (GRN)
              </h2>
              <p className="text-xs text-zinc-500 mt-1">History of all received goods</p>
            </div>

            {goodsReceipts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-10 h-10 text-purple-400/50" />
                </div>
                <p className="text-white font-medium">No GRN records yet</p>
                <p className="text-sm text-zinc-500 mt-1">Receive incoming orders to create GRN</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">GRN Number</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">PO Number</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Vendor</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Invoice</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Value</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {goodsReceipts.map((grn) => (
                    <tr key={grn.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-purple-400">{grn.grnNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-blue-400">{grn.poNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{grn.vendorName}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{grn.invoiceNumber}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-400">
                        ₹{grn.totalReceivedValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        <div className="text-white">{grn.receivedBy}</div>
                        <div className="text-xs">
                          {new Date(grn.receivedAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}
        </motion.div>

      {/* Receive Modal (GRN Creation) */}
      <AnimatePresence>
        {showReceiveModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowReceiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 sticky top-0 bg-zinc-900/95 backdrop-blur-xl z-10 rounded-t-3xl">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <PackageCheck className="w-6 h-6 text-green-400" />
                  Receive Goods - {selectedOrder.poNumber}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Vendor: {selectedOrder.vendorDetails.name}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Invoice Number *</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Enter invoice number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Items to Receive */}
                <div>
                  <h3 className="font-medium mb-3 text-white">Items to Receive</h3>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="text-left px-4 py-3 text-zinc-400">Item</th>
                          <th className="text-right px-4 py-3 text-zinc-400">Ordered</th>
                          <th className="text-right px-4 py-3 text-zinc-400">Receiving</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {receivedItems.map((item, index) => (
                          <tr key={index} className="hover:bg-white/5">
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">{item.itemName}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-400">
                              {item.orderedQty} {item.unit}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.receivedQty}
                                onChange={(e) => updateReceivedQty(index, parseFloat(e.target.value) || 0)}
                                max={item.orderedQty}
                                min={0}
                                className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                              />
                              <span className="text-zinc-400 text-sm ml-2">{item.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Remarks (Optional)</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any notes about this receipt..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none text-white placeholder-zinc-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-zinc-900/95 backdrop-blur-xl sticky bottom-0 flex justify-end gap-3 rounded-b-3xl">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-6 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReceipt}
                  disabled={isSubmitting || !invoiceNumber}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg shadow-green-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Receipt
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Order Modal */}
      <AnimatePresence>
        {showViewModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedOrder.poNumber}</h2>
                    <p className="text-sm text-zinc-400">
                      Created: {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
                    <Building2 className="w-4 h-4 text-blue-400" /> Vendor
                  </h3>
                  <p className="text-lg text-white">{selectedOrder.vendorDetails.name}</p>
                  <p className="text-sm text-zinc-400">{selectedOrder.vendorDetails.city}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-white">Order Items</h3>
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-3 py-3 text-zinc-400">Item</th>
                        <th className="text-right px-3 py-3 text-zinc-400">Qty</th>
                        <th className="text-right px-3 py-3 text-zinc-400">Price</th>
                        <th className="text-right px-3 py-3 text-zinc-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="px-3 py-2.5 text-white">{item.itemName}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">₹{item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-white">₹{item.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-white/5">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-right font-bold text-white">Total:</td>
                        <td className="px-3 py-3 text-right font-bold text-green-400">
                          ₹{selectedOrder.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-zinc-300 font-medium border border-white/10"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleStartReceive(selectedOrder);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-green-500/20"
                >
                  <ArrowDown className="w-4 h-4" />
                  Receive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
