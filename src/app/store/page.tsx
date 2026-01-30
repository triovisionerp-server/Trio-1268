'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowDown,
  FileCheck,
  Building2,
  IndianRupee,
  Eye,
  PackageCheck,
  XCircle,
  Warehouse,
  Image as ImageIcon,
  Grid3X3,
  List,
  ArrowLeft,
  Home
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  onSnapshot, 
  updateDoc,
  addDoc,
  doc,
  runTransaction
} from 'firebase/firestore';
import { 
  PurchaseOrder, 
  GoodsReceipt,
  GRNItem,
  COLLECTIONS,
  POStatus
} from '@/types/purchase';

// Firebase collection name - same as empStore for sync
const FB_MATERIALS = 'inventory_materials';

// Material Item type matching empStore sync
interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier_id?: string;
  supplier_name: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  unit: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// STORE PAGE - INVENTORY + INCOMING ORDERS
// ==========================================

export default function StorePage() {
  const router = useRouter();
  
  // State for data
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<'inventory' | 'incoming' | 'grn'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // GRN Form state
  const [receivedItems, setReceivedItems] = useState<GRNItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // ==========================================
  // FIREBASE LISTENERS
  // ==========================================

  useEffect(() => {
    // Listen to Materials (same collection as empStore)
    const unsubMaterials = onSnapshot(
      collection(db, FB_MATERIALS),
      (snapshot) => {
        const items: MaterialItem[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as MaterialItem[];
        // Sort by name
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMaterials(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to materials:', error);
        setLoading(false);
      }
    );

    // Listen to Approved Purchase Orders (Incoming)
    const unsubPO = onSnapshot(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      (snapshot) => {
        const orders: PurchaseOrder[] = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() })) as PurchaseOrder[];
        // Filter to only show approved/partially received orders
        const incoming = orders.filter(po => 
          po.status === 'approved' || po.status === 'partially_received'
        );
        // Sort by createdAt
        incoming.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setIncomingOrders(incoming);
      },
      (error) => {
        console.error('Error listening to POs:', error);
      }
    );

    // Listen to GRNs
    const unsubGRN = onSnapshot(
      collection(db, COLLECTIONS.GOODS_RECEIPTS),
      (snapshot) => {
        const grns: GoodsReceipt[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as GoodsReceipt[];
        // Sort by receivedAt
        grns.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
        setGoodsReceipts(grns);
      },
      (error) => {
        console.error('Error listening to GRNs:', error);
      }
    );

    return () => {
      unsubMaterials();
      unsubPO();
      unsubGRN();
    };
  }, []);

  // ==========================================
  // STATS
  // ==========================================

  const categories = ['All', ...new Set(materials.map(m => m.category).filter(Boolean))];

  const stats = {
    totalItems: materials.length,
    lowStock: materials.filter(item => item.current_stock <= item.min_stock).length,
    totalValue: materials.reduce((sum, item) => sum + (item.current_stock * (item.purchase_price || 0)), 0),
    incomingOrders: incomingOrders.length,
    pendingReceive: incomingOrders.filter(po => po.status === 'approved').length
  };

  // ==========================================
  // GENERATE GRN NUMBER
  // ==========================================

  const generateGRNNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `GRN-${year}${month}-${random}`;
  };

  // ==========================================
  // START RECEIVING ORDER
  // ==========================================

  const handleStartReceive = (order: PurchaseOrder) => {
    // Check if order can be received
    if (order.status === 'pending_md_approval') {
      alert('This order is pending MD approval. Cannot receive yet.');
      return;
    }

    setSelectedOrder(order);
    // Initialize received items from order items
    const items: GRNItem[] = order.items.map(item => ({
      itemID: item.itemID,
      itemName: item.itemName,
      orderedQty: item.quantity,
      receivedQty: item.quantity, // Default to full quantity
      unit: item.unit,
      remarks: ''
    }));
    setReceivedItems(items);
    setShowReceiveModal(true);
  };

  // ==========================================
  // UPDATE RECEIVED QUANTITY
  // ==========================================

  const updateReceivedQty = (index: number, qty: number) => {
    const updated = [...receivedItems];
    updated[index].receivedQty = Math.max(0, Math.min(qty, updated[index].orderedQty));
    setReceivedItems(updated);
  };

  // ==========================================
  // CONFIRM GOODS RECEIPT (GRN)
  // ==========================================

  const handleConfirmReceipt = async () => {
    if (!selectedOrder) return;
    if (!invoiceNumber) {
      alert('Please enter invoice number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use transaction to update inventory atomically
      await runTransaction(db, async (transaction) => {
        // 1. Update inventory stock for each received item
        for (const item of receivedItems) {
          if (item.receivedQty > 0) {
            const materialRef = doc(db, FB_MATERIALS, item.itemID);
            const currentItem = materials.find(i => i.id === item.itemID);
            if (currentItem) {
              const newStock = currentItem.current_stock + item.receivedQty;
              transaction.update(materialRef, { 
                current_stock: newStock,
                updated_at: new Date().toISOString()
              });
            }
          }
        }

        // 2. Check if all items fully received
        const allFullyReceived = receivedItems.every(
          item => item.receivedQty === item.orderedQty
        );

        // 3. Update PO status
        const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, selectedOrder.id);
        transaction.update(poRef, {
          status: allFullyReceived ? 'received' : 'partially_received',
          updatedAt: new Date().toISOString()
        });
      });

      // 4. Create GRN record (outside transaction)
      const totalValue = receivedItems.reduce((sum, item) => {
        const orderItem = selectedOrder.items.find(i => i.itemID === item.itemID);
        return sum + (item.receivedQty * (orderItem?.unitPrice || 0));
      }, 0);

      const grn: Omit<GoodsReceipt, 'id'> = {
        grnNumber: generateGRNNumber(),
        poID: selectedOrder.id,
        poNumber: selectedOrder.poNumber,
        vendorName: selectedOrder.vendorDetails.name,
        items: receivedItems,
        totalReceivedValue: totalValue,
        receivedBy: 'Store Manager', // In real app, get from auth
        receivedAt: new Date().toISOString(),
        status: 'completed',
        invoiceNumber,
        invoiceDate: invoiceDate || undefined,
        remarks: remarks || undefined
      };

      await addDoc(collection(db, COLLECTIONS.GOODS_RECEIPTS), grn);

      // Reset form
      setShowReceiveModal(false);
      setSelectedOrder(null);
      setReceivedItems([]);
      setInvoiceNumber('');
      setInvoiceDate('');
      setRemarks('');

      alert(`Goods received successfully!\nGRN: ${grn.grnNumber}\n\n✅ Stock has been updated.`);

    } catch (error) {
      console.error('Error confirming receipt:', error);
      alert('Failed to confirm receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // VIEW ORDER DETAILS
  // ==========================================

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  // ==========================================
  // FILTER INVENTORY
  // ==========================================

  const filteredMaterials = materials.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ==========================================
  // STATUS BADGE
  // ==========================================

  const getStatusBadge = (status: POStatus) => {
    const badges: Record<POStatus, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
      pending_md_approval: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending MD' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Ready to Receive' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
      partially_received: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Partial' },
      received: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Received' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' }
    };
    const badge = badges[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => router.push('/md')}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-all"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-emerald-400" />
            Store Management
          </h1>
          <p className="text-zinc-400 mt-1">Inventory, incoming orders & goods receipt</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <RefreshCw className="w-4 h-4" />
          Live sync enabled
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
              <p className="text-xs text-zinc-400">Total Items</p>
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
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
              <p className="text-xs text-zinc-400">Low Stock</p>
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
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Truck className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.incomingOrders}</p>
              <p className="text-xs text-zinc-400">Incoming</p>
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
            <div className="p-2 bg-green-500/20 rounded-lg">
              <PackageCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingReceive}</p>
              <p className="text-xs text-zinc-400">To Receive</p>
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
              <FileCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{goodsReceipts.length}</p>
              <p className="text-xs text-zinc-400">GRNs</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'incoming', label: 'Incoming Orders', icon: Truck, count: incomingOrders.length },
          { id: 'inventory', label: 'Current Stock', icon: Package, count: materials.length },
          { id: 'grn', label: 'GRN History', icon: FileCheck, count: goodsReceipts.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-zinc-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
        {/* Incoming Orders Tab */}
        {activeTab === 'incoming' && (
          <div>
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5 text-yellow-400" />
                Incoming Purchase Orders
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Approved orders ready to receive. Click "Receive" to create GRN and update stock.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : incomingOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No incoming orders</p>
                <p className="text-sm mt-1">Approved purchase orders will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {incomingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-blue-400">{order.poNumber}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {order.vendorDetails.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {order.items.length} items
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            ₹{order.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        {/* Items Preview */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-zinc-800 px-2 py-1 rounded-lg"
                            >
                              {item.itemName}: {item.quantity} {item.unit}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-xs text-zinc-500">
                              +{order.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5 text-zinc-400" />
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStartReceive(order)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                          Receive
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div>
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Current Stock Levels
                  <span className="text-sm font-normal text-zinc-400">({filteredMaterials.length} items)</span>
                </h2>
                <div className="flex items-center gap-3">
                  {/* Category Filter */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                  {/* View Toggle */}
                  <div className="flex bg-zinc-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No items found</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View with Images */
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMaterials.map((item) => {
                  const isLow = item.current_stock <= item.min_stock;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`bg-zinc-900/50 border rounded-xl overflow-hidden hover:border-blue-500/50 transition-all ${
                        isLow ? 'border-red-500/50' : 'border-zinc-800'
                      }`}
                    >
                      {/* Image Section */}
                      <div className="aspect-square bg-zinc-800/50 relative flex items-center justify-center">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-500">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span className="text-xs">No Image</span>
                          </div>
                        )}
                        {/* Category Badge */}
                        <span className="absolute top-2 left-2 px-2 py-1 bg-zinc-900/80 text-xs rounded-full">
                          {item.category || 'Uncategorized'}
                        </span>
                        {/* Low Stock Warning */}
                        {isLow && (
                          <span className="absolute top-2 right-2 px-2 py-1 bg-red-500/80 text-xs rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                      </div>
                      {/* Info Section */}
                      <div className="p-4">
                        <h3 className="font-semibold text-sm truncate" title={item.name}>
                          {item.name || 'Unnamed Item'}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">{item.code}</p>
                        <p className="text-xs text-zinc-400 mt-1 truncate">{item.supplier_name}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                          <div>
                            <p className="text-xs text-zinc-500">Stock</p>
                            <p className={`font-bold ${isLow ? 'text-red-400' : 'text-green-400'}`}>
                              {item.current_stock} <span className="text-xs font-normal text-zinc-500">{item.unit}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Price</p>
                            <p className="font-semibold text-blue-400">₹{item.purchase_price || 0}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Image</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Item</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Supplier</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Stock</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Min</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Price</th>
                    <th className="text-center text-xs font-medium text-zinc-400 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredMaterials.map((item) => {
                    const isLow = item.current_stock <= item.min_stock;
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-zinc-500">{item.code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{item.category}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{item.supplier_name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${isLow ? 'text-red-400' : 'text-green-400'}`}>
                            {item.current_stock}
                          </span>
                          <span className="text-zinc-500 text-sm ml-1">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-400">
                          {item.min_stock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-blue-400">
                          ₹{item.purchase_price || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                              <CheckCircle className="w-3 h-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* GRN History Tab */}
        {activeTab === 'grn' && (
          <div>
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-semibold flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-400" />
                Goods Receipt Notes (GRN)
              </h2>
              <p className="text-xs text-zinc-400 mt-1">History of all received goods</p>
            </div>

            {goodsReceipts.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No GRN records yet</p>
                <p className="text-sm mt-1">Receive incoming orders to create GRN</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">GRN Number</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">PO Number</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Vendor</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Invoice</th>
                    <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">Value</th>
                    <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {goodsReceipts.map((grn) => (
                    <tr key={grn.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-purple-400">{grn.grnNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-blue-400">{grn.poNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{grn.vendorName}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{grn.invoiceNumber}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-400">
                        ₹{grn.totalReceivedValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        <div>{grn.receivedBy}</div>
                        <div className="text-xs">
                          {new Date(grn.receivedAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Receive Modal (GRN Creation) */}
      <AnimatePresence>
        {showReceiveModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowReceiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <PackageCheck className="w-6 h-6 text-green-400" />
                  Receive Goods - {selectedOrder.poNumber}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Vendor: {selectedOrder.vendorDetails.name}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice Number *</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Enter invoice number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* Items to Receive */}
                <div>
                  <h3 className="font-medium mb-3">Items to Receive</h3>
                  <div className="border border-zinc-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-800">
                        <tr>
                          <th className="text-left px-4 py-2 text-zinc-400">Item</th>
                          <th className="text-right px-4 py-2 text-zinc-400">Ordered</th>
                          <th className="text-right px-4 py-2 text-zinc-400">Receiving</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700">
                        {receivedItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.itemName}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-400">
                              {item.orderedQty} {item.unit}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.receivedQty}
                                onChange={(e) => updateReceivedQty(index, parseFloat(e.target.value) || 0)}
                                max={item.orderedQty}
                                min={0}
                                className="w-24 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1 text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-zinc-400 text-sm ml-2">{item.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium mb-2">Remarks (Optional)</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any notes about this receipt..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex justify-end gap-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-6 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReceipt}
                  disabled={isSubmitting || !invoiceNumber}
                  className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Receipt
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Order Modal */}
      <AnimatePresence>
        {showViewModal && selectedOrder && (
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
                    <h2 className="text-xl font-bold">{selectedOrder.poNumber}</h2>
                    <p className="text-sm text-zinc-400">
                      Created: {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Vendor
                  </h3>
                  <p className="text-lg">{selectedOrder.vendorDetails.name}</p>
                  <p className="text-sm text-zinc-400">{selectedOrder.vendorDetails.city}</p>
                </div>

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
                      {selectedOrder.items.map((item, idx) => (
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
                          ₹{selectedOrder.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleStartReceive(selectedOrder);
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowDown className="w-4 h-4" />
                  Receive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
