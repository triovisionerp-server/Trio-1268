'use client';

// ==========================================
// MD PURCHASE APPROVAL COMPONENT
// ==========================================
// Allows MD to approve/reject high-value POs
// Links to: Purchase Page → Store Page

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  Loader2,
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import {
  PurchaseOrder,
  approvePO,
  rejectPO,
  formatCurrency,
  MD_APPROVAL_THRESHOLD,
  COLLECTIONS
} from '@/lib/services/integratedProcurementService';

// ==========================================
// ANIMATION VARIANTS
// ==========================================
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MDPurchaseApproval() {
  // State
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');
  
  // Current user
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' });
  
  // Stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingValue: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0
  });
  
  // ==========================================
  // EFFECTS
  // ==========================================
  
  useEffect(() => {
    // Get current user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser({
          id: user.uid || user.id || 'md-1',
          name: user.name || user.displayName || 'Managing Director',
        });
      } catch {
        setCurrentUser({ id: 'md-1', name: 'Managing Director' });
      }
    }
    
    // Subscribe to pending approvals
    const unsubPending = onSnapshot(
      query(
        collection(db, COLLECTIONS.PURCHASE_ORDERS),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const allOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PurchaseOrder[];
        
        const orders = allOrders.filter(po => po.status === 'pending_md_approval');
        setPendingOrders(orders);
        
        // Calculate stats
        setStats(prev => ({
          ...prev,
          pendingCount: orders.length,
          pendingValue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
        }));
        
        setLoading(false);
      },
      (error) => {
        console.error('Error loading pending orders:', error);
        setLoading(false);
      }
    );
    
    // Subscribe to recent approvals (approved or rejected this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const unsubRecent = onSnapshot(
      query(
        collection(db, COLLECTIONS.PURCHASE_ORDERS),
        where('requiresMDApproval', '==', true),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const orders: PurchaseOrder[] = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseOrder[];
        
        const recent = orders.filter(o => 
          (o.status === 'approved' || o.status === 'rejected') &&
          new Date(o.createdAt) >= startOfMonth
        );
        setRecentApprovals(recent.slice(0, 10));
        
        // Update stats
        const approved = recent.filter(o => o.status === 'approved').length;
        const rejected = recent.filter(o => o.status === 'rejected').length;
        setStats(prev => ({
          ...prev,
          approvedThisMonth: approved,
          rejectedThisMonth: rejected
        }));
      }
    );
    
    return () => {
      unsubPending();
      unsubRecent();
    };
  }, []);
  
  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handleApprove = async () => {
    if (!selectedOrder) return;
    
    try {
      setIsSubmitting(true);
      await approvePO(selectedOrder.id, currentUser.id, currentUser.name, approveComment);
      setShowApproveModal(false);
      setSelectedOrder(null);
      setApproveComment('');
      alert('Purchase Order approved successfully!');
    } catch (error) {
      console.error('Error approving PO:', error);
      alert('Failed to approve PO. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReject = async () => {
    if (!selectedOrder || !rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await rejectPO(selectedOrder.id, currentUser.id, currentUser.name, rejectReason);
      setShowRejectModal(false);
      setSelectedOrder(null);
      setRejectReason('');
      alert('Purchase Order rejected.');
    } catch (error) {
      console.error('Error rejecting PO:', error);
      alert('Failed to reject PO. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ==========================================
  // RENDER
  // ==========================================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Purchase Order Approvals</h2>
          <p className="text-zinc-500 text-sm">
            All Purchase Orders require your approval
          </p>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.pendingCount}</p>
              <p className="text-xs text-zinc-400">Pending Approval</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <IndianRupee className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.pendingValue)}</p>
              <p className="text-xs text-zinc-400">Pending Value</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.approvedThisMonth}</p>
              <p className="text-xs text-zinc-400">Approved (Month)</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.rejectedThisMonth}</p>
              <p className="text-xs text-zinc-400">Rejected (Month)</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Pending Orders */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Pending Approval</h3>
            <p className="text-xs text-zinc-500">{pendingOrders.length} orders awaiting your decision</p>
          </div>
        </div>
        
        <div className="divide-y divide-zinc-800">
          {pendingOrders.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
              <p className="text-zinc-400">No pending approvals</p>
              <p className="text-zinc-600 text-sm mt-1">All high-value orders have been processed</p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-blue-400 font-medium">{order.poNumber}</span>
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                        PENDING APPROVAL
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Building2 className="w-4 h-4" />
                        {order.vendorName}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-white font-bold text-xl mt-2">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      {order.items.length} items • Created by {order.createdByName}
                    </p>
                    
                    {order.prNumber && (
                      <p className="text-purple-400 text-xs mt-1">
                        From PR: {order.prNumber}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowApproveModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowRejectModal(true);
                      }}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
      
      {/* Recent Activity */}
      {recentApprovals.length > 0 && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">Recent Decisions</h3>
          </div>
          
          <div className="divide-y divide-zinc-800">
            {recentApprovals.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-blue-400">{order.poNumber}</span>
                  <p className="text-zinc-400 text-sm">{order.vendorName}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">{formatCurrency(order.totalAmount)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {order.status === 'approved' ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Approve Modal */}
      <AnimatePresence>
        {showApproveModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowApproveModal(false)}
          >
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Approve Purchase Order</h2>
                    <p className="text-zinc-500">{selectedOrder.poNumber}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Vendor</span>
                    <span className="text-white font-medium">{selectedOrder.vendorName}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-zinc-400">Amount</span>
                    <span className="text-green-400 font-bold text-lg">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-zinc-400">Items</span>
                    <span className="text-white">{selectedOrder.items.length} items</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                    placeholder="Add any comments..."
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Approve PO
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reject Purchase Order</h2>
                    <p className="text-zinc-500">{selectedOrder.poNumber}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Vendor</span>
                    <span className="text-white font-medium">{selectedOrder.vendorName}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-zinc-400">Amount</span>
                    <span className="text-red-400 font-bold text-lg">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a reason..."
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Reject PO
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
