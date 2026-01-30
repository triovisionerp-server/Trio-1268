'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Package, AlertTriangle, XCircle,
  DollarSign, BarChart3, PieChart, Activity, RefreshCw, Download,
  ArrowUpRight, ArrowDownRight, Building2, Truck, Users, Clock,
  Star, CheckCircle, AlertCircle, Filter, Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { analyticsService } from '@/lib/services/erp-services';
import type { InventoryKPIs, SupplierScorecard, ConsumptionTrend } from '@/types/erp-extended';

// ==========================================
// KPI CARD COMPONENT
// ==========================================
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
  onClick?: () => void;
}

function KPICard({ title, value, change, changeLabel, icon, color, trend, subtitle, onClick }: KPICardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 cursor-pointer
        hover:border-zinc-700 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full
            ${trend === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
              trend === 'down' ? 'bg-red-500/20 text-red-400' :
                'bg-zinc-700/50 text-zinc-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
              trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
                <Activity className="w-3 h-3" />}
            {change !== undefined && `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-zinc-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        {changeLabel && <p className="text-xs text-zinc-500">{changeLabel}</p>}
      </div>
    </motion.div>
  );
}

// ==========================================
// MINI CHART COMPONENT
// ==========================================
interface MiniChartProps {
  data: number[];
  color: string;
  height?: number;
}

function MiniChart({ data, color, height = 40 }: MiniChartProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((value, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${((value - min) / range) * 100}%` }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className={`flex-1 rounded-t ${color} min-h-[4px]`}
        />
      ))}
    </div>
  );
}

// ==========================================
// PROGRESS RING COMPONENT
// ==========================================
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label?: string;
}

function ProgressRing({ percentage, size = 80, strokeWidth = 8, color, label }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-white">{percentage.toFixed(0)}%</span>
        {label && <span className="text-xs text-zinc-500">{label}</span>}
      </div>
    </div>
  );
}

// ==========================================
// DEPARTMENT USAGE CHART
// ==========================================
interface DepartmentUsageProps {
  data: { department: string; value: number }[];
}

