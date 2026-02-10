'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, Clock, CheckCircle, Plus, List } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import CreateDCForm from './CreateDCForm';
import DCList from './DCList';

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [stats, setStats] = useState({
    ready: 0,
    inTransit: 0,
    delivered: 0,
    total: 0
  });

  // Real-time stats from Firebase
  useEffect(() => {
    const q = query(collection(db, 'delivery_challans'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      interface DCDoc { id: string; status?: string; [key: string]: unknown }
      const dcs: DCDoc[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStats({
        ready: dcs.filter((dc) => dc.status === 'pending').length,
        inTransit: dcs.filter((dc) => dc.status === 'in_transit').length,
        delivered: dcs.filter((dc) => dc.status === 'delivered').length,
        total: dcs.length
      });
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl">
              <Truck className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dispatch & Logistics</h1>
              <p className="text-zinc-500">Manage delivery challans and shipments</p>
            </div>
          </div>
          
          {/* Tab Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <List className="w-4 h-4" />
              DC List
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <Plus className="w-4 h-4" />
              Create DC
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.ready}</p>
                <p className="text-xs text-zinc-500">Ready to Ship</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inTransit}</p>
                <p className="text-xs text-zinc-500">In Transit</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.delivered}</p>
                <p className="text-xs text-zinc-500">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <Truck className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-zinc-500">Total DCs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'create' ? <CreateDCForm /> : <DCList />}
      </motion.div>
    </div>
  );
}
