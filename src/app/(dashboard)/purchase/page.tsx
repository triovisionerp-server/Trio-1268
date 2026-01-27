'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Send,
  FileText,
  IndianRupee,
  Building2,
  Search,
  Eye,
  Trash2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc
} from 'firebase/firestore';
import { 
  PurchaseOrder, 
  POItem, 
  VendorDetails, 
  InventoryItem,
  MD_APPROVAL_THRESHOLD,
  COLLECTIONS,
  POStatus
} from '@/types/purchase';

// ==========================================
// PURCHASE PAGE COMPONENT
// ==========================================

export default function PurchasePage() {
  // State for data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<VendorDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');

  // Form State
  const [selectedVendor, setSelectedVendor] = useState<VendorDetails | null>(null);
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item form state
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // ==========================================
  // FIREBASE LISTENERS
  // ==========================================

  useEffect(() => {
    // Listen to Purchase Orders
    const unsubPO = onSnapshot(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      (snapshot) => {
        const orders: PurchaseOrder[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as PurchaseOrder[];
        // Sort by createdAt in JavaScript
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPurchaseOrders(orders);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to purchase orders:', error);
        setLoading(false);
      }
    );

    // Listen to Inventory
    const unsubInv = onSnapshot(
      collection(db, COLLECTIONS.INVENTORY),
      (snapshot) => {
        const items: InventoryItem[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as InventoryItem[];
        // Sort by name in JavaScript (with null check)
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setInventory(items);
      },
      (error) => {
        console.error('Error listening to inventory:', error);
      }
    );

    // Listen to Vendors
    const unsubVendor = onSnapshot(
      collection(db, COLLECTIONS.VENDORS),
      (snapshot) => {
        const v: VendorDetails[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as VendorDetails[];
        // Sort by name in JavaScript (with null check)
        v.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setVendors(v);
      },
      (error) => {
        console.error('Error listening to vendors:', error);
      }
    );

    return () => {
      unsubPO();
      unsubInv();
      unsubVendor();
    };
  }, []);

  // ==========================================
  // CALCULATE STATS
  // ==========================================

  const stats = {
    total: purchaseOrders.length,
    pendingApproval: purchaseOrders.filter(po => po.status === 'pending_md_approval').length,
    approved: purchaseOrders.filter(po => po.status === 'approved').length,
    received: purchaseOrders.filter(po => po.status === 'received').length,
    totalValue: purchaseOrders
      .filter(po => po.status === 'approved' || po.status === 'received')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0),
    lowStockItems: inventory.filter(item => (item.currentStock || 0) <= (item.minLevel || 0)).length
  };

  // ==========================================
  // GENERATE PO NUMBER
  // ==========================================

  const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}-${random}`;
  };

  // ==========================================
  // ADD ITEM TO PO
  // ==========================================

  const handleAddItem = () => {
    if (!selectedItem || !quantity || !unitPrice) {
      alert('Please fill all item fields');
      return;
    }

    const item = inventory.find(i => i.id === selectedItem);
    if (!item) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);

    const newItem: POItem = {
      itemID: item.id,
      itemName: item.name || 'Unnamed Item',
      itemCode: item.code || 'N/A',
      quantity: qty,
      unit: item.unit || 'units',
      unitPrice: price,
      totalPrice: qty * price
    };

    setPOItems([...poItems, newItem]);
    setSelectedItem('');
    setQuantity('');
    setUnitPrice('');
  };

  // ==========================================
  // REMOVE ITEM FROM PO
  // ==========================================

  const handleRemoveItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  // ==========================================
  // CALCULATE TOTAL
  // ==========================================

  const calculateTotal = () => {
    return poItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // ==========================================
  // CREATE PURCHASE ORDER
  // ==========================================

  const handleCreatePO = async () => {
    if (!selectedVendor) {
      alert('Please select a vendor');
      return;
    }
    if (poItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      const requiresMDApproval = totalAmount >= MD_APPROVAL_THRESHOLD;
      const poNumber = generatePONumber();

      const newPO: Omit<PurchaseOrder, 'id'> = {
        poNumber,
        vendorDetails: selectedVendor,
        items: poItems,
        totalAmount,
        status: requiresMDApproval ? 'pending_md_approval' : 'approved',
        requiresMDApproval,
        mdApprovalLink: requiresMDApproval ? `/md?approve=${poNumber}` : undefined,
        createdBy: 'Purchase Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expectedDelivery: expectedDelivery || undefined,
        notes: notes || undefined
      };

      await addDoc(collection(db, COLLECTIONS.PURCHASE_ORDERS), newPO);

      // Reset form
      setSelectedVendor(null);
      setPOItems([]);
      setExpectedDelivery('');
      setNotes('');
      setShowCreateModal(false);

      // Show appropriate message
      if (requiresMDApproval) {
        alert(`Purchase Order ${poNumber} created!\n\n⚠️ Amount exceeds ₹50,000 - Sent to MD for approval.\n\nMD Approval Link: ${window.location.origin}/md`);
      } else {
        alert(`Purchase Order ${poNumber} created and auto-approved!\n\n✅ Order will appear in Store Incoming list.`);
      }

    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // DELETE PURCHASE ORDER
  // ==========================================

  const handleDeletePO = async (poId: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.PURCHASE_ORDERS, poId));
    } catch (error) {
      console.error('Error deleting PO:', error);
      alert('Failed to delete purchase order');
    }
  };

  // ==========================================
  // VIEW PO DETAILS
  // ==========================================

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  // ==========================================
  // FILTER ORDERS
  // ==========================================

  const filteredOrders = purchaseOrders.filter(po => {
    const poNumber = po.poNumber || '';
    const vendorName = po.vendorDetails?.name || '';
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      poNumber.toLowerCase().includes(searchLower) ||
      vendorName.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ==========================================
  // LOW STOCK ITEMS
  // ==========================================

  const lowStockItems = inventory.filter(item => (item.currentStock || 0) <= (item.minLevel || 0));

  // ==========================================
  // STATUS BADGE
  // ==========================================

  const getStatusBadge = (status: POStatus) => {
    const badges = {
      draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: FileText, label: 'Draft' },
      pending_md_approval: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending MD' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rejected' },
      partially_received: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Package, label: 'Partial' },
      received: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle, label: 'Received' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Cancelled' }
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-blue-400" />
            Purchase Management
          </h1>
          <p className="text-zinc-400 mt-1">Create purchase orders and manage vendor orders</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Purchase Order
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-zinc-400">Total Orders</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingApproval}</p>
              <p className="text-xs text-zinc-400">Pending MD</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-zinc-400">Approved</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.received}</p>
              <p className="text-xs text-zinc-400">Received</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <IndianRupee className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{(stats.totalValue / 1000).toFixed(0)}K</p>
              <p className="text-xs text-zinc-400">Total Value</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.lowStockItems}</p>
              <p className="text-xs text-zinc-400">Low Stock</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Orders List - 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
            {/* Header with search and filter */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search PO number or vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as POStatus | 'all')}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="all">All Status</option>
                  <option value="pending_md_approval">Pending MD</option>
                  <option value="approved">Approved</option>
                  <option value="received">Received</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-zinc-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No purchase orders found</p>
                  <p className="text-sm mt-1">Create your first purchase order</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">PO Number</th>
                      <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Vendor</th>
                      <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Items</th>
                      <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Amount</th>
                      <th className="text-center text-xs font-medium text-zinc-400 px-4 py-3">Status</th>
                      <th className="text-center text-xs font-medium text-zinc-400 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredOrders.map((po, idx) => (
                      <motion.tr 
                        key={po.id || `po-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-blue-400">{po.poNumber}</div>
                          <div className="text-xs text-zinc-500">
                            {new Date(po.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-400" />
                            <span className="text-sm">{po.vendorDetails?.name || 'Unknown Vendor'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-300">{po.items?.length || 0} items</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${(po.totalAmount || 0) >= MD_APPROVAL_THRESHOLD ? 'text-yellow-400' : 'text-green-400'}`}>
                            ₹{(po.totalAmount || 0).toLocaleString()}
                          </span>
                          {(po.totalAmount || 0) >= MD_APPROVAL_THRESHOLD && (
                            <div className="text-xs text-yellow-500">Needs MD</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(po.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewPO(po)}
                              className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 text-zinc-400" />
                            </button>
                            {po.status === 'pending_md_approval' && (
                              <a
                                href={`/md`}
                                className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Go to MD Approval"
                              >
                                <ExternalLink className="w-4 h-4 text-yellow-400" />
                              </a>
                            )}
                            {(po.status === 'draft' || po.status === 'rejected') && (
                              <button
                                onClick={() => handleDeletePO(po.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Alert Panel - 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-semibold flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alert
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Items that need reordering</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="p-4 text-center text-zinc-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">All stock levels are good!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {lowStockItems.map((item, idx) => (
                    <div key={item.id || `lowstock-${idx}`} className="p-4 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.name || 'Unnamed Item'}</p>
                          <p className="text-xs text-zinc-500">{item.code || '-'}</p>
                        </div>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                          Low
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Current: {item.currentStock || 0} {item.unit || 'units'}</span>
                        <span className="text-zinc-400">Min: {item.minLevel || 0} {item.unit || 'units'}</span>
                      </div>
                      <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.min((item.currentStock / item.minLevel) * 100, 100)}%` }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSelectedItem(item.id);
                          setShowCreateModal(true);
                        }}
                        className="mt-3 w-full text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-1.5 rounded-lg transition-colors"
                      >
                        Create PO for this item
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create PO Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-400" />
                  Create Purchase Order
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Orders above ₹50,000 require MD approval
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Vendor Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Vendor *</label>
                  <select
                    value={selectedVendor?.id || ''}
                    onChange={(e) => {
                      const vendor = vendors.find(v => v.id === e.target.value);
                      setSelectedVendor(vendor || null);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Choose a vendor...</option>
                    {vendors.map((vendor, idx) => (
                      <option key={vendor.id || `vendor-${idx}`} value={vendor.id}>
                        {vendor.name || 'Unknown'} - {vendor.city || 'N/A'}
                      </option>
                    ))}
                  </select>
                  {selectedVendor && (
                    <div className="mt-2 p-3 bg-zinc-800/50 rounded-lg text-sm">
                      <p><span className="text-zinc-400">Contact:</span> {selectedVendor.phone}</p>
                      <p><span className="text-zinc-400">GSTIN:</span> {selectedVendor.gstin}</p>
                    </div>
                  )}
                </div>

                {/* Add Item Section */}
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-4">
                  <h3 className="font-medium mb-3">Add Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="">Select Item...</option>
                      {inventory.map((item, idx) => (
                        <option key={item.id || `item-${idx}`} value={item.id}>
                          {item.name || 'Unnamed'} ({item.code || 'N/A'})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price (₹)"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <button
                      onClick={handleAddItem}
                      className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {poItems.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Order Items ({poItems.length})</h3>
                    <div className="border border-zinc-700 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-800">
                          <tr>
                            <th className="text-left px-4 py-2 text-zinc-400">Item</th>
                            <th className="text-right px-4 py-2 text-zinc-400">Qty</th>
                            <th className="text-right px-4 py-2 text-zinc-400">Price</th>
                            <th className="text-right px-4 py-2 text-zinc-400">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                          {poItems.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2">
                                <div className="font-medium">{item.itemName}</div>
                                <div className="text-xs text-zinc-500">{item.itemCode}</div>
                              </td>
                              <td className="px-4 py-2 text-right">{item.quantity} {item.unit}</td>
                              <td className="px-4 py-2 text-right">₹{item.unitPrice.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-medium">₹{item.totalPrice.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Total */}
                    <div className="mt-4 flex justify-end">
                      <div className="bg-zinc-800 rounded-xl p-4 min-w-64">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-zinc-400">Subtotal:</span>
                          <span>₹{calculateTotal().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-zinc-700 pt-2">
                          <span>Total:</span>
                          <span className={calculateTotal() >= MD_APPROVAL_THRESHOLD ? 'text-yellow-400' : 'text-green-400'}>
                            ₹{calculateTotal().toLocaleString()}
                          </span>
                        </div>
                        {calculateTotal() >= MD_APPROVAL_THRESHOLD && (
                          <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Requires MD Approval
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expected Delivery</label>
                    <input
                      type="date"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePO}
                  disabled={isSubmitting || !selectedVendor || poItems.length === 0}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Create Purchase Order
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View PO Modal */}
      <AnimatePresence>
        {showViewModal && selectedPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{selectedPO.poNumber}</h2>
                    <p className="text-sm text-zinc-400">
                      Created: {new Date(selectedPO.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedPO.status)}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Vendor Info */}
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Vendor Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-zinc-400">Name:</span> {selectedPO.vendorDetails.name}</p>
                    <p><span className="text-zinc-400">Phone:</span> {selectedPO.vendorDetails.phone}</p>
                    <p><span className="text-zinc-400">GSTIN:</span> {selectedPO.vendorDetails.gstin}</p>
                    <p><span className="text-zinc-400">City:</span> {selectedPO.vendorDetails.city}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-medium mb-2">Order Items</h3>
                  <table className="w-full text-sm border border-zinc-700 rounded-lg overflow-hidden">
                    <thead className="bg-zinc-800">
                      <tr>
                        <th className="text-left px-3 py-2">Item</th>
                        <th className="text-right px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Price</th>
                        <th className="text-right px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {selectedPO.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{item.itemName}</td>
                          <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-right">₹{item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">₹{item.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-800">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-bold">Total:</td>
                        <td className="px-3 py-2 text-right font-bold text-green-400">
                          ₹{selectedPO.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Approval Info */}
                {selectedPO.status === 'pending_md_approval' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <p className="text-yellow-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Waiting for MD Approval
                    </p>
                    <a 
                      href="/md" 
                      className="text-sm text-blue-400 hover:underline mt-2 inline-block"
                    >
                      Go to MD Dashboard →
                    </a>
                  </div>
                )}

                {selectedPO.approvedBy && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Approved by {selectedPO.approvedBy}
                    </p>
                    {selectedPO.approvedAt && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {new Date(selectedPO.approvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-800">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
