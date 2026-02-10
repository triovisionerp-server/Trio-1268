"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ShoppingCart, Package, Activity, AlertTriangle, CheckCircle, 
  Zap, Award, BarChart3, Eye, FileText, Settings, Bell, Boxes, IndianRupee, 
  Download, ChevronRight, ChevronLeft, X, AlertCircle, LayoutDashboard, 
  ExternalLink, Calendar as CalendarIcon, CheckSquare, Clock, Users, Target,
  Plus, Trash2, Edit, Filter, MoreVertical, Play, Pause, Send, MessageSquare,
  TrendingDown, PieChart, LineChart, DollarSign, Briefcase, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/purchase';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'meeting' | 'deadline' | 'event';
  attendees?: string[];
  description?: string;
}

interface TeamActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
}

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
};

const slideIn = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const REVENUE_DATA = [
  { month: 'Jan', revenue: 42, target: 40, growth: 105 },
  { month: 'Feb', revenue: 45, target: 43, growth: 104 },
  { month: 'Mar', revenue: 51, target: 46, growth: 111 },
  { month: 'Apr', revenue: 48, target: 48, growth: 100 },
  { month: 'May', revenue: 53, target: 50, growth: 106 },
  { month: 'Jun', revenue: 58, target: 52, growth: 112 },
];

const DEPT_EFFICIENCY = [
  { name: 'Stock', efficiency: 94 },
  { name: 'Machine', efficiency: 87 },
  { name: 'Laminate', efficiency: 96 },
  { name: 'Assembly', efficiency: 91 },
  { name: 'Quality', efficiency: 98 },
  { name: 'Welding', efficiency: 89 },
];

const PROJECT_STATUS = [
  { name: 'Completed', value: 35, color: '#10b981' },
  { name: 'In Progress', value: 45, color: '#3b82f6' },
  { name: 'Planning', value: 15, color: '#f59e0b' },
  { name: 'On Hold', value: 5, color: '#ef4444' },
];

const QUALITY_METRICS = [
  { subject: 'Accuracy', Current: 95, Target: 90 },
  { subject: 'Efficiency', Current: 92, Target: 88 },
  { subject: 'Safety', Current: 98, Target: 95 },
  { subject: 'Output', Current: 88, Target: 85 },
  { subject: 'Quality', Current: 94, Target: 90 },
  { subject: 'Delivery', Current: 91, Target: 88 },
];

