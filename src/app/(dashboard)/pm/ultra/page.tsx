'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ClipboardList, Users, BarChart3, Settings,
  Bell, Search, Filter, Plus,
  Clock, CheckCircle, AlertTriangle,
  Package, Calendar, FileText, Box,
  DollarSign, Eye,
  Send, Play, X, ChevronRight,
  Grid, List, Kanban,
  Flag,
  ArrowUpRight, ArrowDownRight,
  Star, MessageSquare
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';
import {
  AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

// ==========================================
// TYPES
// ==========================================
interface CustomerRequest {
  id: string;
  docNo: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  projectNumber: string;
  description: string;
  quantity: number;
  targetCost: number;
  deliverables: string;
  process: string;
  startDate: string;
  deliveryDate: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  progress?: number;
  createdAt: string;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  starred?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Project {
  id: string;
  projectCode: string;
  projectDescription: string;
  status: string;
  percentCompleted: number;
  totalParts: number;
  totalPartsProduced: number;
  targetCompletionDate: string;
  priority: string;
  assignedTeam: string;
  remarks: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  activeProjects: number;
  capacity: number;
  efficiency: number;
  avatar?: string;
}

interface Material {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
}

// ==========================================
// CONSTANTS
// ==========================================
const COLORS = {
  primary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

const STATUS_WORKFLOW = [
  { id: 'Customer Requirements', label: 'Requirements', color: 'zinc' },
  { id: 'Under PM Review', label: 'PM Review', color: 'blue' },
  { id: 'BOM Creation', label: 'BOM', color: 'purple' },
  { id: 'Costing', label: 'Costing', color: 'orange' },
  { id: 'MD Approval', label: 'MD Approval', color: 'yellow' },
  { id: 'In Production', label: 'Production', color: 'cyan' },
  { id: 'Completed', label: 'Completed', color: 'green' },
];

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500', icon: '🔥' },
  high: { label: 'High', color: 'bg-orange-500', icon: '⚡' },
  medium: { label: 'Medium', color: 'bg-blue-500', icon: '📌' },
  low: { label: 'Low', color: 'bg-zinc-500', icon: '📋' },
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PMUltraDashboard() {
  const { user, initializeUser } = useAuthStore();
  
  // Data State
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'projects' | 'team' | 'analytics'>('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban' | 'timeline'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter] = useState('all');
  const [priorityFilter] = useState('all');
  const [assigneeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  
  // Notification State
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(0);

  // ==========================================
  // INITIALIZATION
  // ==========================================
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Load Customer Requests
  useEffect(() => {
    const q = query(
      collection(db, 'customer_requirements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsList: CustomerRequest[] = [];
      let newCount = 0;
      let criticalCount = 0;

      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as CustomerRequest;
        requestsList.push(data);

        // Count new requests (last 5 minutes)
        const createdAt = new Date(data.createdAt);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
        if (diffMinutes < 5 && data.status === 'Customer Requirements') {
          newCount++;
        }

        // Count critical items
        if (data.priority === 'critical' && data.status !== 'Completed') {
          criticalCount++;
        }
      });

      setRequests(requestsList);
      setNewRequestsCount(newCount);
      setCriticalAlerts(criticalCount);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load Materials
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const materialsSnapshot = await getDocs(collection(db, 'materials'));
        const materialsList: Material[] = [];
        materialsSnapshot.forEach((doc) => {
          materialsList.push({ id: doc.id, ...doc.data() } as Material);
        });
        setMaterials(materialsList);
      } catch (error) {
        console.error('Error loading materials:', error);
      }
    };
    loadMaterials();
  }, []);

  // Mock Team Data (replace with real data)
  useEffect(() => {
    setTeamMembers([
      { id: '1', name: 'John Doe', role: 'Senior PM', activeProjects: 5, capacity: 80, efficiency: 95 },
      { id: '2', name: 'Jane Smith', role: 'PM', activeProjects: 3, capacity: 60, efficiency: 92 },
      { id: '3', name: 'Bob Wilson', role: 'Junior PM', activeProjects: 2, capacity: 40, efficiency: 88 },
    ]);
  }, []);

  // ==========================================
  // COMPUTED STATS
  // ==========================================
  const stats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter(r => r.status === 'Completed').length;
    const inProgress = requests.filter(r => 
      ['Under PM Review', 'BOM Creation', 'Costing', 'MD Approval', 'In Production'].includes(r.status)
    ).length;
    const pending = requests.filter(r => r.status === 'Customer Requirements').length;
    const delayed = requests.filter(r => {
      if (r.deliveryDate && r.status !== 'Completed') {
        const dueDate = new Date(r.deliveryDate);
        return dueDate < new Date();
      }
      return false;
    }).length;

    const totalValue = requests.reduce((sum, r) => sum + (r.targetCost || 0), 0);
    const completedValue = requests
      .filter(r => r.status === 'Completed')
      .reduce((sum, r) => sum + (r.targetCost || 0), 0);

    const avgCompletionTime = requests
      .filter(r => r.status === 'Completed' && r.estimatedHours && r.actualHours)
      .reduce((sum, r) => sum + ((r.actualHours || 0) - (r.estimatedHours || 0)), 0) / (completed || 1);

    return {
      total,
      completed,
      inProgress,
      pending,
      delayed,
      critical: criticalAlerts,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalValue,
      completedValue,
      avgCompletionTime: Math.round(avgCompletionTime),
    };
  }, [requests, criticalAlerts]);

  // ==========================================
  // FILTERED DATA
  // ==========================================
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = 
        request.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.projectNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || request.assignedTo === assigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // ==========================================
  // CHART DATA
  // ==========================================
  const statusChartData = useMemo(() => {
    return STATUS_WORKFLOW.map(status => ({
      name: status.label,
      value: requests.filter(r => r.status === status.id).length,
      color: status.color === 'green' ? COLORS.success :
             status.color === 'blue' ? COLORS.info :
             status.color === 'orange' ? COLORS.warning :
             status.color === 'red' ? COLORS.danger :
             COLORS.primary
    }));
  }, [requests]);

  const weeklyTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      new: requests.filter(r => r.createdAt?.startsWith(date)).length,
      completed: requests.filter(r => r.status === 'Completed' && r.createdAt?.startsWith(date)).length,
    }));
  }, [requests]);

  // Priority distribution for future charts
  // const priorityDistribution = useMemo(() => {
  //   return Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
  //     name: config.label,
  //     value: requests.filter(r => r.priority === key).length,
  //     color: config.color.replace('bg-', '').replace('-500', ''),
  //   }));
  // }, [requests]);

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'customer_requirements', requestId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'PM'
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handlePriorityUpdate = async (requestId: string, priority: string) => {
    try {
      await updateDoc(doc(db, 'customer_requirements', requestId), {
        priority,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Priority set to ${priority}`);
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleStarToggle = async (request: CustomerRequest) => {
    try {
      await updateDoc(doc(db, 'customer_requirements', request.id), {
        starred: !request.starred
      });
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // ==========================================
  // RENDER: KPI CARDS
  // ==========================================
  const renderKPICards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <KPICard
        icon={<ClipboardList className="w-5 h-5" />}
        label="Total Requests"
        value={stats.total}
        trend={stats.total > 0 ? 'up' : 'stable'}
        trendValue={12}
        color="from-cyan-500 to-blue-600"
      />
      <KPICard
        icon={<Clock className="w-5 h-5" />}
        label="Pending"
        value={stats.pending}
        badge={newRequestsCount > 0 ? `${newRequestsCount} new` : undefined}
        color="from-zinc-500 to-zinc-600"
      />
      <KPICard
        icon={<Play className="w-5 h-5" />}
        label="In Progress"
        value={stats.inProgress}
        color="from-blue-500 to-blue-600"
      />
      <KPICard
        icon={<CheckCircle className="w-5 h-5" />}
        label="Completed"
        value={stats.completed}
        subtitle={`${stats.completionRate}%`}
        color="from-green-500 to-green-600"
      />
      <KPICard
        icon={<AlertTriangle className="w-5 h-5" />}
        label="Delayed"
        value={stats.delayed}
        badge={stats.delayed > 0 ? 'Action needed' : undefined}
        color="from-red-500 to-red-600"
      />
      <KPICard
        icon={<Flag className="w-5 h-5" />}
        label="Critical"
        value={stats.critical}
        color="from-orange-500 to-orange-600"
      />
    </div>
  );

  // ==========================================
  // RENDER: MAIN CONTENT
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading PM Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-white/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Project Manager Dashboard
              </h1>
              <p className="text-zinc-400 mt-1">Welcome back, {user?.name || 'PM'}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-zinc-400" />
                {(newRequestsCount + criticalAlerts) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Filter className="w-5 h-5 text-zinc-400" />
              </button>
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'requests', label: 'Requests', icon: ClipboardList, badge: stats.pending },
              { id: 'projects', label: 'Projects', icon: Package },
              { id: 'team', label: 'Team', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'dashboard' | 'requests' | 'projects' | 'team' | 'analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {renderKPICards()}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Distribution */}
              <div className="lg:col-span-1 bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Trend */}
              <div className="lg:col-span-2 bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Weekly Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyTrendData}>
                    <defs>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="new" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorNew)" name="New" />
                    <Area type="monotone" dataKey="completed" stroke={COLORS.success} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Requests</h3>
                <button
                  onClick={() => setActiveTab('requests')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {requests.slice(0, 5).map((request) => (
                  <RequestCard key={request.id} request={request} onSelect={setSelectedRequest} compact />
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'requests' && (
          <RequestsView
            requests={filteredRequests}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSelect={setSelectedRequest}
            onStatusUpdate={handleStatusUpdate}
            onPriorityUpdate={handlePriorityUpdate}
            onStarToggle={handleStarToggle}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activeTab === 'team' && (
          <TeamView teamMembers={teamMembers} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView stats={stats} />
        )}
      </div>

      {/* Request Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onStatusUpdate={handleStatusUpdate}
            onPriorityUpdate={handlePriorityUpdate}
            materials={materials}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// KPI CARD COMPONENT
// ==========================================
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  badge?: string;
  color: string;
}

function KPICard({ icon, label, value, subtitle, trend, trendValue, badge, color }: KPICardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-3xl`} />
      
      <div className="relative">
        <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${color} bg-opacity-20 mb-3`}>
          {icon}
        </div>
        
        <p className="text-zinc-400 text-sm mb-1">{label}</p>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-zinc-500 text-sm pb-1">{subtitle}</p>}
        </div>
        
        {badge && (
          <span className="inline-block mt-2 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
            {badge}
          </span>
        )}
        
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{trendValue}% vs last month</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// REQUEST CARD COMPONENT
// ==========================================
interface RequestCardProps {
  request: CustomerRequest;
  onSelect: (request: CustomerRequest) => void;
  compact?: boolean;
}

function RequestCard({ request, onSelect, compact = false }: RequestCardProps) {
  const priority = PRIORITY_CONFIG[request.priority || 'medium'];
  const isDelayed = request.deliveryDate && new Date(request.deliveryDate) < new Date() && request.status !== 'Completed';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => onSelect(request)}
      className={`bg-zinc-900/50 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-cyan-500/50 transition-all ${
        compact ? '' : 'lg:p-6'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-zinc-500">{request.docNo}</span>
            {request.starred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {isDelayed && <AlertTriangle className="w-3 h-3 text-red-400" />}
          </div>
          
          <h4 className="font-semibold text-white truncate mb-1">{request.projectName}</h4>
          <p className="text-sm text-zinc-400 truncate">{request.customerName}</p>
          
          {!compact && (
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(request.deliveryDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                Qty: {request.quantity}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ₹{(request.targetCost || 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2 py-1 rounded ${priority.color} text-white`}>
            {priority.icon} {priority.label}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">
            {request.status}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// REQUESTS VIEW
// ==========================================
interface RequestsViewProps {
  requests: CustomerRequest[];
  viewMode: string;
  onViewModeChange: (mode: 'grid' | 'list' | 'kanban' | 'timeline') => void;
  onSelect: (request: CustomerRequest) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onPriorityUpdate: (id: string, priority: string) => void;
  onStarToggle: (request: CustomerRequest) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function RequestsView({ 
  requests, 
  viewMode, 
  onViewModeChange, 
  onSelect, 
  searchQuery, 
  onSearchChange 
}: RequestsViewProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search projects, customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`p-2 rounded-lg ${viewMode === 'kanban' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
          >
            <Kanban className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} onSelect={onSelect} />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} onSelect={onSelect} compact />
          ))}
        </div>
      )}

      {viewMode === 'kanban' && (
        <KanbanBoard requests={requests} onSelect={onSelect} />
      )}

      {requests.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No requests found</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// KANBAN BOARD
// ==========================================
function KanbanBoard({ requests, onSelect }: { requests: CustomerRequest[]; onSelect: (request: CustomerRequest) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_WORKFLOW.map((status) => {
        const statusRequests = requests.filter(r => r.status === status.id);
        
        return (
          <div key={status.id} className="flex-shrink-0 w-80">
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">{status.label}</h3>
                <span className="text-xs bg-zinc-800 px-2 py-1 rounded">{statusRequests.length}</span>
              </div>
              
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {statusRequests.map((request) => (
                  <RequestCard key={request.id} request={request} onSelect={onSelect} compact />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// REQUEST DETAIL MODAL
// ==========================================
interface RequestDetailModalProps {
  request: CustomerRequest;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string) => void;
  onPriorityUpdate: (id: string, priority: string) => void;
  materials?: Material[];
}

function RequestDetailModal({ request, onClose, onStatusUpdate, onPriorityUpdate }: RequestDetailModalProps) {
  const [activeSection, setActiveSection] = useState<'details' | 'bom' | 'notes' | 'timeline'>('details');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">{request.docNo}</p>
              <h2 className="text-2xl font-bold">{request.projectName}</h2>
              <p className="text-zinc-400 mt-1">{request.customerName}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'bom', label: 'BOM', icon: Box },
              { id: 'notes', label: 'Notes', icon: MessageSquare },
              { id: 'timeline', label: 'Timeline', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as 'details' | 'bom' | 'notes' | 'timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === tab.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Project Number" value={request.projectNumber} />
                <InfoField label="Customer Email" value={request.customerEmail} />
                <InfoField label="Quantity" value={request.quantity.toString()} />
                <InfoField label="Target Cost" value={`₹${request.targetCost?.toLocaleString() || 0}`} />
                <InfoField label="Start Date" value={new Date(request.startDate).toLocaleDateString()} />
                <InfoField label="Delivery Date" value={new Date(request.deliveryDate).toLocaleDateString()} />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description</label>
                <p className="text-white bg-zinc-800 p-4 rounded-lg">{request.description}</p>
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Process</label>
                <p className="text-white bg-zinc-800 p-4 rounded-lg">{request.process}</p>
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Deliverables</label>
                <p className="text-white bg-zinc-800 p-4 rounded-lg">{request.deliverables}</p>
              </div>
            </div>
          )}
          
          {activeSection === 'bom' && (
            <div className="text-center py-12 text-zinc-500">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>BOM Builder Integration</p>
              <button className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
                Create BOM
              </button>
            </div>
          )}
          
          {activeSection === 'notes' && (
            <div className="space-y-4">
              <textarea
                placeholder="Add notes..."
                className="w-full bg-zinc-800 border border-white/10 rounded-lg p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                rows={10}
              />
              <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
                Save Notes
              </button>
            </div>
          )}
          
          {activeSection === 'timeline' && (
            <div className="space-y-4">
              <TimelineItem
                date={request.createdAt}
                title="Request Created"
                description={`Created by ${request.customerName}`}
                icon={<Plus className="w-4 h-4" />}
              />
              <TimelineItem
                date={new Date().toISOString()}
                title="Under Review"
                description="PM reviewing requirements"
                icon={<Eye className="w-4 h-4" />}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <select
            value={request.status}
            onChange={(e) => onStatusUpdate(request.id, e.target.value)}
            className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
          >
            {STATUS_WORKFLOW.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          
          <select
            value={request.priority || 'medium'}
            onChange={(e) => onPriorityUpdate(request.id, e.target.value)}
            className="bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
          >
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <button className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Action
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

function TimelineItem({ date, title, description, icon }: {
  date: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          {icon}
        </div>
        <div className="w-0.5 h-full bg-zinc-800 mt-2" />
      </div>
      <div className="flex-1 pb-8">
        <p className="text-xs text-zinc-500">{new Date(date).toLocaleString()}</p>
        <p className="font-semibold mt-1">{title}</p>
        <p className="text-sm text-zinc-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

function TeamView({ teamMembers }: { teamMembers: TeamMember[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teamMembers.map((member) => (
        <div key={member.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {member.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-zinc-400">{member.role}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Active Projects</span>
                <span className="text-white">{member.activeProjects}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Capacity</span>
                <span className="text-white">{member.capacity}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${member.capacity > 80 ? 'bg-red-500' : 'bg-cyan-500'}`}
                  style={{ width: `${member.capacity}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Efficiency</span>
                <span className="text-green-400">{member.efficiency}%</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatsType {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  delayed: number;
  critical: number;
  completionRate: number;
  totalValue: number;
  completedValue: number;
  avgCompletionTime: number;
}

function AnalyticsView({ stats }: { stats: StatsType }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Total Value</p>
          <p className="text-3xl font-bold">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
          <p className="text-xs text-zinc-500 mt-2">Across all projects</p>
        </div>
        
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Completed Value</p>
          <p className="text-3xl font-bold text-green-400">₹{(stats.completedValue / 100000).toFixed(1)}L</p>
          <p className="text-xs text-zinc-500 mt-2">Successfully delivered</p>
        </div>
        
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Completion Rate</p>
          <p className="text-3xl font-bold text-cyan-400">{stats.completionRate}%</p>
          <p className="text-xs text-zinc-500 mt-2">Overall performance</p>
        </div>
        
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm mb-1">Avg Delay</p>
          <p className="text-3xl font-bold text-orange-400">{Math.abs(stats.avgCompletionTime)}h</p>
          <p className="text-xs text-zinc-500 mt-2">Time variance</p>
        </div>
      </div>
      
      <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <span className="text-zinc-400">On-Time Delivery Rate</span>
            <span className="text-green-400 font-semibold">{((stats.completed / stats.total) * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <span className="text-zinc-400">Critical Projects</span>
            <span className="text-red-400 font-semibold">{stats.critical}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-zinc-400">Average Project Duration</span>
            <span className="text-cyan-400 font-semibold">24 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
