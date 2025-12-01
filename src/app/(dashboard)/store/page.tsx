'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, Package, AlertTriangle, Search, 
  Filter, Plus, ArrowUpRight, History 
} from 'lucide-react';

// --- MOCK INVENTORY DATA ---
const INITIAL_INVENTORY = [
  { id: 1, name: "Polyester Resin (Iso)", category: "Resin", stock: 450, capacity: 1000, unit: "kg", price: 4.5 },
  { id: 2, name: "Gelcoat (White)", category: "Gelcoat", stock: 120, capacity: 500, unit: "kg", price: 8.0 },
  { id: 3, name: "Fiberglass Mat (450gsm)", category: "Fiber", stock: 800, capacity: 2000, unit: "sqm", price: 2.1 },
  { id: 4, name: "Acetone (Cleaning)", category: "Solvent", stock: 15, capacity: 200, unit: "L", price: 3.0 }, // Low Stock!
  { id: 5, name: "Catalyst (MEKP)", category: "Hardener", stock: 40, capacity: 100, unit: "kg", price: 12.0 },
];

export default function StorePage() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate Financial Value
  const totalValue = inventory.reduce((acc, item) => acc + (item.stock * item.price), 0);
  const lowStockItems = inventory.filter(i => (i.stock / i.capacity) < 0.2).length;

  return (
    <div className="space-y-8 font-sans text-white pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-4xl font-light tracking-tight text-white">Store Management</h1>
           <p className="text-zinc-400 mt-1">Inventory & Procurement</p>
        </div>
        <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                <History className="w-4 h-4" /> Logs
            </button>
            <button className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all">
                <Plus className="w-5 h-5" /> Add Material
            </button>
        </div>
      </div>

      {/* 1. KPI CARDS (Glass Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Total Value */}
         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-green-500/20 rounded-2xl border border-green-500/30"><ShoppingCart className="w-6 h-6 text-green-400"/></div>
                <span className="text-zinc-400 text-sm font-medium">Inventory Value</span>
            </div>
            <div className="text-3xl font-light text-white">${totalValue.toLocaleString()}</div>
         </motion.div>

         {/* Low Stock Alert */}
         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/30"><AlertTriangle className="w-6 h-6 text-red-400"/></div>
                <span className="text-zinc-400 text-sm font-medium">Low Stock Alerts</span>
            </div>
            <div className="text-3xl font-light text-white">{lowStockItems} Items</div>
            <div className="text-xs text-red-400 mt-1">Requires immediate order</div>
         </motion.div>

         {/* Total Items */}
         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30"><Package className="w-6 h-6 text-blue-400"/></div>
                <span className="text-zinc-400 text-sm font-medium">Total SKUs</span>
            </div>
            <div className="text-3xl font-light text-white">{inventory.length}</div>
         </motion.div>
      </div>

      {/* 2. STOCK TABLE (Odoo Style Grid) */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[500px]">
         {/* Controls */}
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Package className="w-5 h-5 text-purple-400" /> Stock Database
            </h2>
            <div className="flex gap-3">
               <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input 
                    placeholder="Search material..." 
                    className="pl-9 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-orange-500/50 transition-all w-64"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <button className="p-2 bg-zinc-900/50 border border-white/10 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white"><Filter className="w-5 h-5"/></button>
            </div>
         </div>

         {/* Grid */}
         <div className="overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
               <thead className="bg-black/20 text-zinc-400 uppercase font-bold text-xs">
                  <tr>
                     <th className="p-4">Material Name</th>
                     <th className="p-4">Category</th>
                     <th className="p-4 w-1/3">Stock Level</th>
                     <th className="p-4 text-right">Status</th>
                     <th className="p-4 text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 bg-zinc-900/20">
                  {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => {
                     const percentage = (item.stock / item.capacity) * 100;
                     let statusColor = "bg-green-500";
                     if (percentage < 50) statusColor = "bg-yellow-500";
                     if (percentage < 20) statusColor = "bg-red-500 animate-pulse";

                     return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                           <td className="p-4 font-medium text-white">{item.name}</td>
                           <td className="p-4 text-zinc-400">{item.category}</td>
                           <td className="p-4">
                              <div className="flex justify-between text-xs mb-1 text-zinc-400">
                                 <span>{item.stock} {item.unit}</span>
                                 <span>{item.capacity} {item.unit}</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }} animate={{ width: `${percentage}%` }} 
                                    className={`h-full ${statusColor}`}
                                 />
                              </div>
                           </td>
                           <td className="p-4 text-right">
                              {percentage < 20 ? (
                                 <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-xs font-bold border border-red-500/30">Low Stock</span>
                              ) : (
                                 <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs font-bold border border-green-500/30">Healthy</span>
                              )}
                           </td>
                           <td className="p-4 text-right">
                              <button className="text-zinc-500 hover:text-white transition-colors">
                                 <ArrowUpRight className="w-5 h-5" />
                              </button>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}