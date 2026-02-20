'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShoppingCart, Truck, CheckCircle, ArrowRight,
  FileText, DollarSign, AlertTriangle, RefreshCw, Eye,
  Send, Download, Clock, TrendingUp, Layers, Box
} from 'lucide-react';
import { BOM, BOMStatus, StockAvailabilityReport } from '@/types/bom';
import { PurchaseOrder, POStatus } from '@/types/purchase';
import {
  generatePOsFromBOM,
  getProjectPOs,
  getProjectMaterialFlow,
  checkPOMaterialAvailability,
  issueMaterialsFromPO,
  receiveGoodsFromPO
} from '@/lib/services/bomPurchaseIntegration';
import { checkStockAvailability, getBOMById } from '@/lib/services/bomService';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';
import POGenerationModal from './components/POGenerationModal';
import MaterialIssueModal from './components/MaterialIssueModal';
import GoodsReceiptModal from './components/GoodsReceiptModal';

export default function BOMPurchaseIntegrationPage() {
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [stockReport, setStockReport] = useState<StockAvailabilityReport | null>(null);
  const [generatedPOs, setGeneratedPOs] = useState<PurchaseOrder[]>([]);
  const [projectFlow, setProjectFlow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [showPOModal, setShowPOModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  const { user } = useAuthStore();

  // Load BOM and check stock
  const loadBOMData = async (bomId: string) => {
    try {
      setLoading(true);
      const bom = await getBOMById(bomId);
      if (!bom) {
        toast.error('BOM not found');
        return;
      }
      
      setSelectedBOM(bom);
      
      // Check stock availability
      const report = await checkStockAvailability(bomId);
      setStockReport(report);
      
      // Get linked POs if any
      if (bom.linkedPurchaseOrders && bom.linkedPurchaseOrders.length > 0) {
        const pos = await getProjectPOs(bom.projectId || '');
        setGeneratedPOs(pos);
      }
      
      // Get complete project flow
      if (bom.projectId) {
        const flow = await getProjectMaterialFlow(bom.projectId);
        setProjectFlow(flow);
      }
      
    } catch (error) {
      console.error('Error loading BOM data:', error);
      toast.error('Failed to load BOM data');
    } finally {
      setLoading(false);
    }
  };

  // Generate POs from BOM
  const handleGeneratePOs = async () => {
    if (!selectedBOM || !stockReport) return;
    
    try {
      setLoading(true);
      const result = await generatePOsFromBOM(
        selectedBOM.id!,
        stockReport,
        user?.id || '',
        user?.name || ''
      );
      
      setGeneratedPOs(result.pos);
      toast.success(`Generated ${result.summary.totalPOs} Purchase Orders`);
      setShowPOModal(true);
      
    } catch (error) {
      console.error('Error generating POs:', error);
      toast.error('Failed to generate Purchase Orders');
    } finally {
      setLoading(false);
    }
  };

  // Handle goods receipt
  const handleGoodsReceipt = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowGRNModal(true);
  };

  // Handle material issue
  const handleMaterialIssue = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowIssueModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          BOM → Purchase → Store Integration
        </h1>
        <p className="text-zinc-400">
          Complete material procurement and issuance workflow
        </p>
      </div>

      {/* Workflow Diagram */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 mb-6">
        <h2 className="text-xl font-semibold text-white mb-6">Material Flow</h2>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mb-3">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-semibold mb-1">1. BOM Created</p>
            <p className="text-zinc-500 text-sm text-center">PM creates Bill of Materials</p>
          </div>

          <ArrowRight className="w-8 h-8 text-zinc-600 flex-shrink-0" />

          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-3">
              <Package className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-semibold mb-1">2. Stock Check</p>
            <p className="text-zinc-500 text-sm text-center">Verify inventory availability</p>
          </div>

          <ArrowRight className="w-8 h-8 text-zinc-600 flex-shrink-0" />

          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center mb-3">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-semibold mb-1">3. Generate PO</p>
            <p className="text-zinc-500 text-sm text-center">Auto-create Purchase Orders</p>
          </div>

          <ArrowRight className="w-8 h-8 text-zinc-600 flex-shrink-0" />

          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mb-3">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-semibold mb-1">4. Receive Goods</p>
            <p className="text-zinc-500 text-sm text-center">GRN & update inventory</p>
          </div>

          <ArrowRight className="w-8 h-8 text-zinc-600 flex-shrink-0" />

          <div className="flex flex-col items-center flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center mb-3">
              <Box className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-semibold mb-1">5. Issue Materials</p>
            <p className="text-zinc-500 text-sm text-center">Send to project/production</p>
          </div>
        </div>
      </div>

      {/* BOM Selection */}
      {!selectedBOM && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-4">Select a BOM to start the workflow</p>
          <input
            type="text"
            placeholder="Enter BOM ID"
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                loadBOMData((e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
      )}

      {/* BOM Details & Stock Status */}
      {selectedBOM && stockReport && (
        <>
          {/* BOM Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm mb-1">BOM Number</p>
              <p className="text-white font-bold text-xl">{selectedBOM.bomNumber}</p>
              <p className="text-zinc-500 text-sm mt-1">{selectedBOM.projectName}</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm mb-1">Total Components</p>
              <p className="text-white font-bold text-xl">{selectedBOM.components?.length || 0}</p>
              <p className="text-zinc-500 text-sm mt-1">Items required</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm mb-1">Stock Status</p>
              <p className={`font-bold text-xl ${stockReport.summary.readyForProduction ? 'text-green-400' : 'text-red-400'}`}>
                {stockReport.summary.readyForProduction ? 'Ready' : 'Shortfall'}
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                {stockReport.summary.unavailableItems} items needed
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm mb-1">Total Value</p>
              <p className="text-white font-bold text-xl">
                ₹{selectedBOM.pricing?.finalPrice.toLocaleString()}
              </p>
              <p className="text-green-400 text-sm mt-1">
                {selectedBOM.pricing?.profitMargin}% profit
              </p>
            </div>
          </div>

          {/* Stock Shortfall */}
          {!stockReport.summary.readyForProduction && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-400 mb-2">
                    Purchase Required
                  </h3>
                  <p className="text-zinc-300 mb-4">
                    {stockReport.summary.unavailableItems} items are out of stock. 
                    Estimated purchase cost: ₹{stockReport.items.reduce((sum, item) => sum + item.estimatedCost, 0).toLocaleString()}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {stockReport.items.filter(item => item.shortfall > 0).slice(0, 4).map((item, index) => (
                      <div key={index} className="bg-zinc-900/50 p-3 rounded-lg">
                        <p className="text-white font-medium">{item.component.itemName}</p>
                        <p className="text-zinc-400 text-sm">
                          Need: {item.shortfall} {item.component.unit} | Available: {item.currentStock}
                        </p>
                        <p className="text-orange-400 text-sm">
                          Cost: ₹{item.estimatedCost.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGeneratePOs}
                    disabled={loading || generatedPOs.length > 0}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating POs...
                      </>
                    ) : generatedPOs.length > 0 ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        POs Already Generated
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Generate Purchase Orders
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generated POs */}
          {generatedPOs.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Generated Purchase Orders ({generatedPOs.length})
              </h3>
              
              <div className="space-y-4">
                {generatedPOs.map((po, index) => (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-white">{po.poNumber}</h4>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            po.status === 'received' ? 'bg-green-500/20 text-green-400' :
                            po.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                            po.status === 'pending_md_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {po.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-500">Supplier</p>
                            <p className="text-white font-medium">{po.vendorDetails.name}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Items</p>
                            <p className="text-white font-medium">{po.items.length}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Amount</p>
                            <p className="text-white font-medium">₹{po.totalAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Expected Delivery</p>
                            <p className="text-white font-medium">{po.expectedDelivery}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white transition-colors">
                          <Eye className="w-5 h-5" />
                        </button>

                        {po.status === 'approved' && !po.grnNumber && (
                          <button
                            onClick={() => handleGoodsReceipt(po)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors flex items-center gap-2"
                          >
                            <Truck className="w-4 h-4" />
                            Receive Goods
                          </button>
                        )}

                        {po.status === 'received' && !po.materialsIssued && (
                          <button
                            onClick={() => handleMaterialIssue(po)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center gap-2"
                          >
                            <Box className="w-4 h-4" />
                            Issue Materials
                          </button>
                        )}

                        {po.materialsIssued && (
                          <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Issued
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Project Material Flow */}
          {projectFlow && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Project Material Flow
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingCart className="w-6 h-6 text-blue-400" />
                    <p className="text-blue-400 font-semibold">Total Purchased</p>
                  </div>
                  <p className="text-white font-bold text-2xl">
                    ₹{projectFlow.totalPurchaseValue.toLocaleString()}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {projectFlow.purchaseOrders.length} Purchase Orders
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Box className="w-6 h-6 text-green-400" />
                    <p className="text-green-400 font-semibold">Materials Issued</p>
                  </div>
                  <p className="text-white font-bold text-2xl">
                    {projectFlow.totalIssued}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {projectFlow.materialsIssued.length} Transactions
                  </p>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Layers className="w-6 h-6 text-purple-400" />
                    <p className="text-purple-400 font-semibold">BOMs</p>
                  </div>
                  <p className="text-white font-bold text-2xl">
                    {projectFlow.boms.length}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">Bill of Materials</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <POGenerationModal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        purchaseOrders={generatedPOs}
      />

      {selectedPO && (
        <>
          <GoodsReceiptModal
            isOpen={showGRNModal}
            onClose={() => {
              setShowGRNModal(false);
              setSelectedPO(null);
            }}
            purchaseOrder={selectedPO}
            onSuccess={() => loadBOMData(selectedBOM?.id || '')}
          />

          <MaterialIssueModal
            isOpen={showIssueModal}
            onClose={() => {
              setShowIssueModal(false);
              setSelectedPO(null);
            }}
            purchaseOrder={selectedPO}
            projectId={selectedBOM?.projectId || ''}
            onSuccess={() => loadBOMData(selectedBOM?.id || '')}
          />
        </>
      )}
    </div>
  );
}
