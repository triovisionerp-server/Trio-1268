'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, AlertTriangle, CheckCircle, TrendingDown, RefreshCw, Send } from 'lucide-react';
import { checkStockAvailability } from '@/lib/services/bomService';
import { StockAvailabilityReport } from '@/types/bom';
import { toast } from '@/lib/toast';

interface StockCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  bomId: string;
}

export default function StockCheckModal({ isOpen, onClose, bomId }: StockCheckModalProps) {
  const [report, setReport] = useState<StockAvailabilityReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStockReport();
    }
  }, [isOpen, bomId]);

  const loadStockReport = async () => {
    try {
      setLoading(true);
      const data = await checkStockAvailability(bomId);
      setReport(data);
    } catch (error) {
      console.error('Error loading stock report:', error);
      toast.error('Failed to check stock availability');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (shortfall: number, currentStock: number) => {
    if (shortfall === 0) return 'text-green-400';
    if (currentStock > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStockStatusIcon = (shortfall: number, currentStock: number) => {
    if (shortfall === 0) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (currentStock > 0) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <TrendingDown className="w-5 h-5 text-red-400" />;
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Stock Availability Report
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    {report?.bomNumber || 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadStockReport}
                  disabled={loading}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : report ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg ${report.summary.readyForProduction ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <p className="text-zinc-400 text-sm mb-1">Production Ready</p>
                      <p className={`font-bold text-xl ${report.summary.readyForProduction ? 'text-green-400' : 'text-red-400'}`}>
                        {report.summary.readyForProduction ? 'YES' : 'NO'}
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                      <p className="text-zinc-400 text-sm mb-1">Available Items</p>
                      <p className="text-green-400 font-bold text-xl">
                        {report.summary.availableItems}/{report.summary.totalItems}
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                      <p className="text-zinc-400 text-sm mb-1">Partial Items</p>
                      <p className="text-yellow-400 font-bold text-xl">
                        {report.summary.partialItems}
                      </p>
                    </div>

                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                      <p className="text-zinc-400 text-sm mb-1">Unavailable Items</p>
                      <p className="text-red-400 font-bold text-xl">
                        {report.summary.unavailableItems}
                      </p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Component Availability
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Status</th>
                            <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Item</th>
                            <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Required</th>
                            <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Available</th>
                            <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Shortfall</th>
                            <th className="text-right text-zinc-400 text-sm font-medium py-3 px-2">Est. Cost</th>
                            <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Supplier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.items.map((item, index) => (
                            <tr key={index} className="border-b border-zinc-800/50">
                              <td className="py-3 px-2">
                                {getStockStatusIcon(item.shortfall, item.currentStock)}
                              </td>
                              <td className="py-3 px-2">
                                <div>
                                  <p className="text-white font-medium">{item.component.itemName}</p>
                                  <p className="text-zinc-500 text-xs">{item.component.itemCode}</p>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right text-white">
                                {item.requiredQuantity} {item.component.unit}
                              </td>
                              <td className={`py-3 px-2 text-right font-medium ${getStockStatusColor(item.shortfall, item.currentStock)}`}>
                                {item.currentStock} {item.component.unit}
                              </td>
                              <td className="py-3 px-2 text-right text-red-400 font-medium">
                                {item.shortfall > 0 ? `${item.shortfall} ${item.component.unit}` : '-'}
                              </td>
                              <td className="py-3 px-2 text-right text-white">
                                {item.estimatedCost > 0 ? `₹${item.estimatedCost.toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3 px-2 text-zinc-300 text-sm">
                                {item.suggestedSupplier || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Purchase Recommendation */}
                  {report.summary.unavailableItems > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-orange-400 mb-2">
                            Purchase Required
                          </h3>
                          <p className="text-zinc-300 mb-4">
                            {report.summary.unavailableItems} items are out of stock and need to be purchased
                            before production can begin. Total estimated cost:{' '}
                            <span className="font-semibold">
                              ₹{report.items.reduce((sum, item) => sum + item.estimatedCost, 0).toLocaleString()}
                            </span>
                          </p>
                          <div className="flex gap-3">
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Generate Purchase Orders
                            </button>
                            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
                              Create Indent Form
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-zinc-500">No data available</p>
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
              {report && !report.summary.readyForProduction && (
                <button
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Proceed to Purchase
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
