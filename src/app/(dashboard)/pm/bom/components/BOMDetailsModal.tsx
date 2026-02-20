'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar, Package, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { BOM } from '@/types/bom';

interface BOMDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BOM;
}

export default function BOMDetailsModal({
  isOpen,
  onClose,
  bom
}: BOMDetailsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">{bom.bomNumber}</h2>
                <p className="text-zinc-400">Version {bom.version}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm mb-1">Project Name</p>
                    <p className="text-white font-medium">{bom.projectName}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm mb-1">Customer</p>
                    <p className="text-white font-medium">{bom.customerName}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm mb-1">Status</p>
                    <p className="text-white font-medium">{bom.status}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm mb-1">Created Date</p>
                    <p className="text-white font-medium">
                      {bom.createdAt ? new Date(bom.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Components */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Components ({bom.components?.length || 0})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Component</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Category</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Specification</th>
                        <th className="text-right text-zinc-400 text-sm font-medium p-3">Quantity</th>
                        <th className="text-right text-zinc-400 text-sm font-medium p-3">Unit Cost</th>
                        <th className="text-right text-zinc-400 text-sm font-medium p-3">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.components?.map((component) => (
                        <tr key={component.id} className="border-b border-zinc-800/50">
                          <td className="p-3 text-white">{component.itemName}</td>
                          <td className="p-3 text-zinc-400 text-sm">{component.category}</td>
                          <td className="p-3 text-zinc-400 text-sm">{component.specification || '-'}</td>
                          <td className="p-3 text-right text-white">
                            {component.quantity} {component.unit}
                          </td>
                          <td className="p-3 text-right text-white">
                            ₹{component.unitPrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-white font-medium">
                            ₹{component.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pricing */}
              {bom.pricing && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Cost Breakdown
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-1">Material Cost</p>
                      <p className="text-white text-xl font-semibold">
                        ₹{bom.pricing.totalMaterialCost.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-1">Labor Cost</p>
                      <p className="text-white text-xl font-semibold">
                        ₹{bom.pricing.laborCost.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-1">Overhead Cost</p>
                      <p className="text-white text-xl font-semibold">
                        ₹{bom.pricing.overheadCost.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-1">Total Cost</p>
                      <p className="text-white text-xl font-semibold">
                        ₹{bom.pricing.totalCost.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Profit Margin
                      </p>
                      <p className="text-green-400 text-xl font-semibold">
                        {bom.pricing.profitMargin}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-1">Final Price</p>
                      <p className="text-white text-xl font-bold">
                        ₹{bom.pricing.finalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Workflow */}
              {bom.workflow && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Workflow History
                  </h3>
                  <div className="space-y-3">
                    {bom.workflow.createdAt && (
                      <div className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-4">
                        <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white font-medium">Created</p>
                          <p className="text-zinc-400 text-sm">
                            By {bom.workflow.createdByName} on{' '}
                            {new Date(bom.workflow.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {bom.workflow.pmReviewedAt && (
                      <div className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-4">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white font-medium">PM Reviewed</p>
                          <p className="text-zinc-400 text-sm">
                            By {bom.workflow.pmReviewedByName} on{' '}
                            {new Date(bom.workflow.pmReviewedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {bom.workflow.mdReviewedAt && (
                      <div className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-4">
                        <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white font-medium">MD Reviewed</p>
                          <p className="text-zinc-400 text-sm">
                            By {bom.workflow.mdReviewedByName} on{' '}
                            {new Date(bom.workflow.mdReviewedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 p-6">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
