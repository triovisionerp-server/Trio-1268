'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PackageCheck, Box, TrendingUp, AlertTriangle } from 'lucide-react';

export default function FGStorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-emerald-500/20 rounded-2xl">
            <PackageCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Finished Goods Store</h1>
            <p className="text-zinc-500">Completed products ready for dispatch</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-zinc-500">Completed Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Box className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-zinc-500">In Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-zinc-500">Dispatched</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-zinc-500">Pending QC</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <PackageCheck className="w-16 h-16 text-emerald-400/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Finished Goods Store</h2>
          <p className="text-zinc-500">
            Track completed products from production. <br />
            Manage inventory and coordinate with dispatch team.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
