'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { checkStockAvailability } from '@/lib/services/bomService';
import { StockAvailabilityReport } from '@/types/bom';

interface StockCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  bomId: string;
}

export default function StockCheckModal({
  isOpen,
  onClose,
  bomId
}: StockCheckModalProps) {
  const [report, setReport] = useState<StockAvailabilityReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bomId) {
      loadStockAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bomId]);
  
  const getOverallStatus = () => {
    if (!report || !report.summary) return 'UNKNOWN';
    if (report.summary.readyForProduction) return 'IN_STOCK';
    if (report.summary.unavailableItems > 0) return 'OUT_OF_STOCK';
    if (report.summary.partialItems > 0) return 'LOW_STOCK';
    return 'IN_STOCK';
  };
  
  const getCanProceed = () => {
    if (!report || !report.summary) return false;
    return report.summary.readyForProduction;
  };

  const loadStockAvailability = async () => {
    try {
      setLoading(true);
      const data = await checkStockAvailability(bomId);
      setReport(data);
    } catch (error) {
      console.error('Error checking stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'OUT_OF_STOCK':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Package className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'LOW_STOCK':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'OUT_OF_STOCK':
        return 'bg-red-500/20 border-red-500/30 text-red-400';
      default:
        return 'bg-zinc-500/20 border-zinc-500/30 text-zinc-400';
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Stock Availability Check</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadStockAvailability}
                  disabled={loading}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : report ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                      <p className="text-zinc-400 text-sm mb-2">Total Components</p>
                      <p className="text-3xl font-bold text-white">{report.summary?.totalItems || 0}</p>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                      <p className="text-zinc-400 text-sm mb-2">Available</p>
                      <p className="text-3xl font-bold text-green-400">{report.summary?.availableItems || 0}</p>
                    </div>
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
                      <p className="text-zinc-400 text-sm mb-2">Unavailable</p>
                      <p className="text-3xl font-bold text-red-400">{report.summary?.unavailableItems || 0}</p>
                    </div>
                  </div>

                  {/* Overall Status */}
                  <div className={`border rounded-lg p-4 ${getStatusColor(getOverallStatus())}`}>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(getOverallStatus())}
                      <div>
                        <p className="font-semibold">Overall Status: {getOverallStatus().replace('_', ' ')}</p>
                        <p className="text-sm opacity-80">
                          {getCanProceed()
                            ? 'All materials are available. You can proceed with production.'
                            : 'Some materials are unavailable. Purchase orders needed.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Component Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Component Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left text-zinc-400 text-sm font-medium p-3">Status</th>
                            <th className="text-left text-zinc-400 text-sm font-medium p-3">Component</th>
                            <th className="text-right text-zinc-400 text-sm font-medium p-3">Required</th>
                            <th className="text-right text-zinc-400 text-sm font-medium p-3">Available</th>
                            <th className="text-right text-zinc-400 text-sm font-medium p-3">Shortage</th>
                            <th className="text-right text-zinc-400 text-sm font-medium p-3">Lead Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.items?.map((item, index) => (
                            <tr key={index} className="border-b border-zinc-800/50">
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(item.component.stockStatus.toUpperCase())}`}>
                                  {getStatusIcon(item.component.stockStatus.toUpperCase())}
                                  {item.component.stockStatus.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-white">{item.component.itemName}</td>
                              <td className="p-3 text-right text-white">
                                {item.requiredQuantity} {item.component.unit}
                              </td>
                              <td className="p-3 text-right text-white">
                                {item.currentStock} {item.component.unit}
                              </td>
                              <td className="p-3 text-right">
                                {item.shortfall > 0 ? (
                                  <span className="text-red-400 font-medium">
                                    {item.shortfall} {item.component.unit}
                                  </span>
                                ) : (
                                  <span className="text-green-400">-</span>
                                )}
                              </td>
                              <td className="p-3 text-right text-zinc-400">
                                {item.estimatedDelivery || 0} days
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Estimated Procurement Time */}
                  {report.items && report.items.some(item => item.shortfall > 0) && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-blue-400" />
                        <p className="font-semibold text-blue-400">Procurement Required</p>
                      </div>
                      <p className="text-white">
                        Estimated time to procure missing materials:{' '}
                        <span className="font-bold">
                          {Math.max(...report.items.filter(i => i.shortfall > 0).map(i => i.estimatedDelivery || 0))} days
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-zinc-400">
                  <p>No stock data available</p>
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
