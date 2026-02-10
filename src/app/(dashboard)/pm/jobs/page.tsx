'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, CheckCircle, XCircle, Package, 
  Search, Play, AlertCircle,
  Plus, Minus, Layers
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';
import Link from 'next/link';

// --- TYPES ---
interface CustomerRequest {
  id: string;
  docNo: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  projectNumber: string;
  description: string;
  quantity: number;
  targetCost: number;
  deliverables: string;
  process: string;
  startDate: string;
  deliveryDate: string;
  originalDeliveryDate: string;
  status: string;
  createdAt: string;
  paymentTerms?: string;
  patternMaterial?: string;
}

interface Material {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  supplier?: string;
}

interface BOMItem {
  id: string;
  category: 'Material' | 'Tooling' | 'Manpower' | 'Machine';
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  wastagePercent: number;
  netQuantity: number;
  unitCost: number;
  totalCost: number;
  available: boolean;
  currentStock?: number;
  notes: string;
}

export default function PMJobsDashboard() {
  const { user, initializeUser } = useAuthStore();
  const [pendingRequests, setPendingRequests] = useState<CustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBOMBuilder, setShowBOMBuilder] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bom, setBom] = useState<BOMItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pmNotes, setPmNotes] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [newRequestCount, setNewRequestCount] = useState(0);

  // Initialize user from localStorage on mount
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Load pending customer requests with notification
  useEffect(() => {
    const q = query(
      collection(db, 'customer_requirements'),
      where('status', 'in', ['Customer Requirements', 'Under PM Review', 'BOM Creation']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: CustomerRequest[] = [];
      const newRequests: CustomerRequest[] = [];
      
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as CustomerRequest;
        requests.push(data);
        
        // Check if this is a new request (created in last 2 minutes)
        const createdAt = new Date(data.createdAt);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
        
        if (diffMinutes < 2 && data.status === 'Customer Requirements') {
          newRequests.push(data);
        }
      });
      
      // Show notification for new requests
      if (newRequests.length > 0 && !loading) {
        const customerName = newRequests[0].customerName;
        const projectName = newRequests[0].projectName;
        toast.info(`🔔 New Project Request: ${projectName} from ${customerName}`);
        setNewRequestCount(prev => prev + newRequests.length);
      }
      
      setPendingRequests(requests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loading]);

  // Load materials from inventory
  useEffect(() => {
    const loadMaterials = async () => {
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      const materialsList: Material[] = [];
      materialsSnapshot.forEach((doc) => {
        materialsList.push({ id: doc.id, ...doc.data() } as Material);
      });
      setMaterials(materialsList);
    };
    loadMaterials();
  }, []);

  // Start working on a request
  const startReview = async (request: CustomerRequest) => {
    setSelectedRequest(request);
    setEstimatedDelivery(request.deliveryDate);
    
    // Reset new request notification count
    setNewRequestCount(0);
    
    // Update status to "Under PM Review"
    if (request.status === 'Customer Requirements') {
      await updateDoc(doc(db, 'customer_requirements', request.id), {
        status: 'Under PM Review',
        updatedAt: new Date().toISOString(),
        pmReviewer: user?.email || 'PM'
      });
      
      toast.success(`✅ Started reviewing: ${request.projectName}`);
    }
  };

  // Add BOM item
  const addBOMItem = (material: Material, quantity: number, wastage: number, unitCost: number) => {
    const netQty = quantity * (1 + wastage / 100);
    const totalCost = netQty * unitCost;
    const available = material.currentStock >= netQty;

    const newItem: BOMItem = {
      id: Date.now().toString(),
      category: 'Material',
      itemName: material.name,
      specification: material.code,
      quantity: quantity,
      unit: material.unit,
      wastagePercent: wastage,
      netQuantity: netQty,
      unitCost: unitCost,
      totalCost: totalCost,
      available: available,
      currentStock: material.currentStock,
      notes: available ? 'In stock' : `Short by ${(netQty - material.currentStock).toFixed(2)} ${material.unit}`
    };

    setBom([...bom, newItem]);
  };

  // Remove BOM item
  const removeBOMItem = (id: string) => {
    setBom(bom.filter(item => item.id !== id));
  };

  // Calculate total cost
  const totalCost = bom.reduce((sum, item) => sum + item.totalCost, 0);
  const allMaterialsAvailable = bom.every(item => item.available);

  // Approve project
  const approveProject = async () => {
    if (!selectedRequest) return;

    try {
      await updateDoc(doc(db, 'customer_requirements', selectedRequest.id), {
        status: 'Approved',
        updatedAt: new Date().toISOString(),
        pmNotes: pmNotes,
        deliveryDate: estimatedDelivery,
        bom: bom,
        estimatedCost: totalCost,
        approvedBy: user?.email || 'PM',
        approvedAt: new Date().toISOString()
      });

      toast.success(`✅ Project "${selectedRequest.projectName}" approved! Customer will be notified.`);
      setSelectedRequest(null);
      setBom([]);
      setPmNotes('');
      setShowBOMBuilder(false);
    } catch (error) {
      console.error('Error approving project:', error);
      toast.error('❌ Failed to approve project. Please try again.');
    }
  };

  // Reject project
  const rejectProject = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await updateDoc(doc(db, 'customer_requirements', selectedRequest.id), {
        status: 'Rejected',
        updatedAt: new Date().toISOString(),
        rejectionReason: reason,
        rejectedBy: user?.email || 'PM',
        rejectedAt: new Date().toISOString()
      });

      toast.info(`🚨 Project "${selectedRequest.projectName}" rejected. Customer will be notified.`);
      setSelectedRequest(null);
      setBom([]);
      setPmNotes('');
      setShowBOMBuilder(false);
    } catch (error) {
      console.error('Error rejecting project:', error);
      toast.error('❌ Failed to reject project. Please try again.');
    }
  };

  // Move to production
  const moveToProduction = async () => {
    if (!selectedRequest) return;

    try {
      await updateDoc(doc(db, 'customer_requirements', selectedRequest.id), {
        status: 'In Production',
        updatedAt: new Date().toISOString(),
        productionStartedAt: new Date().toISOString(),
        progress: 0,
        completedStages: []
      });

      toast.success(`🚀 Project "${selectedRequest.projectName}" moved to production!`);
      setSelectedRequest(null);
      setBom([]);
      setPmNotes('');
      setShowBOMBuilder(false);
    } catch (error) {
      console.error('Error moving to production:', error);
      toast.error('❌ Failed to start production. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                PM Jobs Dashboard
              </h1>
              {pendingRequests.length > 0 && (
                <div className="relative">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
                    {pendingRequests.length}
                  </span>
                  {newRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-zinc-400 mt-2">
              Review customer requirements, create BOM, and approve projects
            </p>
          </div>
          <Link 
            href="/pm/workflow" 
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
          >
            Advanced Workflow →
          </Link>
        </div>
      </motion.div>

      {/* Pending Requests */}
      {!selectedRequest ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Pending Customer Requests ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
              <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Pending Requests</h3>
              <p className="text-zinc-400">All customer requests have been processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} onStart={() => startReview(request)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Selected Request View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Project Details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Project Details</h3>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setBom([]);
                    setShowBOMBuilder(false);
                  }}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <InfoRow label="Doc No" value={selectedRequest.docNo} />
                <InfoRow label="Customer" value={selectedRequest.customerName} />
                <InfoRow label="Project" value={selectedRequest.projectName} />
                <InfoRow label="Quantity" value={`${selectedRequest.quantity} units`} />
                <InfoRow label="Process" value={selectedRequest.process} />
                <InfoRow label="Deliverables" value={selectedRequest.deliverables} />
                <InfoRow label="Target Cost" value={`₹${selectedRequest.targetCost?.toLocaleString()}`} />
                <InfoRow label="Requested Delivery" value={selectedRequest.deliveryDate} />
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-zinc-500 mb-1">Description</p>
                <p className="text-sm text-zinc-300">{selectedRequest.description}</p>
              </div>
            </div>

            {/* PM Notes */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">PM Notes</h3>
              <textarea
                value={pmNotes}
                onChange={(e) => setPmNotes(e.target.value)}
                placeholder="Add notes about feasibility, timeline, or any concerns..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Estimated Delivery */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Estimated Delivery</h3>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {estimatedDelivery !== selectedRequest.deliveryDate && (
                <p className="text-xs text-yellow-400 mt-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Delivery date has been updated
                </p>
              )}
            </div>
          </div>

          {/* Right: BOM Builder */}
          <div className="lg:col-span-2 space-y-6">
            {!showBOMBuilder ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
                <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">BOM Creation</h3>
                <p className="text-zinc-400 mb-6">
                  Create Bill of Materials to check material availability and calculate costs
                </p>
                <button
                  onClick={() => setShowBOMBuilder(true)}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Start BOM Creation
                </button>
              </div>
            ) : (
              <>
                {/* Material Search */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Add Materials to BOM</h3>
                  
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search materials by name or code..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Material List */}
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {materials
                      .filter(m => 
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.code.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((material) => (
                        <MaterialRow 
                          key={material.id} 
                          material={material} 
                          onAdd={addBOMItem}
                        />
                      ))}
                  </div>
                </div>

                {/* BOM Table */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Bill of Materials</h3>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Estimated Total Cost</p>
                      <p className="text-2xl font-bold text-white">₹{totalCost.toLocaleString()}</p>
                    </div>
                  </div>

                  {bom.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No items added yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left">
                            <th className="pb-2 text-zinc-400 font-medium">Item</th>
                            <th className="pb-2 text-zinc-400 font-medium">Qty</th>
                            <th className="pb-2 text-zinc-400 font-medium">Wastage</th>
                            <th className="pb-2 text-zinc-400 font-medium">Net Qty</th>
                            <th className="pb-2 text-zinc-400 font-medium">Cost</th>
                            <th className="pb-2 text-zinc-400 font-medium">Status</th>
                            <th className="pb-2 text-zinc-400 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bom.map((item) => (
                            <tr key={item.id} className="border-b border-white/5">
                              <td className="py-3 text-white">{item.itemName}</td>
                              <td className="py-3 text-zinc-300">{item.quantity} {item.unit}</td>
                              <td className="py-3 text-zinc-300">{item.wastagePercent}%</td>
                              <td className="py-3 text-zinc-300">{item.netQuantity.toFixed(2)} {item.unit}</td>
                              <td className="py-3 text-white">₹{item.totalCost.toFixed(2)}</td>
                              <td className="py-3">
                                {item.available ? (
                                  <span className="text-green-400 text-xs flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Available
                                  </span>
                                ) : (
                                  <span className="text-red-400 text-xs flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Low Stock
                                  </span>
                                )}
                              </td>
                              <td className="py-3">
                                <button
                                  onClick={() => removeBOMItem(item.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!allMaterialsAvailable && bom.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Some materials are not available in stock. Consider purchasing or updating delivery timeline.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Decision</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={approveProject}
                      disabled={bom.length === 0}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve Project
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) rejectProject(reason);
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject Project
                    </button>
                  </div>
                  {selectedRequest.status === 'Approved' && (
                    <button
                      onClick={moveToProduction}
                      className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Move to Production
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- REQUEST CARD COMPONENT ---
function RequestCard({ request, onStart }: { request: CustomerRequest; onStart: () => void }) {
  const getStatusColor = (status: string) => {
    if (status === 'Customer Requirements') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (status === 'Under PM Review') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{request.projectName}</h3>
          <p className="text-sm text-zinc-400">{request.docNo}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
          {request.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Customer</p>
          <p className="text-sm font-medium text-white">{request.customerName}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Quantity</p>
          <p className="text-sm font-medium text-white">{request.quantity} units</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Target Cost</p>
          <p className="text-sm font-medium text-white">₹{request.targetCost?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Delivery</p>
          <p className="text-sm font-medium text-white">{request.deliveryDate}</p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" />
        {request.status === 'Customer Requirements' ? 'Start Review' : 'Continue Review'}
      </button>
    </motion.div>
  );
}

// --- MATERIAL ROW COMPONENT ---
function MaterialRow({ material, onAdd }: { material: Material; onAdd: (m: Material, qty: number, wastage: number, cost: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [wastage, setWastage] = useState(5);
  const [unitCost, setUnitCost] = useState(0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{material.name}</p>
          <p className="text-xs text-zinc-400">{material.code} - Stock: {material.currentStock} {material.unit}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Qty"
            className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
          />
          <input
            type="number"
            value={wastage}
            onChange={(e) => setWastage(Number(e.target.value))}
            placeholder="%"
            className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
          />
          <input
            type="number"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value))}
            placeholder="₹"
            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
          />
          <button
            onClick={() => onAdd(material, quantity, wastage, unitCost)}
            className="p-2 bg-cyan-500 hover:bg-cyan-600 rounded text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- INFO ROW COMPONENT ---
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
