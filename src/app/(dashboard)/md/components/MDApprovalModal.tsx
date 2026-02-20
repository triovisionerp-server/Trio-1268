'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, MessageSquare, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { BOM } from '@/types/bom';
import { mdApproveBOM, rejectBOM } from '@/lib/services/bomService';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';

interface MDApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BOM;
}

export default function MDApprovalModal({ isOpen, onClose, bom }: MDApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  const handleApprove = async () => {
    if (!comments.trim()) {
      toast.error('Please add approval comments');
      return;
    }

    try {
      setSubmitting(true);
      await mdApproveBOM(bom.id!, user?.id || '', user?.name || '', comments);
      toast.success('BOM approved successfully');
      onClose();
    } catch (error) {
      console.error('Error approving BOM:', error);
      toast.error('Failed to approve BOM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }

    try {
      setSubmitting(true);
      await rejectBOM(bom.id!, user?.id || '', user?.name || '', rejectionReason);
      toast.success('BOM rejected');
      onClose();
    } catch (error) {
      console.error('Error rejecting BOM:', error);
      toast.error('Failed to reject BOM');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div>
              <h2 className="text-2xl font-bold text-white">
                MD Approval - {bom.bomNumber}
              </h2>
              <p className="text-zinc-400 text-sm">{bom.projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Financial Summary */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Financial Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 p-4 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Total Cost</p>
                  <p className="text-white font-bold text-2xl">
                    ₹{bom.pricing?.totalCost.toLocaleString()}
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Material:</span>
                      <span className="text-zinc-300">₹{bom.pricing?.totalMaterialCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Labor:</span>
                      <span className="text-zinc-300">₹{bom.pricing?.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Overhead:</span>
                      <span className="text-zinc-300">₹{bom.pricing?.overheadCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Tooling:</span>
                      <span className="text-zinc-300">₹{bom.pricing?.toolingCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-green-400 text-sm mb-1">Profit Analysis</p>
                  <p className="text-white font-bold text-2xl flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    {bom.pricing?.profitMargin}%
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-400/60">Profit Amount:</span>
                      <span className="text-green-300 font-semibold">₹{bom.pricing?.profitAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400/60">Selling Price:</span>
                      <span className="text-green-300">₹{bom.pricing?.sellingPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400/60">GST (18%):</span>
                      <span className="text-green-300">₹{bom.pricing?.gst.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-blue-400 text-sm font-medium">Final Price (Inc. GST)</p>
                      <p className="text-zinc-400 text-xs">Customer Quote Amount</p>
                    </div>
                  </div>
                  <p className="text-white font-bold text-3xl">
                    ₹{bom.pricing?.finalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Customer</p>
                  <p className="text-white font-medium">{bom.customerName}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Components</p>
                  <p className="text-white font-medium">{bom.components?.length || 0} items</p>
                </div>
                <div>
                  <p className="text-zinc-500">Submitted By</p>
                  <p className="text-white font-medium">{bom.workflow?.pmReviewedByName}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Version</p>
                  <p className="text-white font-medium">v{bom.version}</p>
                </div>
              </div>
            </div>

            {/* PM Comments */}
            {bom.workflow?.pmComments && (
              <div className="bg-zinc-800/30 p-4 rounded-lg">
                <p className="text-zinc-400 text-sm mb-2">PM Comments:</p>
                <p className="text-white">{bom.workflow.pmComments}</p>
              </div>
            )}

            {/* Approval Decision */}
            {!action && (
              <div className="flex gap-4">
                <button
                  onClick={() => setAction('approve')}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold">Approve BOM</span>
                </button>

                <button
                  onClick={() => setAction('reject')}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg transition-all flex items-center justify-center gap-3"
                >
                  <AlertTriangle className="w-6 h-6" />
                  <span className="font-semibold">Reject BOM</span>
                </button>
              </div>
            )}

            {/* Approval Form */}
            {action === 'approve' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Approve BOM</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Approval Comments *
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                    placeholder="Add your approval comments, budget allocation notes, or special instructions..."
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setAction(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={submitting || !comments.trim()}
                    className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Rejection Form */}
            {action === 'reject' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <h3 className="text-lg font-semibold text-white">Reject BOM</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                    placeholder="Explain why this BOM is being rejected and what needs to be corrected..."
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setAction(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting || !rejectionReason.trim()}
                    className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {!action && (
            <div className="p-6 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
