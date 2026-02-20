/**
 * Module Management Admin Page
 * Central control panel for all ERP modules - Odoo-style
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Search, Filter, Grid, List, Download, Upload,
  Settings, CheckCircle, XCircle, AlertTriangle, Info,
  TrendingUp, Users, DollarSign, BarChart3, Zap, Shield,
  Star, ExternalLink, RefreshCw, Play, Pause, Trash2,
  Plus, Eye, Edit
} from 'lucide-react';
import { MODULE_REGISTRY, MODULE_CATEGORIES, getActiveModules, getModulesByCategory } from '@/config/modules';
import { ModuleConfig } from '@/types/module';

const ICON_MAP: Record<string, any> = {
  Factory: Package,
  Package,
  ShoppingCart: Package,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  Wrench: Settings,
  BarChart3,
  Link: ExternalLink
};

export default function ModuleManagementPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<ModuleConfig | null>(null);

  const getFilteredModules = () => {
    let filtered = MODULE_REGISTRY;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'beta':
        return 'yellow';
      case 'inactive':
        return 'gray';
      case 'disabled':
        return 'red';
      default:
        return 'blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'beta':
        return AlertTriangle;
      case 'inactive':
        return XCircle;
      case 'disabled':
        return XCircle;
      default:
        return Info;
    }
  };

  const getCategoryIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Package;
  };

  const filteredModules = getFilteredModules();
  const activeModulesCount = getActiveModules().length;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Module Management
            </h1>
            <p className="text-zinc-400">
              Manage and configure your ERP modules • {activeModulesCount} active modules
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Install Module
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Modules', value: MODULE_REGISTRY.length, icon: Package, color: 'blue' },
            { label: 'Active', value: activeModulesCount, icon: CheckCircle, color: 'green' },
            { label: 'Beta', value: MODULE_REGISTRY.filter(m => m.status === 'beta').length, icon: AlertTriangle, color: 'yellow' },
            { label: 'Categories', value: Object.keys(MODULE_CATEGORIES).length, icon: Grid, color: 'purple' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-500/10 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search modules, features..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(MODULE_CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="beta">Beta</option>
              <option value="inactive">Inactive</option>
              <option value="disabled">Disabled</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-zinc-700'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-zinc-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module, index) => {
            const StatusIcon = getStatusIcon(module.status);
            const statusColor = getStatusColor(module.status);
            const CategoryIcon = getCategoryIcon(MODULE_CATEGORIES[module.category]?.icon || 'Package');

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => setSelectedModule(module)}
              >
                {/* Module Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-${MODULE_CATEGORIES[module.category]?.color || 'blue'}-500/10 rounded-lg`}>
                    <CategoryIcon className={`w-6 h-6 text-${MODULE_CATEGORIES[module.category]?.color || 'blue'}-400`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 bg-${statusColor}-500/10 text-${statusColor}-400 text-xs font-medium rounded-full flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {module.status}
                    </span>
                  </div>
                </div>

                {/* Module Info */}
                <h3 className="text-lg font-semibold text-white mb-2">{module.name}</h3>
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{module.description}</p>

                {/* Version & Category */}
                <div className="flex items-center gap-3 mb-4 text-xs text-zinc-500">
                  <span>v{module.version}</span>
                  <span>•</span>
                  <span className="capitalize">{MODULE_CATEGORIES[module.category]?.label}</span>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <p className="text-xs text-zinc-600 mb-2">{module.features.length} Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {module.features.slice(0, 3).map((feature, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800/50 text-zinc-400 text-xs rounded">
                        {feature}
                      </span>
                    ))}
                    {module.features.length > 3 && (
                      <span className="px-2 py-1 bg-zinc-800/50 text-zinc-400 text-xs rounded">
                        +{module.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Configure', module.id);
                    }}
                  >
                    Configure
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('View details', module.id);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredModules.map((module, index) => {
            const StatusIcon = getStatusIcon(module.status);
            const statusColor = getStatusColor(module.status);
            const CategoryIcon = getCategoryIcon(MODULE_CATEGORIES[module.category]?.icon || 'Package');

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-${MODULE_CATEGORIES[module.category]?.color || 'blue'}-500/10 rounded-lg`}>
                    <CategoryIcon className={`w-6 h-6 text-${MODULE_CATEGORIES[module.category]?.color || 'blue'}-400`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{module.name}</h3>
                      <span className={`px-2 py-1 bg-${statusColor}-500/10 text-${statusColor}-400 text-xs font-medium rounded-full flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {module.status}
                      </span>
                      <span className="text-xs text-zinc-500">v{module.version}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">{module.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {module.features.slice(0, 5).map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-800/50 text-zinc-400 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                    >
                      Configure
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {filteredModules.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <Package className="w-16 h-16 text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">No modules found</h3>
          <p className="text-sm text-zinc-600">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