const COLORS = {
  primary: '#06b6d4',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdvancedMDDashboard() {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [tab, setTab] = useState<'overview' | 'analytics' | 'calendar' | 'tasks' | 'team'>('overview');
  const [showAlerts, setShowAlerts] = useState(false);
  const [materials, setMaterials] = useState<Array<{id: string; current_stock?: number; min_stock?: number; unit_price?: number; name?: string; category?: string}>>([]);
  const [orders, setOrders] = useState<Array<{id: string; status?: string; poNumber?: string; supplierName?: string; totalAmount?: number}>>([]);
  
  // Calendar & Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([]);
  
  const [userName] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          return user.displayName?.split(' ')[0] || 'Director';
        } catch {}
      }
    }
    return 'Director';
  });

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'inventory_materials'),
      (snapshot) => setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.PURCHASE_ORDERS),
      (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
    return () => unsubscribe();
  }, []);

  // Fetch tasks
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'md_tasks'),
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(tasksData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch calendar events
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'md_events'),
      (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
        setEvents(eventsData);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch team activities
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'team_activities'),
      (snapshot) => {
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamActivity));
        setTeamActivities(activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10));
      }
    );
    return () => unsubscribe();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CALCULATIONS
  // ═══════════════════════════════════════════════════════════════
  const lowStock = materials.filter(m => (m.current_stock || 0) <= (m.min_stock || 0) && (m.current_stock || 0) > 0).length;
  const pendingApprovals = orders.filter(po => po.status === 'pending_md_approval').length;
  const totalValue = materials.reduce((sum, m) => sum + ((m.current_stock || 0) * (m.unit_price || 0)), 0);
  
  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const taskDate = new Date(t.dueDate);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  }).length;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const greeting = time.getHours() < 12 ? 'Good Morning' : time.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = time.getHours() < 12 ? '☀️' : time.getHours() < 17 ? '🌤️' : '🌙';

  const kpis = [
    { label: 'Revenue', value: '₹58L', change: 12.5, trend: 'up', icon: IndianRupee, color: 'emerald', target: '₹52L' },
    { label: 'Active Projects', value: 24, change: 8.3, trend: 'up', icon: Briefcase, color: 'blue', target: '20' },
    { label: 'Efficiency', value: '94%', change: 3.2, trend: 'up', icon: Zap, color: 'purple', target: '90%' },
    { label: 'Quality Score', value: '98%', change: 1.5, trend: 'up', icon: Award, color: 'amber', target: '95%' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // CALENDAR HELPERS
  // ═══════════════════════════════════════════════════════════════
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const changeMonth = (delta: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1));
  };

  // ═══════════════════════════════════════════════════════════════
  // TASK HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const addTask = async (taskData: Partial<Task>) => {
    try {
      await addDoc(collection(db, 'md_tasks'), {
        ...taskData,
        createdAt: new Date().toISOString(),
        status: 'todo'
      });
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await updateDoc(doc(db, 'md_tasks', taskId), { status });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'md_tasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const addEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      await addDoc(collection(db, 'md_events'), eventData);
      setShowEventModal(false);
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER SECTIONS
  // ═══════════════════════════════════════════════════════════════
  const renderOverview = () => (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            variants={fadeIn}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`relative overflow-hidden bg-gradient-to-br from-${kpi.color}-500/10 via-${kpi.color}-500/5 to-transparent backdrop-blur-sm border border-white/10 rounded-2xl p-6 group cursor-pointer`}
          >
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${kpi.color}-500/10 rounded-full blur-3xl group-hover:blur-2xl transition-all`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${kpi.color}-500/10 border border-${kpi.color}-500/20`}>
                  <kpi.icon className={`w-6 h-6 text-${kpi.color}-400`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${kpi.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  <TrendingUp className="w-4 h-4" />
                  {kpi.change}%
                </div>
              </div>
              <p className="text-zinc-400 text-sm mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold text-white mb-1`}>{kpi.value}</p>
              <p className="text-xs text-zinc-500">Target: {kpi.target}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <motion.div variants={fadeIn} className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">Revenue Performance</h3>
              <p className="text-sm text-zinc-400">Monthly trends vs targets (₹ Lakhs)</p>
            </div>
            <button onClick={() => setTab('analytics')} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm">
              Analytics <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill="url(#revenue)" name="Revenue" />
              <Area type="monotone" dataKey="target" stroke={COLORS.warning} fill="none" strokeDasharray="5 5" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Today's Schedule */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Today's Schedule</h3>
            <button 
              onClick={() => setTab('calendar')}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <CalendarIcon className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
          <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar">
            {getEventsForDate(new Date()).length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No events today</p>
              </div>
            ) : (
              getEventsForDate(new Date()).map(event => (
                <div key={event.id} className={`p-3 rounded-xl border ${
                  event.type === 'meeting' ? 'bg-blue-500/10 border-blue-500/20' :
                  event.type === 'deadline' ? 'bg-red-500/10 border-red-500/20' :
                  'bg-purple-500/10 border-purple-500/20'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${
                      event.type === 'meeting' ? 'bg-blue-400' :
                      event.type === 'deadline' ? 'bg-red-400' : 'bg-purple-400'
                    }`} />
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm">{event.title}</h4>
                      {event.time && <p className="text-zinc-400 text-xs mt-1">{event.time}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => { setShowEventModal(true); setTab('calendar'); }}
            className="w-full mt-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </motion.div>
      </div>

      {/* Project Status & Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Project Distribution</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={PROJECT_STATUS}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PROJECT_STATUS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Priority Tasks */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Priority Tasks</h3>
            <button 
              onClick={() => setTab('tasks')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
            {tasks.filter(t => t.priority === 'high' && t.status !== 'completed').slice(0, 5).map(task => (
              <div key={task.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">{task.title}</h4>
                    {task.dueDate && (
                      <p className="text-zinc-400 text-xs mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => updateTaskStatus(task.id, 'completed')}
                    className="p-1 hover:bg-white/10 rounded transition-all"
                  >
                    <CheckCircle className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No high priority tasks</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickActionBtn icon={FileText} label="Approvals" count={pendingApprovals} onClick={() => router.push('/purchase')} />
        <QuickActionBtn icon={Package} label="Inventory" count={lowStock} onClick={() => router.push('/empStore')} />
        <QuickActionBtn icon={CalendarIcon} label="Calendar" count={todayTasks} onClick={() => setTab('calendar')} />
        <QuickActionBtn icon={Users} label="Team" onClick={() => setTab('team')} />
      </div>
    </motion.div>
  );

  const renderAnalytics = () => (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Metrics */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Quality Metrics Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={QUALITY_METRICS}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" stroke="#666" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
              <Radar name="Current" dataKey="Current" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
              <Radar name="Target" dataKey="Target" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.1} />
              <Legend />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Efficiency */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Department Efficiency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={DEPT_EFFICIENCY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis domain={[0, 100]} stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '8px' }} />
              <Bar dataKey="efficiency" fill={COLORS.success} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Export & Actions */}
      <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Export Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ExportBtn icon={Download} label="Production Report" period="Last 30 days" />
          <ExportBtn icon={Download} label="Financial Summary" period="Q1 2026" />
          <ExportBtn icon={Download} label="Inventory Status" period="Current" />
          <ExportBtn icon={Download} label="Quality Metrics" period="This month" />
        </div>
      </motion.div>
    </motion.div>
  );

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedDate);
    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return (
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-white">{monthName}</h3>
              <p className="text-sm text-zinc-400 mt-1">{events.length} events scheduled</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/30 transition-all">
                Today
              </button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setShowEventModal(true)}
                className="ml-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center py-2 text-zinc-400 font-medium text-sm">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
              const dayEvents = getEventsForDate(currentDate);
              const isToday = currentDate.toDateString() === new Date().toDateString();
              
              return (
                <motion.div
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  className={`aspect-square p-2 rounded-xl border transition-all cursor-pointer ${
                    isToday 
                      ? 'bg-cyan-500/20 border-cyan-500/40' 
                      : dayEvents.length > 0 
                      ? 'bg-white/5 border-white/20 hover:border-white/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-white font-medium text-sm mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs px-2 py-1 rounded truncate ${
                          event.type === 'meeting' ? 'bg-blue-500/20 text-blue-300' :
                          event.type === 'deadline' ? 'bg-red-500/20 text-red-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-zinc-400">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Upcoming Events</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {events
              .filter(e => new Date(e.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 10)
              .map(event => (
                <div key={event.id} className={`p-4 rounded-xl border ${
                  event.type === 'meeting' ? 'bg-blue-500/10 border-blue-500/20' :
                  event.type === 'deadline' ? 'bg-red-500/10 border-red-500/20' :
                  'bg-purple-500/10 border-purple-500/20'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{event.title}</h4>
                      <p className="text-zinc-400 text-sm mt-1">
                        {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        {event.time && ` • ${event.time}`}
                      </p>
                      {event.description && (
                        <p className="text-zinc-500 text-sm mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            {events.filter(e => new Date(e.date) >= new Date()).length === 0 && (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No upcoming events</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderTasks = () => {
    const tasksByStatus = {
      todo: tasks.filter(t => t.status === 'todo'),
      inProgress: tasks.filter(t => t.status === 'in-progress'),
      completed: tasks.filter(t => t.status === 'completed'),
    };

    return (
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div variants={fadeIn} className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckSquare className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{totalTasks}</span>
            </div>
            <p className="text-zinc-400 text-sm">Total Tasks</p>
          </motion.div>
          
          <motion.div variants={fadeIn} className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-amber-400" />
              <span className="text-2xl font-bold text-white">{tasksByStatus.todo.length}</span>
            </div>
            <p className="text-zinc-400 text-sm">To Do</p>
          </motion.div>
          
          <motion.div variants={fadeIn} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{tasksByStatus.inProgress.length}</span>
            </div>
            <p className="text-zinc-400 text-sm">In Progress</p>
          </motion.div>
          
          <motion.div variants={fadeIn} className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white">{taskCompletionRate}%</span>
            </div>
            <p className="text-zinc-400 text-sm">Completion Rate</p>
          </motion.div>
        </div>

        {/* Task Board */}
        <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Task Board</h3>
            <button
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* To Do Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <h4 className="text-white font-medium">To Do ({tasksByStatus.todo.length})</h4>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {tasksByStatus.todo.map(task => (
                  <TaskCard key={task.id} task={task} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <h4 className="text-white font-medium">In Progress ({tasksByStatus.inProgress.length})</h4>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {tasksByStatus.inProgress.map(task => (
                  <TaskCard key={task.id} task={task} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} />
                ))}
              </div>
            </div>

            {/* Completed Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <h4 className="text-white font-medium">Completed ({tasksByStatus.completed.length})</h4>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {tasksByStatus.completed.map(task => (
                  <TaskCard key={task.id} task={task} onUpdateStatus={updateTaskStatus} onDelete={deleteTask} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderTeam = () => (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Team Activity Feed */}
      <motion.div variants={fadeIn} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Team Activity Feed</h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
          {teamActivities.map(activity => (
            <div key={activity.id} className={`p-4 rounded-xl border ${
              activity.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
              activity.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-emerald-400' :
                  activity.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {teamActivities.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No recent team activity</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Executive Header */}
        <motion.header initial="hidden" animate="visible" variants={fadeIn} className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-5xl">{emoji}</span>
                <div>
                  <h1 className="text-4xl md:text-5xl font-light text-white">
                    {greeting}, <span className="font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{userName}</span>
                  </h1>
                  <p className="text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
                    <span>{time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono text-cyan-400">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <Bell className="w-5 h-5 text-zinc-400" />
                {(pendingApprovals + lowStock) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {pendingApprovals + lowStock}
                  </span>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/setup')}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
              >
                <Settings className="w-5 h-5 text-zinc-400" />
              </motion.button>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-full overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'calendar', label: 'Calendar', icon: CalendarIcon, badge: todayTasks },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: tasksByStatus.todo.length },
              { id: 'team', label: 'Team Activity', icon: Users },
            ].map((t: any) => (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  tab === t.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <t.icon className="w-4 h-4" />
                <span className="font-medium">{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold">{t.badge}</span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.header>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && renderOverview()}
          {tab === 'analytics' && renderAnalytics()}
          {tab === 'calendar' && renderCalendar()}
          {tab === 'tasks' && renderTasks()}
          {tab === 'team' && renderTeam()}
        </AnimatePresence>
      </div>

      {/* Task Modal */}
      <TaskModal 
        show={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        onSubmit={addTask}
      />

      {/* Event Modal */}
      <EventModal 
        show={showEventModal} 
        onClose={() => setShowEventModal(false)} 
        onSubmit={addEvent}
      />

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════
function QuickActionBtn({ icon: Icon, label, count, onClick }: any) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="relative p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-lg">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium">{label}</p>
          {count !== undefined && <p className="text-zinc-400 text-sm">{count} pending</p>}
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
    </motion.button>
  );
}

function ExportBtn({ icon: Icon, label, period }: any) {
  return (
    <button className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
      <div className="p-2 bg-blue-500/20 rounded-lg">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-white font-medium text-sm">{label}</p>
        <p className="text-zinc-500 text-xs">{period}</p>
      </div>
    </button>
  );
}

function TaskCard({ task, onUpdateStatus, onDelete }: { task: Task; onUpdateStatus: (id: string, status: Task['status']) => void; onDelete: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'amber';
      case 'low': return 'emerald';
      default: return 'zinc';
    }
  };

  const color = getPriorityColor(task.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-${color}-500/10 border border-${color}-500/20 rounded-xl group`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-medium text-sm flex-1">{task.title}</h4>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-white/10 rounded transition-all"
          >
            <MoreVertical className="w-4 h-4 text-zinc-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-10">
              {task.status !== 'completed' && (
                <button
                  onClick={() => { onUpdateStatus(task.id, 'completed'); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Complete
                </button>
              )}
              <button
                onClick={() => { onDelete(task.id); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {task.description && (
        <p className="text-zinc-400 text-xs mb-3">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 bg-${color}-500/20 text-${color}-400 rounded text-xs font-medium`}>
          {task.priority.toUpperCase()}
        </span>
        {task.dueDate && (
          <span className="text-zinc-500 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TaskModal({ show, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onSubmit(formData);
      setFormData({ title: '', description: '', priority: 'medium', dueDate: '' });
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">New Task</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
                required
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40 h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all"
              >
                Create Task
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EventModal({ show, onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.date) {
      onSubmit(formData);
      setFormData({ title: '', date: '', time: '', type: 'meeting', description: '' });
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">New Event</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEvent['type'] })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40"
              >
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="event">Event</option>       
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/40 h-20 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all"
              >
                Create Event
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
