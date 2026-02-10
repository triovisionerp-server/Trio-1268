'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { FileText, Printer, Trash2, Truck, CheckCircle, Clock, Search } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import DeliveryChallanTemplate, { type DeliveryChallanData, type DCItem } from '../purchase/documents/DeliveryChallanTemplate';

interface DCRecord extends DeliveryChallanData {
  id: string;
  status: string;
  createdAt: string;
}

export default function DCList() {
  const [deliveryChallans, setDeliveryChallans] = useState<DCRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_transit' | 'delivered'>('all');
  const [selectedDC, setSelectedDC] = useState<DeliveryChallanData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, 'delivery_challans'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dcs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as DCRecord[];
      setDeliveryChallans(dcs);
    });
    return () => unsubscribe();
  }, []);

  // Filter DCs
  const filteredDCs = deliveryChallans.filter(dc => {
    const matchesSearch = dc.dcNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dc.consignee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || dc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Update DC status
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'delivery_challans', id), { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Delete DC
  const deleteDC = async (id: string) => {
    if (confirm('Are you sure you want to delete this DC?')) {
      try {
        await deleteDoc(doc(db, 'delivery_challans', id));
      } catch (error) {
        console.error('Error deleting DC:', error);
      }
    }
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DC_${selectedDC?.dcNumber?.replace(/\//g, '_')}`
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>;
      case 'in_transit':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center gap-1"><Truck className="w-3 h-3" />In Transit</span>;
      case 'delivered':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Delivered</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search DC number or consignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'in_transit', 'delivered'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                filterStatus === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* DC Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDCs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No delivery challans found</p>
            <p className="text-sm text-zinc-600 mt-2">Create your first DC using the &quot;Create DC&quot; button</p>
          </div>
        ) : (
          filteredDCs.map((dc, index) => (
            <motion.div
              key={dc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{dc.dcNumber}</h3>
                  <p className="text-sm text-zinc-400">Date: {dc.dcDate}</p>
                  {dc.poNumber && <p className="text-xs text-zinc-500 mt-1">PO: {dc.poNumber}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(dc.status)}
                  <button
                    onClick={() => {
                      setSelectedDC(dc);
                      setTimeout(handlePrint, 100);
                    }}
                    className="p-2 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-all"
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteDC(dc.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Consignee</p>
                  <p className="text-sm text-white font-medium">{dc.consignee?.name || 'N/A'}</p>
                  <p className="text-xs text-zinc-400">{dc.consignee?.address?.substring(0, 50)}...</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Transport</p>
                  <p className="text-sm text-white font-medium">{dc.transport?.mode || 'N/A'}</p>
                  {dc.transport?.vehicleNumber && (
                    <p className="text-xs text-zinc-400">Vehicle: {dc.transport.vehicleNumber}</p>
                  )}
                  {dc.transport?.eWayBillNo && (
                    <p className="text-xs text-green-400">E-Way: {dc.transport.eWayBillNo}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <div>
                  <p className="text-xs text-zinc-500">Items</p>
                  <p className="text-sm text-white font-bold">{dc.items?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Total Qty</p>
                  <p className="text-sm text-white font-bold">
                    {dc.items?.reduce((sum: number, item: DCItem) => sum + (item.quantity || 0), 0) || 0}
                  </p>
                </div>
              </div>

              {/* Status Actions */}
              {dc.status !== 'delivered' && (
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  {dc.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(dc.id, 'in_transit')}
                      className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm transition-all flex items-center gap-2"
                    >
                      <Truck className="w-3 h-3" />
                      Mark In Transit
                    </button>
                  )}
                  {dc.status === 'in_transit' && (
                    <button
                      onClick={() => updateStatus(dc.id, 'delivered')}
                      className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-all flex items-center gap-2"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Mark Delivered
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Hidden Print Preview */}
      {selectedDC && (
        <div style={{ display: 'none' }}>
          <DeliveryChallanTemplate ref={printRef} data={selectedDC} copyType="ORIGINAL" />
        </div>
      )}
    </div>
  );
}
