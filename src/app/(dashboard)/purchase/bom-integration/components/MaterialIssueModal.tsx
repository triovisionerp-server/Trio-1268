'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Box, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { PurchaseOrder } from '@/types/purchase';
import { issueMaterialsFromPO, checkPOMaterialAvailability } from '@/lib/services/bomPurchaseIntegration';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';

interface MaterialIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  projectId: string;
  onSuccess: () => void;
}

export default function MaterialIssueModal({ 
  isOpen, 
  onClose, 
  purchaseOrder,
  projectId,
  onSuccess 
}: MaterialIssueModalProps) {
  const [itemsToIssue, setItemsToIssue] = useState(
    purchaseOrder.items.map(item => ({
      materialCode: item.itemCode,
      materialName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      issue: true,
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const { user } = useAuthStore();

  // Check availability on mount
  useState(() => {
    if (isOpen) {
      checkPOMaterialAvailability(purchaseOrder.id!).then(setAvailability);
    }
  });

  const toggleIssue = (index: number) => {
    const updated = [...itemsToIssue];
    updated[index].issue = !updated[index].issue;
    setItemsToIssue(updated);
  };

  const updateQuantity = (index: number, qty: number) => {
    const updated = [...itemsToIssue];
    updated[index].quantity = qty;
    setItemsToIssue(updated);
  };

  const handleSubmit = async () => {
    const selectedItems = itemsToIssue.filter(item => item.issue);

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to issue');
      return;
    }

    try {
      setSubmitting(true);

      const result = await issueMaterialsFromPO(
        purchaseOrder.id!,
        projectId,
        user?.id || '',
        user?.name || '',
        selectedItems
      );

      toast.success('Materials issued successfully');
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error issuing materials:', error);
      toast.error(error.message || 'Failed to issue materials');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-screen p-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Issue Materials - {purchaseOrder.poNumber}
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Project: {purchaseOrder.projectName}
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
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Availability Status */}
              {availability && !availability.canIssue && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold mb-1">Insufficient Stock</p>
                    <p className="text-zinc-300 text-sm">
                      Some materials do not have sufficient stock. Goods must be received first.
                    </p>
                  </div>
                </div>
              )}

              {availability && availability.canIssue && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <p className="text-green-400 font-semibold">All materials available in stock</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-400 font-semibold mb-2">Issue Instructions</p>
                <ul className="text-zinc-300 text-sm space-y-1">
                  <li>• Select materials to issue to the project</li>
                  <li>• Adjust quantities if needed</li>
                  <li>• Materials will be deducted from store inventory</li>
                  <li>• Issue records will be logged for tracking</li>
                </ul>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {itemsToIssue.map((item, index) => {
                  const availItem = availability?.items.find((a: any) => a.materialCode === item.materialCode);
                  const hasStock = !availItem || availItem.shortfall === 0;

                  return (
                    <div 
                      key={index} 
                      className={`bg-zinc-800/50 border rounded-lg p-4 ${
                        hasStock ? 'border-zinc-700' : 'border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={item.issue}
                          onChange={() => toggleIssue(index)}
                          disabled={!hasStock}
                          className="mt-1 w-5 h-5 rounded border-zinc-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-white font-semibold">{item.materialName}</h3>
                              <p className="text-zinc-400 text-sm">Code: {item.materialCode}</p>
                            </div>

                            {hasStock ? (
                              <div className="text-right">
                                <p className="text-green-400 text-sm font-medium">
                                  ✓ In Stock
                                </p>
                                {availItem && (
                                  <p className="text-zinc-500 text-xs">
                                    Available: {availItem.availableStock} {item.unit}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="text-right">
                                <p className="text-red-400 text-sm font-medium">
                                  ✗ Insufficient
                                </p>
                                {availItem && (
                                  <p className="text-zinc-500 text-xs">
                                    Short: {availItem.shortfall} {item.unit}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div>
                              <label className="text-zinc-500 text-xs mb-1 block">Quantity to Issue</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, Number(e.target.value))}
                                disabled={!item.issue || !hasStock}
                                min="0"
                                max={purchaseOrder.items[index].quantity}
                                className="w-32 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-center disabled:opacity-50"
                              />
                            </div>

                            <div>
                              <p className="text-zinc-500 text-xs mb-1">Unit</p>
                              <p className="text-white font-medium">{item.unit}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Issue Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500">Items Selected</p>
                    <p className="text-white font-medium">
                      {itemsToIssue.filter(i => i.issue).length} / {itemsToIssue.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Project</p>
                    <p className="text-white font-medium">{purchaseOrder.projectName}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">PO Number</p>
                    <p className="text-white font-medium">{purchaseOrder.poNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-4 p-6 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !availability?.canIssue || itemsToIssue.filter(i => i.issue).length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Issuing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Issue Materials to Project
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
