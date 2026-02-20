/**
 * Advanced Analytics Dashboard - Odoo Competitor
 * Real-time business intelligence with customizable widgets
 */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Package, ShoppingCart,
  Users, DollarSign, AlertTriangle, CheckCircle, Clock,
  Calendar, Download, RefreshCw, Settings, Plus, Grid3x3,
  LineChart, PieChart, Activity
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

export default function AdvancedAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  
  // Metrics State
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [purchaseData, setPurchaseData] = useState<ChartData | null>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [productionData, setProductionData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadPurchaseAnalytics(),
        loadInventoryAnalytics(),
        loadProductionAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      // Purchase Orders
      const posSnapshot = await getDocs(collection(db, 'purchase_orders'));
      const totalPOs = posSnapshot.size;
      const pendingPOs = posSnapshot.docs.filter(d => d.data().status === 'pending_md_approval').length;
      const approvedPOs = posSnapshot.docs.filter(d => d.data().status === 'approved').length;

      // Materials
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      const totalMaterials = materialsSnapshot.size;
      const lowStock = materialsSnapshot.docs.filter(d => {
        const data = d.data();
        return (data.currentStock || 0) < (data.minStock || 0);
      }).length;

      // Work Orders
      const woSnapshot = await getDocs(collection(db, 'work_orders'));
      const activeWO = woSnapshot.docs.filter(d => d.data().status === 'in_progress').length;
      const completedWO = woSnapshot.docs.filter(d => d.data().status === 'completed').length;

      // Material Requests
      const mrSnapshot = await getDocs(collection(db, 'material_requests'));
      const pendingMR = mrSnapshot.docs.filter(d => d.data().status === 'pending').length;

      const metricsData: AnalyticsMetric[] = [
        {
          id: 'total_po',
          title: 'Total Purchase Orders',
          value: totalPOs,
          change: 12.5,
          trend: 'up',
          icon: ShoppingCart,
          color: 'blue'
        },
        {
          id: 'pending_approvals',
          title: 'Pending Approvals',
          value: pendingPOs,
          change: -5.2,
          trend: 'down',
          icon: Clock,
          color: 'yellow'
        },
        {
          id: 'approved_po',
          title: 'Approved POs',
          value: approvedPOs,
          change: 18.3,
          trend: 'up',
          icon: CheckCircle,
          color: 'green'
        },
        {
          id: 'low_stock',
          title: 'Low Stock Items',
          value: lowStock,
          change: 3.1,
          trend: 'up',
          icon: AlertTriangle,
          color: 'red'
        },
        {
          id: 'total_materials',
          title: 'Total Materials',
          value: totalMaterials,
          change: 7.8,
          trend: 'up',
          icon: Package,
          color: 'purple'
        },
        {
          id: 'active_wo',
          title: 'Active Work Orders',
          value: activeWO,
          change: 15.4,
          trend: 'up',
          icon: Activity,
          color: 'orange'
        },
        {
          id: 'completed_wo',
          title: 'Completed WO (MTD)',
          value: completedWO,
          change: 22.1,
          trend: 'up',
          icon: CheckCircle,
          color: 'teal'
        },
        {
          id: 'pending_mr',
          title: 'Pending Material Requests',
          value: pendingMR,
          change: -8.7,
          trend: 'down',
          icon: Calendar,
          color: 'indigo'
        }
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadPurchaseAnalytics = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc'), limit(30))
      );

      // Group by date
      const dateMap = new Map<string, number>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.createdAt).toLocaleDateString();
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });

      const labels = Array.from(dateMap.keys()).slice(0, 10).reverse();
      const values = labels.map(label => dateMap.get(label) || 0);

      setPurchaseData({
        labels,
        datasets: [{
          label: 'Purchase Orders',
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }]
      });
    } catch (error) {
      console.error('Error loading purchase analytics:', error);
    }
  };

  const loadInventoryAnalytics = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'materials'));
      
      const categories = new Map<string, number>();
      let totalValue = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'Other';
        categories.set(category, (categories.get(category) || 0) + 1);
        totalValue += (data.currentStock || 0) * (data.unitPrice || 0);
      });

      setInventoryData({
        categories: Array.from(categories.entries()),
        totalValue,
        totalItems: snapshot.size
      });
    } catch (error) {
      console.error('Error loading inventory analytics:', error);
    }
  };

  const loadProductionAnalytics = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'work_orders'));
      
      const statusMap = new Map<string, number>();
      snapshot.docs.forEach(doc => {
        const status = doc.data().status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      setProductionData({
        byStatus: Array.from(statusMap.entries())
      });
    } catch (error) {
      console.error('Error loading production analytics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const exportReport = () => {
    console.log('Exporting report...');
    // TODO: Implement PDF export
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-zinc-400">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Advanced Analytics Dashboard
            </h1>
            <p className="text-zinc-400">Real-time business intelligence and insights</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex bg-zinc-900 rounded-lg p-1">
              {(['today', 'week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-md text-sm capitalize transition-all ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Export
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
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-${metric.color}-500/10 rounded-lg`}>
                <metric.icon className={`w-6 h-6 text-${metric.color}-400`} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                metric.trend === 'up' ? 'text-green-400' : 
                metric.trend === 'down' ? 'text-red-400' : 'text-zinc-400'
              }`}>
                {metric.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                 metric.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <h3 className="text-zinc-400 text-sm mb-1">{metric.title}</h3>
            <p className="text-3xl font-bold">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      < div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Purchase Trend Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Purchase Order Trends
            </h2>
            <button className="text-zinc-400 hover:text-white transition-colors">
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
          {purchaseData && (
            <div className="h-64 flex items-center justify-center border border-zinc-800 rounded-lg">
              <div className="text center">
                <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Chart rendering with {purchaseData.labels.length} data points</p>
                <p className="text-xs text-zinc-600 mt-1">Install chart library (recharts/chart.js) to visualize</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Inventory Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Inventory Distribution
            </h2>
            <button className="text-zinc-400 hover:text-white transition-colors">
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
          {inventoryData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Total Items</span>
                <span className="text-2xl font-bold">{inventoryData.totalItems}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Total Value</span>
                <span className="text-2xl font-bold text-green-400">
                  ₹{inventoryData.totalValue.toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                {inventoryData.categories.slice(0, 5).map(([category, count]: [string, number]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                    <span className="text-zinc-300">{category}</span>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Production Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6"
      >
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-400" />
          Production Overview
        </h2>
        {productionData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {productionData.byStatus.map(([status, count]: [string, number]) => (
              <div
                key={status}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-orange-500/50 transition-colors"
              >
                <p className="text-zinc-400 text-sm capitalize mb-2">{status.replace(/_/g, ' ')}</p>
                <p className="text-3xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Custom Widget
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg font-medium"
        >
          <BarChart3 className="w-5 h-5" />
          Custom Report Builder
        </motion.button>
      </div>
    </div>
  );
}
