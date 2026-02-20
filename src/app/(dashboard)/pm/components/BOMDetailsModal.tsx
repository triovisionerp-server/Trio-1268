'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Package, DollarSign, TrendingUp, Clock, User, FileText } from 'lucide-react';
import { BOM, BOMStatus } from '@/types/bom';

interface BOMDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BOM;
}

export default function BOMDetailsModal({ isOpen, onClose, bom }: BOMDetailsModalProps) {
  if (!isOpen) return null;

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
    return colors[status];
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-screen p-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {bom.bomNumber}
                  <span className={`px-3 py-1 ${getStatusColor(bom.status)} bg-opacity-20 text-sm rounded-full`}>
                    {bom.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-zinc-500 text-base">v{bom.version}</span>
                </h2>
                <p className="text-zinc-400">{bom.projectName} - {bom.customerName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 p-4 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Material Cost</p>
                  <p className="text-white font-bold text-xl">
                    ₹{bom.pricing?.totalMaterialCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Total Cost</p>
                  <p className="text-white font-bold text-xl">
                    ₹{bom.pricing?.totalCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Profit Margin</p>
                  <p className="text-green-400 font-bold text-xl">
                    {bom.pricing?.profitMargin}%
                  </p>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Final Price</p>
                  <p className="text-green-400 font-bold text-xl">
                    ₹{bom.pricing?.finalPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-zinc-800/30 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Cost Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Labor Cost</p>
                    <p className="text-white font-medium">₹{bom.pricing?.laborCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Overhead Cost</p>
                    <p className="text-white font-medium">₹{bom.pricing?.overheadCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Tooling Cost</p>
                    <p className="text-white font-medium">₹{bom.pricing?.toolingCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">GST (18%)</p>
                    <p className="text-white font-medium">₹{bom.pricing?.gst.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Components Table */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Components ({bom.components?.length || 0})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Item Code</th>
                        <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Item Name</th>
                        <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Category</th>
                        <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Qty</th>
                        <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Unit Price</th>
                        <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.components?.map((comp, index) => (
                        <tr key={comp.id} className="border-b border-zinc-800/50">
                          <td className="py-3 px-2 text-white text-sm font-mono">{comp.itemCode}</td>
                          <td className="py-3 px-2 text-white text-sm">
                            <div>
                              <p className="font-medium">{comp.itemName}</p>
                              <p className="text-zinc-500 text-xs">{comp.specification}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-zinc-300 text-sm">{comp.category}</td>
                          <td className="py-3 px-2 text-right text-white text-sm">
                            {comp.quantity} {comp.unit}
                          </td>
                          <td className="py-3 px-2 text-right text-white text-sm">
                            ₹{comp.unitPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-white text-sm font-medium">
                            ₹{comp.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Workflow History */}
              <div className="bg-zinc-800/30 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Workflow History</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Created</p>
                      <p className="text-zinc-400 text-sm">
                        By {bom.workflow?.createdByName} on{' '}
                        {bom.workflow?.createdAt && new Date(bom.workflow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {bom.workflow?.pmReviewedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">PM Reviewed</p>
                        <p className="text-zinc-400 text-sm">
                          By {bom.workflow.pmReviewedByName} on{' '}
                          {new Date(bom.workflow.pmReviewedAt).toLocaleDateString()}
                        </p>
                        {bom.workflow.pmComments && (
                          <p className="text-zinc-500 text-sm mt-1">"{bom.workflow.pmComments}"</p>
                        )}
                      </div>
                    </div>
                  )}

                  {bom.workflow?.mdReviewedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">MD Approved</p>
                        <p className="text-zinc-400 text-sm">
                          By {bom.workflow.mdReviewedByName} on{' '}
                          {new Date(bom.workflow.mdReviewedAt).toLocaleDateString()}
                        </p>
                        {bom.workflow.mdComments && (
                          <p className="text-zinc-500 text-sm mt-1">"{bom.workflow.mdComments}"</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Revision History */}
              {bom.revisions && bom.revisions.length > 0 && (
                <div className="bg-zinc-800/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Revision History</h3>
                  <div className="space-y-2">
                    {bom.revisions.map((rev) => (
                      <div key={rev.revisionNumber} className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">Version {rev.revisionNumber}</span>
                          <span className="text-zinc-500 text-sm">
                            {new Date(rev.revisedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm">{rev.changes}</p>
                        <p className="text-zinc-500 text-xs mt-1">By {rev.revisedByName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-4 p-6 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {/* Add export functionality */}}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export PDF
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
