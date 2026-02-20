'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { PurchaseOrder } from '@/types/purchase';

interface POGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrders: PurchaseOrder[];
}

export default function POGenerationModal({ isOpen, onClose, purchaseOrders }: POGenerationModalProps) {
  if (!isOpen) return null;

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const needsMDApproval = purchaseOrders.some(po => po.requiresMDApproval);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Purchase Orders Generated Successfully
                </h2>
                <p className="text-zinc-400 text-sm">
                  {purchaseOrders.length} PO{purchaseOrders.length > 1 ? 's' : ''} created from BOM
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-1">Total POs</p>
                <p className="text-white font-bold text-2xl">{purchaseOrders.length}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-1">Total Amount</p>
                <p className="text-white font-bold text-2xl">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-1">Total Items</p>
                <p className="text-white font-bold text-2xl">
                  {purchaseOrders.reduce((sum, po) => sum + po.items.length, 0)}
                </p>
              </div>
            </div>

            {/* MD Approval Notice */}
            {needsMDApproval && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-semibold mb-1">MD Approval Required</p>
                  <p className="text-zinc-300 text-sm">
                    Some purchase orders exceed the approval threshold and require MD approval before proceeding.
                  </p>
                </div>
              </div>
            )}

            {/* PO List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Purchase Orders</h3>
              {purchaseOrders.map((po, index) => (
                <div key={po.id} className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold text-lg">{po.poNumber}</h4>
                      <p className="text-zinc-400 text-sm">{po.vendorDetails.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-xl">₹{po.totalAmount.toLocaleString()}</p>
                      {po.requiresMDApproval && (
                        <span className="text-yellow-400 text-xs">Needs Approval</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-zinc-500">Items</p>
                      <p className="text-white font-medium">{po.items.length}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Subtotal</p>
                      <p className="text-white font-medium">₹{po.subtotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">GST</p>
                      <p className="text-white font-medium">₹{po.gstAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Delivery</p>
                      <p className="text-white font-medium">{po.expectedDelivery}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-zinc-700 pt-3">
                    <p className="text-zinc-400 text-sm mb-2">Items:</p>
                    <div className="space-y-2">
                      {po.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300">{item.itemName}</span>
                          <span className="text-white">
                            {item.quantity} {item.unit} × ₹{item.unitPrice} = ₹{item.totalPrice.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {po.items.length > 3 && (
                        <p className="text-zinc-500 text-xs">+ {po.items.length - 3} more items</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-3">Next Steps</h3>
              <ol className="space-y-2 text-zinc-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-semibold">1.</span>
                  {needsMDApproval ? (
                    <span>Wait for MD approval on high-value POs</span>
                  ) : (
                    <span>Send POs to respective suppliers</span>
                  )}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-semibold">2.</span>
                  <span>Track delivery status and expected arrival dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-semibold">3.</span>
                  <span>Receive goods and create GRN (Goods Receipt Note)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-semibold">4.</span>
                  <span>Issue materials to project/production</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-4 p-6 border-t border-zinc-800">
            <button
              onClick={() => {/* Export PDF logic */}}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download All POs
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
