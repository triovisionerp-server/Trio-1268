'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, MessageSquare, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { BOM } from '@/types/bom';
import { mdApproveBOM } from '@/lib/services/bomService';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/lib/stores/useAuthStore';

interface MDApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BOM;
}

export default function MDApprovalModal({
  isOpen,
  onClose,
  bom
}: MDApprovalModalProps) {
  const [comments, setComments] = useState('');
  const [approving, setApproving] = useState(false);
  const { user } = useAuthStore();

  const handleApprove = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setApproving(true);
      await mdApproveBOM(bom.id!, user.uid, user.name, comments);
      toast.success('BOM approved successfully');
      onClose();
    } catch (error) {
      console.error('Error approving BOM:', error);
      toast.error('Failed to approve BOM');
    } finally {
      setApproving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Approve BOM</h2>
              </div>
              <button
                onClick={onClose}
                disabled={approving}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* BOM Summary */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">BOM Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-zinc-400 text-sm">BOM Number</p>
                    <p className="text-white font-medium">{bom.bomNumber}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Project</p>
                    <p className="text-white font-medium">{bom.projectName}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Customer</p>
                    <p className="text-white font-medium">{bom.customerName}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Version</p>
                    <p className="text-white font-medium">v{bom.version}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              {bom.pricing && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Material Cost</p>
                      <p className="text-white text-lg font-semibold">
                        ₹{bom.pricing.totalMaterialCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Total Cost</p>
                      <p className="text-white text-lg font-semibold">
                        ₹{bom.pricing.totalCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Profit Margin</p>
                      <p className="text-green-400 text-lg font-semibold">
                        {bom.pricing.profitMargin}%
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-zinc-400 text-sm mb-1">Final Selling Price</p>
                      <p className="text-white text-2xl font-bold">
                        ₹{bom.pricing.finalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Components Summary */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Components
                </h3>
                <p className="text-zinc-400">
                  Total components: <span className="text-white font-semibold">{bom.components?.length || 0}</span>
                </p>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Approval Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Add any comments or notes regarding this approval..."
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-400 font-semibold mb-1">Important</p>
                  <p className="text-yellow-400/80">
                    By approving this BOM, you confirm that all specifications, pricing, and components
                    have been reviewed and are accurate. This will allow the project to proceed to production.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 p-6 flex gap-4">
              <button
                onClick={onClose}
                disabled={approving}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </motion.div>
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Approve BOM
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
