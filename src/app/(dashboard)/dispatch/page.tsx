'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, Clock, CheckCircle } from 'lucide-react';

export default function DispatchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-orange-500/20 rounded-2xl">
            <Truck className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Dispatch & Logistics</h1>
            <p className="text-zinc-500">Manage shipments and deliveries</p>
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
                <p className="text-2xl font-bold text-white">0</p>
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
                <p className="text-2xl font-bold text-white">0</p>
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
                <p className="text-2xl font-bold text-white">0</p>
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
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-zinc-500">Total Shipments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Truck className="w-16 h-16 text-orange-400/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Dispatch Module</h2>
          <p className="text-zinc-500">
            Manage finished goods dispatch and delivery tracking. <br />
            Connect with FG Store to ship completed products.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
