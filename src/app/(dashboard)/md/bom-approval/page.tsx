'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Eye, TrendingUp, DollarSign, Package,
  Clock, AlertTriangle, FileText, MessageSquare, BarChart3,
  PieChart, Download, RefreshCw, Filter, Search, ArrowUp, ArrowDown
} from 'lucide-react';
import { getBOMsByStatus, mdApproveBOM, rejectBOM, subscribeToBOMs } from '@/lib/services/bomService';
import { BOM, BOMStatus } from '@/types/bom';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';
import BOMDetailsModal from '../../pm/bom/components/BOMDetailsModal';
import MDApprovalModal from './components/MDApprovalModal';

export default function MDBOMApprovalPage() {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [pendingBOMs, setPendingBOMs] = useState<BOM[]>([]);
  const [approvedBOMs, setApprovedBOMs] = useState<BOM[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  
  const { user } = useAuthStore();

  // Subscribe to BOMs
  useEffect(() => {
    const unsubscribe = subscribeToBOMs((data) => {
      setBOMs(data);
      setPendingBOMs(data.filter(b => b.status === BOMStatus.MD_REVIEW));
      setApprovedBOMs(data.filter(b => b.status === BOMStatus.MD_APPROVED));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle approve
  const handleApprove = (bom: BOM) => {
    setSelectedBOM(bom);
    setShowApprovalModal(true);
  };

  // Handle reject
  const handleReject = async (bom: BOM, reason: string) => {
    try {
      await rejectBOM(bom.id!, user?.uid || '', user?.name || '', reason);
      toast.success('BOM rejected');
    } catch (error) {
      console.error('Error rejecting BOM:', error);
      toast.error('Failed to reject BOM');
    }
  };

  // View details
  const handleViewDetails = (bom: BOM) => {
    setSelectedBOM(bom);
    setShowDetailsModal(true);
  };

  // Statistics
  const stats = {
    pending: pendingBOMs.length,
    totalValue: pendingBOMs.reduce((sum, b) => sum + (b.pricing?.finalPrice || 0), 0),
    avgProfitMargin: pendingBOMs.length > 0
      ? pendingBOMs.reduce((sum, b) => sum + (b.pricing?.profitMargin || 0), 0) / pendingBOMs.length
      : 0,
    totalApproved: approvedBOMs.length,
    approvedValue: approvedBOMs.reduce((sum, b) => sum + (b.pricing?.finalPrice || 0), 0),
  };

  const displayBOMs = statusFilter === 'pending' ? pendingBOMs : statusFilter === 'approved' ? approvedBOMs : boms.filter(b => 
    b.status === BOMStatus.MD_REVIEW || b.status === BOMStatus.MD_APPROVED
  );

  const filteredBOMs = displayBOMs.filter(bom =>
    bom.bomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          BOM Approval Dashboard
        </h1>
        <p className="text-zinc-400">
          Review and approve Bill of Materials with detailed financial analysis
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-yellow-400 text-sm font-medium">Pending Approval</p>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
          <p className="text-yellow-400/60 text-sm mt-1">Awaiting review</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-400 text-sm font-medium">Total Value</p>
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
          <p className="text-blue-400/60 text-sm mt-1">Pending projects</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-400 text-sm font-medium">Avg Profit</p>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.avgProfitMargin.toFixed(1)}%</p>
          <p className="text-purple-400/60 text-sm mt-1">Profit margin</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-400 text-sm font-medium">Approved</p>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalApproved}</p>
          <p className="text-green-400/60 text-sm mt-1">Total BOMs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-400 text-sm font-medium">Approved Value</p>
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">₹{(stats.approvedValue / 100000).toFixed(1)}L</p>
          <p className="text-emerald-400/60 text-sm mt-1">Total approved</p>
        </motion.div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Pending ({pendingBOMs.length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Approved ({approvedBOMs.length})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            All
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search BOMs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 transition-colors">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* BOM List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredBOMs.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-12 text-center">
          <CheckCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg">No BOMs {statusFilter === 'pending' ? 'pending approval' : 'found'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBOMs.map((bom, index) => (
            <motion.div
              key={bom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-semibold text-white">{bom.bomNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      bom.status === BOMStatus.MD_REVIEW 
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {bom.status === BOMStatus.MD_REVIEW ? 'Pending Review' : 'Approved'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-zinc-500 text-sm">Project</p>
                      <p className="text-white font-medium">{bom.projectName}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Customer</p>
                      <p className="text-white font-medium">{bom.customerName}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Components</p>
                      <p className="text-white font-medium">{bom.components?.length || 0} items</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Submitted By</p>
                      <p className="text-white font-medium">{bom.workflow?.pmReviewedByName || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-zinc-800/30 rounded-lg">
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Material Cost</p>
                      <p className="text-white font-semibold">
                        ₹{bom.pricing?.totalMaterialCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Total Cost</p>
                      <p className="text-white font-semibold">
                        ₹{bom.pricing?.totalCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Profit Margin</p>
                      <p className="text-green-400 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {bom.pricing?.profitMargin}%
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Profit Amount</p>
                      <p className="text-green-400 font-semibold">
                        ₹{bom.pricing?.profitAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Final Price</p>
                      <p className="text-white font-bold text-lg">
                        ₹{bom.pricing?.finalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewDetails(bom)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  {bom.status === BOMStatus.MD_REVIEW && (
                    <>
                      <button
                        onClick={() => handleApprove(bom)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason) handleReject(bom, reason);
                        }}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedBOM && (
        <>
          <BOMDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedBOM(null);
            }}
            bom={selectedBOM}
          />

          <MDApprovalModal
            isOpen={showApprovalModal}
            onClose={() => {
              setShowApprovalModal(false);
              setSelectedBOM(null);
            }}
            bom={selectedBOM}
          />
        </>
      )}
    </div>
  );
}
