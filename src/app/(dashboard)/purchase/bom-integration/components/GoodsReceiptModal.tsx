'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, CheckCircle, Save } from 'lucide-react';
import { PurchaseOrder } from '@/types/purchase';
import { receiveGoodsFromPO } from '@/lib/services/bomPurchaseIntegration';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  onSuccess: () => void;
}

export default function GoodsReceiptModal({ 
  isOpen, 
  onClose, 
  purchaseOrder,
  onSuccess 
}: GoodsReceiptModalProps) {
  const [receivedItems, setReceivedItems] = useState(
    purchaseOrder.items.map(item => ({
      itemCode: item.itemCode,
      itemName: item.itemName,
      orderedQty: item.quantity,
      quantityReceived: item.quantity,
      unit: item.unit,
      remarks: '',
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  const updateReceivedQty = (index: number, qty: number) => {
    const updated = [...receivedItems];
    updated[index].quantityReceived = qty;
    setReceivedItems(updated);
  };

  const updateRemarks = (index: number, remarks: string) => {
    const updated = [...receivedItems];
    updated[index].remarks = remarks;
    setReceivedItems(updated);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const result = await receiveGoodsFromPO(
        purchaseOrder.id!,
        user?.id || '',
        user?.name || '',
        receivedItems
      );

      toast.success('Goods received successfully. Inventory updated.');
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error receiving goods:', error);
      toast.error(error.message || 'Failed to receive goods');
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
                <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Goods Receipt - {purchaseOrder.poNumber}
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Supplier: {purchaseOrder.vendorDetails.name}
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
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-400 font-semibold mb-2">Instructions</p>
                <ul className="text-zinc-300 text-sm space-y-1">
                  <li>• Verify each item's quantity received</li>
                  <li>• Check for any damage or discrepancies</li>
                  <li>• Update quantities if partial delivery</li>
                  <li>• Add remarks for any issues</li>
                </ul>
              </div>

              {/* Items */}
              <div className="space-y-4">
                {receivedItems.map((item, index) => (
                  <div key={index} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{item.itemName}</h3>
                        <p className="text-zinc-400 text-sm">Code: {item.itemCode}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-zinc-500 text-xs mb-1">Ordered</p>
                          <p className="text-white font-medium">{item.orderedQty} {item.unit}</p>
                        </div>

                        <div>
                          <label className="text-zinc-500 text-xs mb-1 block">Received</label>
                          <input
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) => updateReceivedQty(index, Number(e.target.value))}
                            min="0"
                            max={item.orderedQty}
                            className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-center font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) => updateRemarks(index, e.target.value)}
                        placeholder="Remarks (optional)"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                      />
                    </div>

                    {item.quantityReceived !== item.orderedQty && (
                      <div className="mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        <p className="text-yellow-400 text-xs">
                          ⚠️ Partial delivery: {item.orderedQty - item.quantityReceived} {item.unit} short
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Receipt Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500">Total Items</p>
                    <p className="text-white font-medium">{receivedItems.length}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Full Delivery</p>
                    <p className="text-white font-medium">
                      {receivedItems.filter(i => i.quantityReceived === i.orderedQty).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Partial Delivery</p>
                    <p className="text-white font-medium">
                      {receivedItems.filter(i => i.quantityReceived !== i.orderedQty).length}
                    </p>
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
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Receipt & Update Inventory
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