function DepartmentUsageChart({ data }: DepartmentUsageProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
    'bg-cyan-500', 'bg-yellow-500', 'bg-red-500'
  ];

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((item, i) => (
        <div key={item.department} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">{item.department}</span>
            <span className="text-white font-medium">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`h-full rounded-full ${colors[i % colors.length]}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// SUPPLIER SCORECARD COMPONENT
// ==========================================
interface SupplierCardProps {
  scorecard: SupplierScorecard;
}

function SupplierCard({ scorecard }: SupplierCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">{scorecard.supplierName}</h4>
          <p className="text-xs text-zinc-500">{scorecard.totalOrders} orders</p>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3.5 h-3.5 ${star <= scorecard.overallRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-zinc-500">On-Time Rate</p>
          <p className="text-emerald-400 font-medium">{scorecard.onTimeRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-zinc-500">Quality Pass</p>
          <p className="text-blue-400 font-medium">{scorecard.qualityPassRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-zinc-500">Total Value</p>
          <p className="text-white font-medium">₹{(scorecard.totalPurchaseValue / 100000).toFixed(1)}L</p>
        </div>
        <div>
          <p className="text-zinc-500">Lead Time</p>
          <p className="text-orange-400 font-medium">{scorecard.averageLeadTime} days</p>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// ALERTS SUMMARY COMPONENT
// ==========================================
interface AlertsSummaryProps {
  criticalCount: number;
  warningCount: number;
  outOfStockCount: number;
  onViewAll: () => void;
}

function AlertsSummary({ criticalCount, warningCount, outOfStockCount, onViewAll }: AlertsSummaryProps) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          Stock Alerts
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View All →
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-zinc-300">Out of Stock</span>
          </div>
          <span className="text-red-400 font-bold text-lg">{outOfStockCount}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <span className="text-zinc-300">Critical Low</span>
          </div>
          <span className="text-orange-400 font-bold text-lg">{criticalCount}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-zinc-300">Low Stock</span>
          </div>
          <span className="text-yellow-400 font-bold text-lg">{warningCount}</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN ANALYTICS DASHBOARD PAGE
// ==========================================
export default function AnalyticsDashboardPage() {
  const [kpis, setKpis] = useState<InventoryKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [supplierScorecards, setSupplierScorecards] = useState<SupplierScorecard[]>([]);
  const [consumptionData, setConsumptionData] = useState<number[]>([]);

  // Load KPIs on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const kpiData = await analyticsService.calculateKPIs();
      setKpis(kpiData);

      // Generate sample consumption data for chart
      setConsumptionData(Array.from({ length: 14 }, () => Math.floor(Math.random() * 100) + 20));

      // Load supplier scorecards
      const suppliersSnap = await getDocs(collection(db, 'inventory_suppliers'));
      const scorecards = await Promise.all(
        suppliersSnap.docs.slice(0, 5).map(d => analyticsService.getSupplierScorecard(d.id))
      );
      setSupplierScorecards(scorecards);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Real-time inventory insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 
                text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Primary KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Stock Value"
            value={formatCurrency(kpis?.totalStockValue || 0)}
            icon={<DollarSign className="w-5 h-5 text-white" />}
            color="bg-emerald-600"
            trend="up"
            change={5.2}
            subtitle="Across all materials"
          />
          <KPICard
            title="Total Materials"
            value={kpis?.totalMaterials || 0}
            icon={<Package className="w-5 h-5 text-white" />}
            color="bg-blue-600"
            trend="stable"
            change={0}
            subtitle="Active SKUs"
          />
          <KPICard
            title="Low Stock Items"
            value={kpis?.lowStockItems || 0}
            icon={<AlertTriangle className="w-5 h-5 text-white" />}
            color="bg-orange-600"
            trend={kpis?.lowStockItems ? 'down' : 'stable'}
            change={-2.1}
            subtitle="Below minimum level"
          />
          <KPICard
            title="Out of Stock"
            value={kpis?.outOfStockItems || 0}
            icon={<XCircle className="w-5 h-5 text-white" />}
            color="bg-red-600"
            trend={kpis?.outOfStockItems ? 'down' : 'stable'}
            change={-8.3}
            subtitle="Needs immediate action"
          />
        </div>

        {/* Secondary KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Stock Turnover Rate"
            value={`${(kpis?.stockTurnoverRate || 4.2).toFixed(1)}x`}
            icon={<Activity className="w-5 h-5 text-white" />}
            color="bg-purple-600"
            trend="up"
            change={12.4}
            subtitle="Inventory rotation"
          />
          <KPICard
            title="Fulfillment Rate"
            value={`${(kpis?.fulfillmentRate || 97.5).toFixed(1)}%`}
            icon={<CheckCircle className="w-5 h-5 text-white" />}
            color="bg-teal-600"
            trend="up"
            change={2.8}
            subtitle="Order completion"
          />
          <KPICard
            title="Avg Lead Time"
            value={`${kpis?.averageLeadTime || 5} days`}
            icon={<Clock className="w-5 h-5 text-white" />}
            color="bg-indigo-600"
            trend="down"
            change={-15.2}
            subtitle="From order to delivery"
          />
          <KPICard
            title="Wastage Rate"
            value={`${(kpis?.wastagePercentage || 1.2).toFixed(1)}%`}
            icon={<TrendingDown className="w-5 h-5 text-white" />}
            color="bg-rose-600"
            trend="down"
            change={-5.6}
            subtitle="Material wastage"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Consumption Trend */}
          <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Material Consumption Trend
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-zinc-400">Consumption</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">Purchases</span>
                </div>
              </div>
            </div>
            <div className="h-48">
              <MiniChart data={consumptionData} color="bg-blue-500" height={180} />
            </div>
            <div className="flex justify-between mt-3 text-xs text-zinc-500">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Alerts Summary */}
          <AlertsSummary
            criticalCount={kpis?.criticalItems || 0}
            warningCount={kpis?.lowStockItems || 0}
            outOfStockCount={kpis?.outOfStockItems || 0}
            onViewAll={() => { }}
          />
        </div>

        {/* Department & Supplier Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Usage */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Department Material Usage
              </h3>
              <span className="text-xs text-zinc-500">Last {timeRange}</span>
            </div>
            <DepartmentUsageChart data={kpis?.topConsumingDepartments || []} />
          </div>

          {/* Top Suppliers */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                Supplier Performance
              </h3>
              <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {supplierScorecards.length > 0 ? (
                supplierScorecards.map((scorecard) => (
                  <SupplierCard key={scorecard.supplierId} scorecard={scorecard} />
                ))
              ) : (
                <p className="text-zinc-500 text-sm text-center py-8">No supplier data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Materials Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Moving Materials */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Top Moving Materials
              </h3>
            </div>
            <div className="space-y-2">
              {(kpis?.topMovingMaterials || []).slice(0, 5).map((material, i) => (
                <div
                  key={material.materialId}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/20 
                      text-emerald-400 rounded-full text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-zinc-300">{material.name}</span>
                  </div>
                  <span className="text-emerald-400 font-medium">{material.movement}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slow Moving Materials */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-orange-400" />
                Slow Moving Materials
              </h3>
            </div>
            <div className="space-y-2">
              {(kpis?.slowMovingMaterials || []).slice(0, 5).map((material, i) => (
                <div
                  key={material.materialId}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-orange-500/20 
                      text-orange-400 rounded-full text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-zinc-300">{material.name}</span>
                  </div>
                  <span className="text-orange-400 text-sm">{material.lastMovement}</span>
                </div>
              ))}
              {(kpis?.slowMovingMaterials || []).length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">All materials are moving well</p>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            Performance Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={kpis?.fulfillmentRate || 97.5}
                color="#10b981"
                label="Fulfillment"
              />
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={100 - (kpis?.wastagePercentage || 1.2)}
                color="#3b82f6"
                label="Efficiency"
              />
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={85}
                color="#8b5cf6"
                label="Stock Health"
              />
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={92}
                color="#f59e0b"
                label="On-Time"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-4">
          <span>
            Last updated: {kpis?.calculatedAt ? new Date(kpis.calculatedAt).toLocaleString() : 'Never'}
          </span>
          <span>Data refreshes every 5 minutes</span>
        </div>
      </div>
    </div>
  );
}
