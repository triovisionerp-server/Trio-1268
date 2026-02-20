'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, RefreshCw,
  Eye, Edit, Send, CheckCircle, XCircle,
  AlertTriangle, Clock, TrendingUp, Package, DollarSign,
  FileText, Sparkles
} from 'lucide-react';
import {
  generateBOMFromRequirements,
  saveBOM,
  subscribeToBOMs,
  pmApproveBOM,
  submitForMDApproval
} from '@/lib/services/bomService';
import { BOM, BOMStatus, CustomerRequirement } from '@/types/bom';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';
import CustomerRequirementModal from './components/CustomerRequirementModal';
import BOMEditorModal from './components/BOMEditorModal';
import BOMDetailsModal from './components/BOMDetailsModal';
import StockCheckModal from './components/StockCheckModal';

export default function BOMManagementPage() {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [filteredBOMs, setFilteredBOMs] = useState<BOM[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BOMStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [generating, setGenerating] = useState(false);
  
  const { user } = useAuthStore();

  // Subscribe to BOMs
  useEffect(() => {
    const unsubscribe = subscribeToBOMs((data) => {
      setBOMs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter BOMs
  useEffect(() => {
    let filtered = boms;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(bom => bom.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(bom => 
        bom.bomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bom.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bom.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBOMs(filtered);
  }, [boms, statusFilter, searchTerm]);

  // Generate BOM from customer requirement
  const handleGenerateBOM = async (requirement: CustomerRequirement) => {
    try {
      setGenerating(true);
      const { bom, suggestion } = await generateBOMFromRequirements(requirement);
      
      toast.success(`BOM generated with ${suggestion.confidence * 100}% confidence`);
      
      // Save BOM
      const bomId = await saveBOM({
        ...bom,
        workflow: {
          ...bom.workflow!,
          createdBy: user?.uid || 'unknown',
          createdByName: user?.name || 'Unknown',
        }
      });
      
      toast.success('BOM saved successfully');
      setShowRequirementModal(false);
      
      // Open editor for review
      const savedBOM = await getBOMById(bomId);
      if (savedBOM) {
        setSelectedBOM(savedBOM);
        setShowEditorModal(true);
      }
    } catch (err) {
      console.error('Error generating BOM:', err);
      toast.error('Failed to generate BOM');
    } finally {
      setGenerating(false);
    }
  };

  // Edit BOM
  const handleEditBOM = (bom: BOM) => {
    setSelectedBOM(bom);
    setShowEditorModal(true);
  };

  // View BOM details
  const handleViewBOM = (bom: BOM) => {
    setSelectedBOM(bom);
    setShowDetailsModal(true);
  };

  // Check stock availability
  const handleCheckStock = (bom: BOM) => {
    setSelectedBOM(bom);
    setShowStockModal(true);
  };

  // Submit for MD approval
  const handleSubmitForApproval = async (bom: BOM) => {
    try {
      await submitForMDApproval(bom.id!);
      toast.success('BOM submitted for MD approval');
    } catch (err) {
      console.error('Error submitting BOM:', err);
      toast.error('Failed to submit BOM');
    }
  };

  // PM Approve
  const handlePMApprove = async (bom: BOM) => {
    try {
      await pmApproveBOM(bom.id!, user?.uid || '', user?.name || '');
      toast.success('BOM approved');
    } catch (err) {
      console.error('Error approving BOM:', err);
      toast.error('Failed to approve BOM');
    }
  };

  // Statistics
  const stats = {
    total: boms.length,
    draft: boms.filter(b => b.status === BOMStatus.DRAFT).length,
    pmReview: boms.filter(b => b.status === BOMStatus.PM_REVIEW).length,
    mdReview: boms.filter(b => b.status === BOMStatus.MD_REVIEW).length,
    approved: boms.filter(b => b.status === BOMStatus.MD_APPROVED).length,
    totalValue: boms.reduce((sum, b) => sum + (b.pricing?.finalPrice || 0), 0),
    avgProfit: boms.length > 0 
      ? boms.reduce((sum, b) => sum + (b.pricing?.profitMargin || 0), 0) / boms.length 
      : 0,
  };

  const getStatusColor = (status: BOMStatus) => {
    const colors = {
      [BOMStatus.DRAFT]: 'bg-gray-500',
      [BOMStatus.PM_REVIEW]: 'bg-yellow-500',
      [BOMStatus.PM_APPROVED]: 'bg-blue-500',
      [BOMStatus.MD_REVIEW]: 'bg-purple-500',
      [BOMStatus.MD_APPROVED]: 'bg-green-500',
      [BOMStatus.REJECTED]: 'bg-red-500',
      [BOMStatus.IN_PRODUCTION]: 'bg-cyan-500',
      [BOMStatus.COMPLETED]: 'bg-emerald-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusIcon = (status: BOMStatus) => {
    const icons = {
      [BOMStatus.DRAFT]: FileText,
      [BOMStatus.PM_REVIEW]: Clock,
      [BOMStatus.PM_APPROVED]: CheckCircle,
      [BOMStatus.MD_REVIEW]: AlertTriangle,
      [BOMStatus.MD_APPROVED]: CheckCircle,
      [BOMStatus.REJECTED]: XCircle,
      [BOMStatus.IN_PRODUCTION]: Package,
      [BOMStatus.COMPLETED]: CheckCircle,
    };
    const Icon = icons[status] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          BOM Management System
        </h1>
        <p className="text-zinc-400">
          AI-Powered Bill of Materials Generation & Approval Workflow
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm">Total BOMs</p>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm">Pending Review</p>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.pmReview + stats.mdReview}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm">Total Value</p>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            ₹{(stats.totalValue / 100000).toFixed(1)}L
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-sm">Avg Profit Margin</p>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.avgProfit.toFixed(1)}%
          </p>
        </motion.div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <button
          onClick={() => setShowRequirementModal(true)}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate New BOM
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search BOMs by number, project, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BOMStatus | 'all')}
          className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value={BOMStatus.DRAFT}>Draft</option>
          <option value={BOMStatus.PM_REVIEW}>PM Review</option>
          <option value={BOMStatus.PM_APPROVED}>PM Approved</option>
          <option value={BOMStatus.MD_REVIEW}>MD Review</option>
          <option value={BOMStatus.MD_APPROVED}>MD Approved</option>
        </select>

        <button className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 transition-colors">
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
          <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-2">No BOMs found</p>
          <p className="text-zinc-500 text-sm">
            Create your first BOM by clicking &quot;Generate New BOM&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBOMs.map((bom, index) => (
            <motion.div
              key={bom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-white">
                      {bom.bomNumber}
                    </h3>
                    <span className={`px-3 py-1 ${getStatusColor(bom.status)} bg-opacity-20 text-sm rounded-full flex items-center gap-2`}>
                      {getStatusIcon(bom.status)}
                      {bom.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-zinc-500 text-sm">v{bom.version}</span>
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
                      <p className="text-zinc-500 text-sm">Total Cost</p>
                      <p className="text-white font-medium">₹{bom.pricing?.finalPrice.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <TrendingUp className="w-4 h-4" />
                      Profit: {bom.pricing?.profitMargin}%
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Package className="w-4 h-4" />
                      Material Cost: ₹{bom.pricing?.totalMaterialCost.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewBOM(bom)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  {(bom.status === BOMStatus.DRAFT || bom.status === BOMStatus.PM_REVIEW) && (
                    <button
                      onClick={() => handleEditBOM(bom)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}

                  {bom.status === BOMStatus.PM_REVIEW && (
                    <button
                      onClick={() => handlePMApprove(bom)}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}

                  {bom.status === BOMStatus.PM_APPROVED && (
                    <button
                      onClick={() => handleSubmitForApproval(bom)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
                      title="Submit to MD"
                    >
                      <Send className="w-5 h-5" />
                     </button>
                  )}

                  <button
                    onClick={() => handleCheckStock(bom)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                    title="Check Stock"
                  >
                    <Package className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CustomerRequirementModal
        isOpen={showRequirementModal}
        onClose={() => setShowRequirementModal(false)}
        onSubmit={handleGenerateBOM}
        generating={generating}
      />

      {selectedBOM && (
        <>
          <BOMEditorModal
            isOpen={showEditorModal}
            onClose={() => {
              setShowEditorModal(false);
              setSelectedBOM(null);
            }}
            bom={selectedBOM}
          />

          <BOMDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedBOM(null);
            }}
            bom={selectedBOM}
          />

          <StockCheckModal
            isOpen={showStockModal}
            onClose={() => {
              setShowStockModal(false);
              setSelectedBOM(null);
            }}
            bomId={selectedBOM.id!}
          />
        </>
      )}
    </div>
  );
}

// Helper function to get BOM by ID (add to bomService if not exists)
async function getBOMById(id: string) {
  const { getBOMById: fetchBOM } = await import('@/lib/services/bomService');
  return fetchBOM(id);
}
