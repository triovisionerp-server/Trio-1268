'use client';

// ==========================================
// DYNAMIC INTEGRATED PURCHASE MANAGEMENT
// ==========================================
// Connected to: Store ↔ Supervisor ↔ Purchase ↔ MD
// Real-time Firebase sync across all modules

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Send,
  RefreshCw,
  ChevronRight,
  IndianRupee,
  Bell,
  X,
  Check,
  ArrowRight,
  PackageCheck,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Boxes,
  Printer,
  ArrowUpRight,
  Link2,
  Sparkles
} from 'lucide-react';

// Services
import {
  MD_APPROVAL_THRESHOLD,
  formatCurrency,
  // Types
  MaterialRequest,
  PurchaseRequisition,
  PurchaseOrder,
  GoodsReceipt,
  PurchaseInvoice,
  Notification,
  DashboardStats,
  // Subscriptions
  subscribeToMaterialRequests,
  subscribeToPRs,
  subscribeToPOs,
  subscribeToGRNs,
  subscribeToInvoices,
  subscribeToMaterials,
  subscribeToSuppliers,
  subscribeToNotifications,
  subscribeToDashboardStats,
  subscribeToLowStockMaterials,
  subscribeToPendingMDApprovals,
  // Actions
  approveMaterialRequest,
  convertRequestToPR,
  markPOAsOrdered,
  updateMaterialStock,
  updateInvoiceStatus,
  markNotificationRead,
} from '@/lib/services/integratedProcurementService';

// ==========================================
// ANIMATION VARIANTS
// ==========================================
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

// ==========================================
// TYPE DEFINITIONS
// ==========================================
type TabType = 'overview' | 'requests' | 'requisitions' | 'orders' | 'receipts' | 'invoices';

interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  purchase_price: number;
  supplier_name?: string;
  supplier_id?: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  gst?: string;
  address?: string;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PurchaseDynamic() {
  // ==========================================
  // STATE
  // ==========================================
  
  // Data states
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [materials, setMaterials] = useState<Material[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Material[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PurchaseOrder[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Modal states
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCreatePRModal, setShowCreatePRModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MaterialRequest | PurchaseRequisition | PurchaseOrder | GoodsReceipt | PurchaseInvoice | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Current user (from localStorage)
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', role: '' });
  
  // ==========================================
  // EFFECTS - Data Loading
  // ==========================================
  
  useEffect(() => {
    // Get current user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser({
          id: user.uid || user.id || '',
          name: user.name || user.displayName || 'Unknown',
          role: user.role || 'purchase',
        });
      } catch {
        setCurrentUser({ id: 'system', name: 'System User', role: 'purchase' });
      }
    }
    
    // Subscribe to all data streams
    const unsubscribers: (() => void)[] = [];
    
    // Material Requests (from Supervisor/Store)
    unsubscribers.push(
      subscribeToMaterialRequests((data) => {
        setMaterialRequests(data);
        setLoading(false);
      })
    );
    
    // Purchase Requisitions
    unsubscribers.push(
      subscribeToPRs((data) => {
        setPurchaseRequisitions(data);
      })
    );
    
    // Purchase Orders
    unsubscribers.push(
      subscribeToPOs((data) => {
        setPurchaseOrders(data);
      })
    );
    
    // Goods Receipts
    unsubscribers.push(
      subscribeToGRNs((data) => {
        setGoodsReceipts(data);
      })
    );
    
    // Invoices
    unsubscribers.push(
      subscribeToInvoices((data) => {
        setInvoices(data);
      })
    );
    
    // Materials
    unsubscribers.push(
      subscribeToMaterials((data) => {
        setMaterials(data as unknown as Material[]);
      })
    );
    
    // Suppliers
    unsubscribers.push(
      subscribeToSuppliers((data) => {
        setSuppliers(data as unknown as Supplier[]);
      })
    );
    
    // Notifications
    unsubscribers.push(
      subscribeToNotifications((data) => {
        setNotifications(data);
      }, currentUser.role)
    );
    
    // Dashboard Stats
    unsubscribers.push(
      subscribeToDashboardStats((data) => {
        setDashboardStats(data);
      })
    );
    
    // Low Stock Items
    unsubscribers.push(
      subscribeToLowStockMaterials((data) => {
        setLowStockItems(data as unknown as Material[]);
      })
    );
    
    // Pending MD Approvals
    unsubscribers.push(
      subscribeToPendingMDApprovals((data) => {
        setPendingApprovals(data);
      })
    );
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser.role]);
  
  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead).length,
    [notifications]
  );
  
  const tabs = useMemo(() => [
    { 
      id: 'overview' as TabType, 
      label: 'Overview', 
      icon: TrendingUp,
      count: null 
    },
    { 
      id: 'requests' as TabType, 
      label: 'Material Requests', 
      icon: ClipboardList,
      count: materialRequests.filter(r => r.status === 'pending').length 
    },
    { 
      id: 'requisitions' as TabType, 
      label: 'Purchase Requisitions', 
      icon: FileText,
      count: purchaseRequisitions.filter(p => p.status === 'submitted').length 
    },
    { 
      id: 'orders' as TabType, 
      label: 'Purchase Orders', 
      icon: ShoppingCart,
      count: purchaseOrders.filter(p => p.status === 'pending_md_approval').length 
    },
    { 
      id: 'receipts' as TabType, 
      label: 'Goods Receipt', 
      icon: PackageCheck,
      count: goodsReceipts.filter(g => g.status === 'pending').length 
    },
    { 
      id: 'invoices' as TabType, 
      label: 'Invoices', 
      icon: Receipt,
      count: invoices.filter(i => i.status === 'pending').length 
    },
  ], [materialRequests, purchaseRequisitions, purchaseOrders, goodsReceipts, invoices]);
  
  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handleApproveRequest = async (request: MaterialRequest) => {
    try {
      setIsSubmitting(true);
      await approveMaterialRequest(request.id, currentUser.id, currentUser.name);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConvertToPR = async (request: MaterialRequest) => {
    try {
      setIsSubmitting(true);
      await convertRequestToPR(request, currentUser.id, currentUser.name);
      alert(`Material Request converted to PR successfully!`);
    } catch (error) {
      console.error('Error converting to PR:', error);
      alert('Failed to convert to PR');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleViewDetails = (item: unknown, type: string) => {
    setSelectedItem(item as MaterialRequest | PurchaseRequisition | PurchaseOrder | GoodsReceipt | PurchaseInvoice);
    setSelectedItemType(type);
    setShowViewModal(true);
  };
  
  // ==========================================
  // RENDER - Overview Tab
  // ==========================================
  
  const renderOverview = () => (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-400/70 text-sm font-medium">Material Requests</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboardStats?.materialRequests.pending || 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {dashboardStats?.materialRequests.total || 0} total
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-orange-400">From Supervisor & Store</span>
            <ArrowUpRight className="w-3 h-3 text-orange-400" />
          </div>
        </motion.div>
        
        {/* Active PRs */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-400/70 text-sm font-medium">Purchase Requisitions</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboardStats?.purchaseRequisitions.submitted || 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {dashboardStats?.purchaseRequisitions.inProgress || 0} in progress
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </motion.div>
        
        {/* PO Value */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-400/70 text-sm font-medium">PO Value (This Month)</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(dashboardStats?.purchaseOrders.totalValue || 0)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {dashboardStats?.purchaseOrders.total || 0} orders
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </motion.div>
        
        {/* Pending Approvals */}
        <motion.div
          variants={fadeInUp}
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-400/70 text-sm font-medium">Pending MD Approval</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboardStats?.purchaseOrders.pendingApproval || 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Above {formatCurrency(MD_APPROVAL_THRESHOLD)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Material Requests */}
        <motion.div
          variants={fadeInUp}
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Pending Material Requests</h3>
                <p className="text-xs text-zinc-500">From Supervisor & Store pages</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('requests')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
          
          <div className="divide-y divide-zinc-800">
            {materialRequests.filter(r => r.status === 'pending').slice(0, 5).map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-blue-400">{request.requestNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                        request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.urgency.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                        {request.requestedByRole}
                      </span>
                    </div>
                    <p className="text-white font-medium mt-1">{request.requestedByName}</p>
                    <p className="text-zinc-500 text-sm">{request.department} • {request.items.length} items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleViewDetails(request, 'request')}
                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-zinc-400" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleConvertToPR(request)}
                      disabled={isSubmitting}
                      className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-green-400" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {materialRequests.filter(r => r.status === 'pending').length === 0 && (
              <div className="p-8 text-center">
                <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">No pending material requests</p>
                <p className="text-zinc-600 text-sm mt-1">Requests from Supervisor & Store will appear here</p>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Low Stock Alert */}
          <motion.div
            variants={fadeInUp}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Low Stock Alert</h3>
                <p className="text-xs text-zinc-500">{lowStockItems.length} items need reorder</p>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="p-3 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 text-sm font-medium">{item.current_stock} {item.unit}</p>
                      <p className="text-xs text-zinc-500">Min: {item.min_stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          
          {/* Pending MD Approvals */}
          <motion.div
            variants={fadeInUp}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Awaiting MD Approval</h3>
                <p className="text-xs text-zinc-500">{pendingApprovals.length} POs pending</p>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {pendingApprovals.slice(0, 5).map((po) => (
                <div key={po.id} className="p-3 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-400 font-mono text-sm">{po.poNumber}</p>
                      <p className="text-xs text-zinc-500">{po.vendorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(po.totalAmount)}</p>
                      <p className="text-xs text-yellow-400">Pending</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {pendingApprovals.length === 0 && (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">No pending approvals</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <motion.div
        variants={fadeInUp}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">Recent Purchase Orders</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                <th className="p-3 font-medium">PO Number</th>
                <th className="p-3 font-medium">Vendor</th>
                <th className="p-3 font-medium">Items</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {purchaseOrders.slice(0, 10).map((po) => (
                <tr key={po.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3">
                    <span className="font-mono text-blue-400">{po.poNumber}</span>
                  </td>
                  <td className="p-3">
                    <p className="text-white">{po.vendorName}</p>
                  </td>
                  <td className="p-3 text-zinc-400">{po.items.length} items</td>
                  <td className="p-3 text-white font-medium">{formatCurrency(po.totalAmount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                      po.status === 'received' ? 'bg-blue-500/20 text-blue-400' :
                      po.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {po.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400 text-sm">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleViewDetails(po, 'order')}
                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg inline-flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-zinc-400" />
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
  
  // ==========================================
  // RENDER - Material Requests Tab
  // ==========================================
  
  const renderRequests = () => {
    const filteredRequests = materialRequests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          r.requestNumber.toLowerCase().includes(search) ||
          r.requestedByName.toLowerCase().includes(search) ||
          r.department.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="converted_to_pr">Converted to PR</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        
        {/* Requests List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">Request #</th>
                  <th className="p-4 font-medium">Requested By</th>
                  <th className="p-4 font-medium">Department</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Urgency</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRequests.map((request) => (
                  <motion.tr
                    key={request.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{request.requestNumber}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-white">{request.requestedByName}</p>
                        <p className="text-xs text-zinc-500">{request.requestedByRole}</p>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{request.department}</td>
                    <td className="p-4 text-zinc-400">{request.items.length} items</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                        request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.urgency.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        request.status === 'converted_to_pr' ? 'bg-blue-500/20 text-blue-400' :
                        request.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {request.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(request, 'request')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {request.status === 'pending' && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleApproveRequest(request)}
                              disabled={isSubmitting}
                              className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                              title="Approve"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleConvertToPR(request)}
                              disabled={isSubmitting}
                              className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center"
                              title="Convert to PR"
                            >
                              <ArrowRight className="w-4 h-4 text-blue-400" />
                            </motion.button>
                          </>
                        )}
                        
                        {request.status === 'converted_to_pr' && request.linkedPRNumber && (
                          <span className="text-xs text-blue-400 font-mono">
                            → {request.linkedPRNumber}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No material requests found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Purchase Requisitions Tab
  // ==========================================
  
  const renderRequisitions = () => {
    const filteredPRs = purchaseRequisitions.filter(pr => {
      if (filterStatus !== 'all' && pr.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          pr.prNumber.toLowerCase().includes(search) ||
          pr.createdByName.toLowerCase().includes(search) ||
          (pr.department && pr.department.toLowerCase().includes(search))
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search PRs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="enquiry_sent">Enquiry Sent</option>
              <option value="quotes_received">Quotes Received</option>
              <option value="po_created">PO Created</option>
            </select>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreatePRModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Create PR
          </motion.button>
        </div>
        
        {/* PRs Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">PR Number</th>
                  <th className="p-4 font-medium">Source</th>
                  <th className="p-4 font-medium">Department</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Est. Amount</th>
                  <th className="p-4 font-medium">Priority</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Required By</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredPRs.map((pr) => (
                  <motion.tr
                    key={pr.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{pr.prNumber}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {pr.sourceType === 'material_request' && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            MR
                          </span>
                        )}
                        {pr.sourceType === 'stock_alert' && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                            Low Stock
                          </span>
                        )}
                        {pr.sourceType === 'manual' && (
                          <span className="px-2 py-0.5 bg-zinc-500/20 text-zinc-400 rounded text-xs">
                            Manual
                          </span>
                        )}
                        {pr.sourceNumber && (
                          <span className="text-xs text-zinc-500">{pr.sourceNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{pr.department || '-'}</td>
                    <td className="p-4 text-zinc-400">{pr.items.length} items</td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(pr.totalEstimatedAmount)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pr.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        pr.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        pr.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {pr.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pr.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                        pr.status === 'enquiry_sent' ? 'bg-purple-500/20 text-purple-400' :
                        pr.status === 'quotes_received' ? 'bg-yellow-500/20 text-yellow-400' :
                        pr.status === 'po_created' ? 'bg-green-500/20 text-green-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {pr.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(pr.requiredDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(pr, 'requisition')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {pr.status === 'submitted' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center"
                            title="Send Enquiry"
                          >
                            <Send className="w-4 h-4 text-blue-400" />
                          </motion.button>
                        )}
                        
                        {pr.status === 'quotes_received' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedItem(pr);
                              setShowCreatePOModal(true);
                            }}
                            className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                            title="Create PO"
                          >
                            <ShoppingCart className="w-4 h-4 text-green-400" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPRs.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No purchase requisitions found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Purchase Orders Tab
  // ==========================================
  
  const renderOrders = () => {
    const filteredPOs = purchaseOrders.filter(po => {
      if (filterStatus !== 'all' && po.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          po.poNumber.toLowerCase().includes(search) ||
          po.vendorName.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search POs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_md_approval">Pending MD Approval</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreatePOModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-green-500/20"
          >
            <Plus className="w-4 h-4" />
            Create PO
          </motion.button>
        </div>
        
        {/* POs Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">PO Number</th>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">PR Ref</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Expected</th>
                  <th className="p-4 font-medium">Received</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredPOs.map((po) => (
                  <motion.tr
                    key={po.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{po.poNumber}</span>
                      {po.requiresMDApproval && (
                        <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          MD
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-white">{po.vendorName}</p>
                      <p className="text-xs text-zinc-500">{po.vendorContact}</p>
                    </td>
                    <td className="p-4">
                      {po.prNumber ? (
                        <span className="text-purple-400 text-sm font-mono">{po.prNumber}</span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-400">{po.items.length} items</td>
                    <td className="p-4">
                      <p className="text-white font-medium">{formatCurrency(po.totalAmount)}</p>
                      <p className="text-xs text-zinc-500">Tax: {formatCurrency(po.taxAmount)}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                        po.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                        po.status === 'partially_received' ? 'bg-purple-500/20 text-purple-400' :
                        po.status === 'received' ? 'bg-emerald-500/20 text-emerald-400' :
                        po.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {po.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      {po.items.some(i => i.receivedQty > 0) ? (
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (po.totalReceivedQty / po.items.reduce((s, i) => s + i.quantity, 0)) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-zinc-400">
                              {Math.round((po.totalReceivedQty / po.items.reduce((s, i) => s + i.quantity, 0)) * 100)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(po, 'order')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {po.status === 'approved' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => markPOAsOrdered(po.id, currentUser.id)}
                            className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center"
                            title="Mark as Ordered"
                          >
                            <Send className="w-4 h-4 text-blue-400" />
                          </motion.button>
                        )}
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                          title="Print"
                        >
                          <Printer className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPOs.length === 0 && (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No purchase orders found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Goods Receipts Tab
  // ==========================================
  
  const renderReceipts = () => {
    const filteredGRNs = goodsReceipts.filter(grn => {
      if (filterStatus !== 'all' && grn.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          grn.grnNumber.toLowerCase().includes(search) ||
          grn.poNumber.toLowerCase().includes(search) ||
          grn.vendorName.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search GRNs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="quality_check">Quality Check</option>
            <option value="verified">Verified</option>
            <option value="stock_updated">Stock Updated</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        {/* GRNs Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">GRN Number</th>
                  <th className="p-4 font-medium">PO Reference</th>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Value</th>
                  <th className="p-4 font-medium">Received By</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredGRNs.map((grn) => (
                  <motion.tr
                    key={grn.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-green-400">{grn.grnNumber}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-blue-400">{grn.poNumber}</span>
                    </td>
                    <td className="p-4 text-white">{grn.vendorName}</td>
                    <td className="p-4 text-zinc-400">{grn.items.length} items</td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(grn.totalReceivedValue)}
                    </td>
                    <td className="p-4">
                      <p className="text-zinc-300">{grn.receivedByName}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        grn.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        grn.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                        grn.status === 'quality_check' ? 'bg-yellow-500/20 text-yellow-400' :
                        grn.status === 'stock_updated' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {grn.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(grn.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(grn, 'receipt')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {grn.status === 'verified' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateMaterialStock(grn)}
                            className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                            title="Update Stock"
                          >
                            <Boxes className="w-4 h-4 text-green-400" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredGRNs.length === 0 && (
            <div className="p-12 text-center">
              <PackageCheck className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No goods receipts found</p>
              <p className="text-zinc-600 text-sm mt-1">GRNs are created from Store when goods arrive</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - Invoices Tab
  // ==========================================
  
  const renderInvoices = () => {
    const filteredInvoices = invoices.filter(inv => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(search) ||
          inv.vendorInvoiceNumber.toLowerCase().includes(search) ||
          inv.vendorName.toLowerCase().includes(search)
        );
      }
      return true;
    });
    
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        
        {/* Invoices Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 bg-zinc-900/50">
                  <th className="p-4 font-medium">Invoice #</th>
                  <th className="p-4 font-medium">Vendor Invoice</th>
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">PO / GRN</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Tax</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Due Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredInvoices.map((inv) => (
                  <motion.tr
                    key={inv.id}
                    variants={fadeInUp}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-mono text-purple-400">{inv.invoiceNumber}</span>
                    </td>
                    <td className="p-4 text-zinc-300">{inv.vendorInvoiceNumber}</td>
                    <td className="p-4">
                      <p className="text-white">{inv.vendorName}</p>
                      {inv.vendorGST && (
                        <p className="text-xs text-zinc-500">GST: {inv.vendorGST}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-xs space-y-1">
                        <span className="text-blue-400 font-mono">{inv.poNumber}</span>
                        <span className="mx-1 text-zinc-600">/</span>
                        <span className="text-green-400 font-mono">{inv.grnNumber}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="p-4 text-zinc-400">
                      {formatCurrency(inv.totalTax)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        inv.status === 'verified' ? 'bg-blue-500/20 text-blue-400' :
                        inv.status === 'payment_pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        inv.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {inv.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewDetails(inv, 'invoice')}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-zinc-400" />
                        </motion.button>
                        
                        {inv.status === 'verified' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateInvoiceStatus(inv.id, 'paid', { paymentDate: new Date().toISOString() })}
                            className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredInvoices.length === 0 && (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No invoices found</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // ==========================================
  // RENDER - View Details Modal
  // ==========================================
  
  const renderViewModal = () => {
    if (!selectedItem) return null;
    
    return (
      <AnimatePresence>
        {showViewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedItemType === 'request' && 'Material Request Details'}
                    {selectedItemType === 'requisition' && 'Purchase Requisition Details'}
                    {selectedItemType === 'order' && 'Purchase Order Details'}
                    {selectedItemType === 'receipt' && 'Goods Receipt Details'}
                    {selectedItemType === 'invoice' && 'Invoice Details'}
                  </h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    {selectedItemType === 'request' && (selectedItem as MaterialRequest).requestNumber}
                    {selectedItemType === 'requisition' && (selectedItem as PurchaseRequisition).prNumber}
                    {selectedItemType === 'order' && (selectedItem as PurchaseOrder).poNumber}
                    {selectedItemType === 'receipt' && (selectedItem as GoodsReceipt).grnNumber}
                    {selectedItemType === 'invoice' && (selectedItem as PurchaseInvoice).invoiceNumber}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowViewModal(false)}
                  className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </motion.button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Material Request Details */}
                {selectedItemType === 'request' && (() => {
                  const request = selectedItem as MaterialRequest;
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs">Requested By</p>
                          <p className="text-white font-medium">{request.requestedByName}</p>
                          <p className="text-zinc-500 text-xs">{request.requestedByRole}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Department</p>
                          <p className="text-white font-medium">{request.department}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Urgency</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                            request.urgency === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            request.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {request.urgency.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            request.status === 'converted_to_pr' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {request.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-1">Reason</p>
                        <p className="text-zinc-300">{request.reason}</p>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-3">Requested Items ({request.items.length})</p>
                        <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-700">
                                <th className="p-3">Material</th>
                                <th className="p-3">Code</th>
                                <th className="p-3">Current Stock</th>
                                <th className="p-3">Requested</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                              {request.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-3 text-white">{item.materialName}</td>
                                  <td className="p-3 text-zinc-400 font-mono text-sm">{item.materialCode}</td>
                                  <td className="p-3 text-zinc-400">{item.currentStock} {item.unit}</td>
                                  <td className="p-3 text-blue-400 font-medium">{item.requestedQty} {item.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {request.linkedPRNumber && (
                        <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <Link2 className="w-5 h-5 text-blue-400" />
                          <span className="text-zinc-300">Linked to PR:</span>
                          <span className="text-blue-400 font-mono font-medium">{request.linkedPRNumber}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Purchase Order Details */}
                {selectedItemType === 'order' && (() => {
                  const po = selectedItem as PurchaseOrder;
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs">Vendor</p>
                          <p className="text-white font-medium">{po.vendorName}</p>
                          <p className="text-zinc-500 text-xs">{po.vendorContact}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Total Amount</p>
                          <p className="text-white font-bold text-lg">{formatCurrency(po.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            po.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {po.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-xs">Created</p>
                          <p className="text-white">{new Date(po.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-zinc-500 text-xs mb-3">Order Items ({po.items.length})</p>
                        <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-700">
                                <th className="p-3">Material</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Unit Price</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Received</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                              {po.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-3 text-white">{item.materialName}</td>
                                  <td className="p-3 text-zinc-400">{item.quantity} {item.unit}</td>
                                  <td className="p-3 text-zinc-400">{formatCurrency(item.unitPrice)}</td>
                                  <td className="p-3 text-white font-medium">{formatCurrency(item.totalPrice)}</td>
                                  <td className="p-3">
                                    <span className={item.receivedQty >= item.quantity ? 'text-green-400' : 'text-yellow-400'}>
                                      {item.receivedQty || 0} / {item.quantity}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t border-zinc-700">
                              <tr>
                                <td colSpan={3} className="p-3 text-right text-zinc-400">Subtotal:</td>
                                <td className="p-3 text-white">{formatCurrency(po.subtotal)}</td>
                                <td></td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="p-3 text-right text-zinc-400">Tax ({po.taxPercent}%):</td>
                                <td className="p-3 text-white">{formatCurrency(po.taxAmount)}</td>
                                <td></td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="p-3 text-right text-zinc-400 font-medium">Total:</td>
                                <td className="p-3 text-white font-bold text-lg">{formatCurrency(po.totalAmount)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                      
                      {po.prNumber && (
                        <div className="flex items-center gap-2 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                          <Link2 className="w-5 h-5 text-purple-400" />
                          <span className="text-zinc-300">From PR:</span>
                          <span className="text-purple-400 font-mono font-medium">{po.prNumber}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
                >
                  Close
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };
  
  // ==========================================
  // MAIN RENDER
  // ==========================================
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading procurement data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Purchase Management
            </h1>
            <p className="text-zinc-500">
              Integrated procurement workflow • Store ↔ Supervisor ↔ Purchase ↔ MD
            </p>
          </div>
        </div>
        
        {/* Notifications Bell */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center relative"
          >
            <Bell className="w-5 h-5 text-zinc-400" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </motion.button>
          
          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <span className="text-xs text-zinc-500">{unreadNotifications} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer ${
                        !notification.isRead ? 'bg-blue-500/5' : ''
                      }`}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          !notification.isRead ? 'bg-blue-500' : 'bg-zinc-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{notification.title}</p>
                          <p className="text-zinc-500 text-xs mt-1 truncate">{notification.message}</p>
                          <p className="text-zinc-600 text-xs mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setFilterStatus('all');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/20' : 'bg-zinc-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
      
      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'requisitions' && renderRequisitions()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'receipts' && renderReceipts()}
        {activeTab === 'invoices' && renderInvoices()}
      </motion.div>
      
      {/* Modals */}
      {renderViewModal()}
    </div>
  );
}
