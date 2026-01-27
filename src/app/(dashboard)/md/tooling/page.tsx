"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Cog, Users, ArrowLeft, ArrowUpRight, ArrowDownRight, 
  Play, Pause, Wrench, Clock, ChevronRight, Layers, 
  Target, Zap, Activity, RefreshCw, Search, Package
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
interface MaterialUsage {
  materialName: string;
  quantity: number;
  unit: string;
}

interface Department {
  id: string;
  name: string;
  slug: string;
  code: string;
  icon: string;
  employees: { total: number; present: number; absent: number; onLeave: number };
  efficiency: { current: number; target: number; trend: number };
  output: { today: number; target: number; completed: number };
  status: "running" | "maintenance" | "blocked" | "idle";
  supervisor: { name: string; phone: string };
  machines: { total: number; operational: number; underMaintenance: number };
  materialUsage: MaterialUsage[];
  totalMaterialCost: number;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA WITH MATERIAL USAGE
// ═══════════════════════════════════════════════════════════════
const DEPARTMENTS_DATA: Department[] = [
  {
    id: "dept-001", name: "Stock Building", slug: "stock-building", code: "STK", icon: "📦",
    employees: { total: 12, present: 11, absent: 1, onLeave: 0 },
    efficiency: { current: 94, target: 90, trend: +2.5 },
    output: { today: 45, target: 50, completed: 42 },
    status: "running",
    supervisor: { name: "Rajesh Kumar", phone: "+91 98765 43210" },
    machines: { total: 8, operational: 8, underMaintenance: 0 },
    materialUsage: [
      { materialName: "E-Glass Fiber Mat 300gsm", quantity: 45, unit: "Kg" },
      { materialName: "Polyester Resin", quantity: 28, unit: "Kg" },
      { materialName: "Mold Release Wax", quantity: 2, unit: "Kg" }
    ],
    totalMaterialCost: 18500,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-002", name: "Machining", slug: "machining", code: "MCH", icon: "⚙️",
    employees: { total: 18, present: 16, absent: 1, onLeave: 1 },
    efficiency: { current: 87, target: 90, trend: -1.2 },
    output: { today: 32, target: 40, completed: 28 },
    status: "running",
    supervisor: { name: "Suresh Patel", phone: "+91 98765 43211" },
    machines: { total: 12, operational: 10, underMaintenance: 2 },
    materialUsage: [
      { materialName: "Cutting Wheels 4\"", quantity: 12, unit: "Pcs" },
      { materialName: "Grinding Wheel 4\"", quantity: 8, unit: "Pcs" },
      { materialName: "Acetone (Cleaning)", quantity: 5, unit: "L" }
    ],
    totalMaterialCost: 2340,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-003", name: "Pattern Finishing", slug: "pattern-finishing", code: "PTN", icon: "🎨",
    employees: { total: 8, present: 8, absent: 0, onLeave: 0 },
    efficiency: { current: 92, target: 88, trend: +3.1 },
    output: { today: 28, target: 30, completed: 26 },
    status: "running",
    supervisor: { name: "Amit Singh", phone: "+91 98765 43212" },
    machines: { total: 6, operational: 6, underMaintenance: 0 },
    materialUsage: [
      { materialName: "Gelcoat White", quantity: 15, unit: "Kg" },
      { materialName: "Talcum Powder", quantity: 8, unit: "Kg" },
      { materialName: "PVA Release Film", quantity: 3, unit: "L" }
    ],
    totalMaterialCost: 6400,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-004", name: "Lamination", slug: "lamination", code: "LAM", icon: "🔧",
    employees: { total: 15, present: 14, absent: 0, onLeave: 1 },
    efficiency: { current: 96, target: 92, trend: +1.8 },
    output: { today: 52, target: 55, completed: 50 },
    status: "running",
    supervisor: { name: "Vikram Sharma", phone: "+91 98765 43213" },
    machines: { total: 10, operational: 10, underMaintenance: 0 },
    materialUsage: [
      { materialName: "Epoxy Resin LY556", quantity: 65, unit: "Kg" },
      { materialName: "Hardener HY951", quantity: 20, unit: "Kg" },
      { materialName: "E-Glass Fiber Mat 450gsm", quantity: 40, unit: "Kg" },
      { materialName: "Carbon Fiber 3K Twill", quantity: 8, unit: "M" }
    ],
    totalMaterialCost: 52800,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-005", name: "Mold Finishing", slug: "mold-finishing", code: "MLD", icon: "🔩",
    employees: { total: 10, present: 0, absent: 0, onLeave: 0 },
    efficiency: { current: 0, target: 85, trend: 0 },
    output: { today: 0, target: 25, completed: 0 },
    status: "maintenance",
    supervisor: { name: "Deepak Verma", phone: "+91 98765 43214" },
    machines: { total: 8, operational: 0, underMaintenance: 8 },
    materialUsage: [],
    totalMaterialCost: 0,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-006", name: "Welding", slug: "welding", code: "WLD", icon: "🔥",
    employees: { total: 14, present: 13, absent: 1, onLeave: 0 },
    efficiency: { current: 89, target: 88, trend: +2.3 },
    output: { today: 38, target: 42, completed: 35 },
    status: "running",
    supervisor: { name: "Ramesh Yadav", phone: "+91 98765 43215" },
    machines: { total: 10, operational: 9, underMaintenance: 1 },
    materialUsage: [
      { materialName: "Structural Adhesive", quantity: 12, unit: "Kg" },
      { materialName: "Safety Goggles", quantity: 4, unit: "Pcs" },
      { materialName: "Nitrile Gloves (Box)", quantity: 2, unit: "Box" }
    ],
    totalMaterialCost: 10900,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-007", name: "Assembly", slug: "assembly", code: "ASM", icon: "🏭",
    employees: { total: 20, present: 19, absent: 1, onLeave: 0 },
    efficiency: { current: 91, target: 90, trend: +4.2 },
    output: { today: 67, target: 70, completed: 62 },
    status: "running",
    supervisor: { name: "Manoj Gupta", phone: "+91 98765 43216" },
    machines: { total: 15, operational: 14, underMaintenance: 1 },
    materialUsage: [
      { materialName: "Structural Adhesive", quantity: 8, unit: "Kg" },
      { materialName: "Mixing Buckets 20L", quantity: 5, unit: "Pcs" },
      { materialName: "Roller Brush 4\"", quantity: 10, unit: "Pcs" }
    ],
    totalMaterialCost: 7650,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-008", name: "CMM Inspection", slug: "cmm", code: "CMM", icon: "📐",
    employees: { total: 6, present: 6, absent: 0, onLeave: 0 },
    efficiency: { current: 100, target: 95, trend: +1.5 },
    output: { today: 85, target: 80, completed: 85 },
    status: "running",
    supervisor: { name: "Pradeep Joshi", phone: "+91 98765 43217" },
    machines: { total: 4, operational: 4, underMaintenance: 0 },
    materialUsage: [
      { materialName: "Disposable Coverall", quantity: 6, unit: "Pcs" },
      { materialName: "Nitrile Gloves (Box)", quantity: 1, unit: "Box" }
    ],
    totalMaterialCost: 1530,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-009", name: "Trimline", slug: "trimline", code: "TRM", icon: "✂️",
    employees: { total: 8, present: 2, absent: 0, onLeave: 0 },
    efficiency: { current: 45, target: 85, trend: -5.0 },
    output: { today: 12, target: 35, completed: 8 },
    status: "blocked",
    supervisor: { name: "Sanjay Mishra", phone: "+91 98765 43218" },
    machines: { total: 6, operational: 2, underMaintenance: 4 },
    materialUsage: [
      { materialName: "Cutting Wheels 4\"", quantity: 3, unit: "Pcs" }
    ],
    totalMaterialCost: 135,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-010", name: "Quality Control", slug: "quality", code: "QC", icon: "✅",
    employees: { total: 12, present: 12, absent: 0, onLeave: 0 },
    efficiency: { current: 98, target: 95, trend: +2.0 },
    output: { today: 95, target: 90, completed: 92 },
    status: "running",
    supervisor: { name: "Anil Saxena", phone: "+91 98765 43219" },
    machines: { total: 8, operational: 8, underMaintenance: 0 },
    materialUsage: [
      { materialName: "Safety Goggles", quantity: 2, unit: "Pcs" },
      { materialName: "Respirator Mask N95", quantity: 12, unit: "Pcs" }
    ],
    totalMaterialCost: 1320,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "dept-011", name: "Maintenance", slug: "maintenance", code: "MNT", icon: "🛠️",
    employees: { total: 10, present: 9, absent: 1, onLeave: 0 },
    efficiency: { current: 85, target: 85, trend: 0 },
    output: { today: 18, target: 20, completed: 16 },
    status: "running",
    supervisor: { name: "Rakesh Dubey", phone: "+91 98765 43220" },
    machines: { total: 5, operational: 5, underMaintenance: 0 },
    materialUsage: [
      { materialName: "Acetone (Cleaning)", quantity: 10, unit: "L" },
      { materialName: "Grinding Wheel 4\"", quantity: 5, unit: "Pcs" },
      { materialName: "Nitrile Gloves (Box)", quantity: 1, unit: "Box" }
    ],
    totalMaterialCost: 1975,
    lastUpdated: new Date().toISOString()
  }
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ToolingPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [departments] = useState<Department[]>(DEPARTMENTS_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "maintenance" | "blocked">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsRefreshing(false);
  };

  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           dept.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || dept.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = departments.length;
    const running = departments.filter(d => d.status === "running").length;
    const maintenance = departments.filter(d => d.status === "maintenance").length;
    const blocked = departments.filter(d => d.status === "blocked").length;
    
    const totalEmployees = departments.reduce((sum, d) => sum + d.employees.total, 0);
    const presentEmployees = departments.reduce((sum, d) => sum + d.employees.present, 0);
    const attendanceRate = Math.round((presentEmployees / totalEmployees) * 100);
    
    const activeDepts = departments.filter(d => d.efficiency.current > 0);
    const avgEfficiency = activeDepts.length > 0 
      ? Math.round(activeDepts.reduce((sum, d) => sum + d.efficiency.current, 0) / activeDepts.length)
      : 0;
    
    const totalMaterialCost = departments.reduce((sum, d) => sum + d.totalMaterialCost, 0);
    
    const totalOutput = departments.reduce((sum, d) => sum + d.output.today, 0);
    const totalTarget = departments.reduce((sum, d) => sum + d.output.target, 0);
    const totalCompleted = departments.reduce((sum, d) => sum + d.output.completed, 0);
    const completionRate = Math.round((totalCompleted / totalTarget) * 100);
    
    const totalMachines = departments.reduce((sum, d) => sum + d.machines.total, 0);
    const operationalMachines = departments.reduce((sum, d) => sum + d.machines.operational, 0);
    const machinePercent = Math.round((operationalMachines / totalMachines) * 100);

    return {
      total, running, maintenance, blocked,
      totalEmployees, presentEmployees, attendanceRate,
      avgEfficiency, totalMaterialCost,
      totalOutput, totalTarget, totalCompleted, completionRate,
      totalMachines, operationalMachines, machinePercent
    };
  }, [departments]);

  const timeString = currentTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
  });

  // Theme classes - Dark mode only
  const cardBg = 'bg-zinc-900/50 border-zinc-800';
  const cardHover = 'hover:border-zinc-700 hover:bg-zinc-900';
  const textPrimary = 'text-white';
  const textMuted = 'text-zinc-500';
  const inputBg = 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600';
  const dividerColor = 'border-zinc-800';

  return (
    <div className="min-h-screen w-full bg-zinc-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/md"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${cardBg} ${cardHover}`}
            >
              <ArrowLeft className={`w-4 h-4 ${textMuted}`} />
              <span className={`text-sm ${textMuted}`}>Back</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
                <Cog className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className={`text-2xl font-semibold ${textPrimary}`}>Tooling Management</h1>
                <p className={`text-sm ${textMuted}`}>{stats.total} Departments • Real-time Monitoring</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-lg border transition-colors ${cardBg} ${cardHover} disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${textMuted} ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${cardBg}`}>
              <Clock className={`w-4 h-4 ${textMuted}`} />
              <span className="font-mono text-sm text-cyan-500">{timeString}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-emerald-500">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={Layers} label="Departments" value={stats.total} sub={`${stats.running} Running`} color="cyan" />
        <StatCard icon={Users} label="Staff Present" value={`${stats.presentEmployees}/${stats.totalEmployees}`} sub={`${stats.attendanceRate}% Attendance`} color="violet" />
        <StatCard icon={Target} label="Avg Efficiency" value={`${stats.avgEfficiency}%`} sub="Target: 90%" color="amber" trend={stats.avgEfficiency >= 90 ? 2 : -1} />
        <StatCard icon={Activity} label="Completed" value={stats.totalCompleted} sub={`${stats.completionRate}% Done`} color="emerald" />
        <StatCard icon={Zap} label="Machines" value={`${stats.operationalMachines}/${stats.totalMachines}`} sub={`${stats.machinePercent}% Online`} color="pink" />
        <StatCard icon={Package} label="Material Cost" value={`₹${(stats.totalMaterialCost/1000).toFixed(1)}K`} sub="Today's Usage" color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:border-cyan-500/50 transition-colors text-sm ${inputBg}`}
          />
        </div>
        
        <div className="flex gap-2">
          {(["all", "running", "maintenance", "blocked"] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? status === "all" ? "bg-cyan-500/20 text-cyan-500 border border-cyan-500/30" :
                    status === "running" ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" :
                    status === "maintenance" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                    "bg-red-500/20 text-red-500 border border-red-500/30"
                  : `${cardBg} ${textMuted} border ${cardHover}`
              }`}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              {status === "running" && <span className="ml-1.5 text-xs opacity-70">({stats.running})</span>}
              {status === "maintenance" && <span className="ml-1.5 text-xs opacity-70">({stats.maintenance})</span>}
              {status === "blocked" && <span className="ml-1.5 text-xs opacity-70">({stats.blocked})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {filteredDepartments.map((dept) => (
          <DepartmentCard key={dept.id} dept={dept} />
        ))}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="text-center py-16">
          <Search className={`w-12 h-12 mx-auto mb-4 ${textMuted}`} />
          <p className={textMuted}>No departments found</p>
        </div>
      )}

      {/* Footer */}
      <footer className={`mt-8 pt-6 border-t flex items-center justify-between text-xs ${dividerColor} ${textMuted}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>System Online • Last sync: {timeString}</span>
        </div>
        <span>© 2026 TrioVision International</span>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD COMPONENT - Dark Mode Only
// ═══════════════════════════════════════════════════════════════
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  color: "cyan" | "emerald" | "violet" | "amber" | "pink" | "blue";
  trend?: number;
}

const StatCard = ({ icon: Icon, label, value, sub, color, trend }: StatCardProps) => {
  const colorMap = {
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: "text-cyan-500" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-500" },
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", icon: "text-violet-500" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-500" },
    pink: { bg: "bg-pink-500/10", border: "border-pink-500/20", icon: "text-pink-500" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-500" },
  };

  const c = colorMap[color];

  return (
    <div className={`p-4 rounded-xl ${c.bg} border ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        {trend !== undefined && (
          <span className={`flex items-center text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs mt-0.5 text-zinc-500">{label}</p>
      <p className="text-[10px] mt-0.5 text-zinc-600">{sub}</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT CARD COMPONENT - Dark Mode Only
// ═══════════════════════════════════════════════════════════════
const DepartmentCard = ({ dept }: { dept: Department }) => {
  const statusConfig = {
    running: { color: "emerald", label: "Running", Icon: Play },
    maintenance: { color: "amber", label: "Maintenance", Icon: Wrench },
    blocked: { color: "red", label: "Blocked", Icon: Pause },
    idle: { color: "zinc", label: "Idle", Icon: Pause }
  };

  const status = statusConfig[dept.status];
  const efficiencyColor = dept.efficiency.current >= 90 ? "text-emerald-500" : 
                          dept.efficiency.current >= 70 ? "text-amber-500" : 
                          dept.efficiency.current > 0 ? "text-red-500" : "text-zinc-600";
  
  const progressPercent = dept.output.target > 0 ? Math.round((dept.output.completed / dept.output.target) * 100) : 0;

  // Dark mode only styles
  const cardBg = 'bg-zinc-900/50 border-zinc-800';
  const cardHover = 'hover:border-zinc-700 hover:bg-zinc-900';
  const textPrimary = 'text-white';
  const textSecondary = 'text-zinc-400';
  const textMuted = 'text-zinc-500';
  const statBg = 'bg-zinc-800/50';
  const divider = 'border-zinc-800';

  return (
    <Link href={`/md/tooling/${dept.slug}`}>
      <div className={`group p-5 rounded-2xl border transition-all cursor-pointer h-full ${cardBg} ${cardHover}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{dept.icon}</span>
            <div>
              <h3 className={`font-semibold group-hover:text-cyan-500 transition-colors ${textPrimary}`}>{dept.name}</h3>
              <p className={`text-xs font-mono ${textMuted}`}>{dept.code}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-${status.color}-500/10 text-${status.color}-500 border border-${status.color}-500/20`}>
            <status.Icon className="w-3 h-3" />
            {status.label}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`p-2.5 rounded-lg ${statBg}`}>
            <p className={`text-xs ${textMuted} mb-0.5`}>Staff</p>
            <p className={`text-sm font-semibold ${textPrimary}`}>{dept.employees.present}<span className={`font-normal ${textMuted}`}>/{dept.employees.total}</span></p>
          </div>
          <div className={`p-2.5 rounded-lg ${statBg}`}>
            <p className={`text-xs ${textMuted} mb-0.5`}>Machines</p>
            <p className={`text-sm font-semibold ${textPrimary}`}>{dept.machines.operational}<span className={`font-normal ${textMuted}`}>/{dept.machines.total}</span></p>
          </div>
        </div>

        {/* Efficiency */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs ${textMuted}`}>Efficiency</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-bold ${efficiencyColor}`}>
              {dept.efficiency.current > 0 ? `${dept.efficiency.current}%` : '—'}
            </span>
            {dept.efficiency.trend !== 0 && (
              <span className={`flex items-center text-[10px] ${dept.efficiency.trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {dept.efficiency.trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={textMuted}>Progress</span>
            <span className={textSecondary}>{dept.output.completed}/{dept.output.target}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-zinc-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 90 ? 'bg-emerald-500' : 
                progressPercent >= 60 ? 'bg-amber-500' : 
                progressPercent > 0 ? 'bg-red-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className={`text-[10px] mt-1 ${textMuted}`}>{progressPercent}% completed</p>
        </div>

        {/* Material Usage */}
        {dept.materialUsage.length > 0 && (
          <div className={`pt-3 border-t ${divider} mb-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${textSecondary}`}>Material Usage</span>
              <span className="text-xs font-semibold text-cyan-500">₹{dept.totalMaterialCost.toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              {dept.materialUsage.slice(0, 2).map((m, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className={`truncate max-w-[140px] ${textMuted}`}>{m.materialName}</span>
                  <span className={textSecondary}>{m.quantity} {m.unit}</span>
                </div>
              ))}
              {dept.materialUsage.length > 2 && (
                <span className={`text-[10px] ${textMuted}`}>+{dept.materialUsage.length - 2} more items</span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-between pt-3 border-t ${divider}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${statBg}`}>
              <Users className={`w-3 h-3 ${textMuted}`} />
            </div>
            <span className={`text-xs truncate max-w-[120px] ${textMuted}`}>{dept.supervisor.name}</span>
          </div>
          <ChevronRight className={`w-4 h-4 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all ${textMuted}`} />
        </div>
      </div>
    </Link>
  );
};
