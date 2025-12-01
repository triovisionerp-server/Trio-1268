'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, CheckCircle, Clock, 
  DollarSign, FileText, Layers, Package, 
  TrendingUp, Users, AlertCircle, Save 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { motion } from 'framer-motion';

// --- MOCK DATA FOR CHART (Project Burndown) ---
const progressData = [
  { day: 'Day 1', Planned: 10, Actual: 8 },
  { day: 'Day 2', Planned: 20, Actual: 18 },
  { day: 'Day 3', Planned: 30, Actual: 35 }, // Ahead
  { day: 'Day 4', Planned: 40, Actual: 42 },
  { day: 'Day 5', Planned: 50, Actual: 48 },
];

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;
  
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'production'

  useEffect(() => {
    // 1. Find the specific project from LocalStorage
    const allBoms = JSON.parse(localStorage.getItem('boms') || "[]");
    // In a real app, you'd match by ID. Here we just grab the first one or mock it if missing
    const found = allBoms.find((b: any) => b.id.toString() === projectId) || allBoms[0];
    
    if (found) {
        setProject(found);
    } else {
        // Fallback for testing without data
        setProject({
            projectCode: 'PRJ-DEMO',
            projectDescription: 'Demo Project Hull',
            customer: 'Tesla Marine',
            status: 'In Progress',
            progress: 45,
            totalMolds: 12,
            targetPartsCompletion: 50,
            startDate: '2024-01-01',
            targetCompletionDate: '2024-02-28'
        });
    }
  }, [projectId]);

  if (!project) return <div className="p-10 text-center text-zinc-500">Loading Project Data...</div>;

  return (
    <div className="space-y-8 font-sans text-white pb-10">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => router.back()} 
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-zinc-400 hover:text-white"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{project.projectDescription}</h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        project.status === 'Completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 
                        'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                        {project.status}
                    </span>
                </div>
                <p className="text-zinc-400 mt-1 flex items-center gap-4 text-sm">
                    <span><span className="text-zinc-500">Code:</span> {project.projectCode}</span>
                    <span><span className="text-zinc-500">Client:</span> {project.customer}</span>
                </p>
            </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('production')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'production' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
                Production Data
            </button>
        </div>
      </div>

      {/* --- TAB 1: OVERVIEW (Visuals) --- */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-500/20 rounded-2xl"><Clock className="w-6 h-6 text-blue-400"/></div>
                        <span className="text-zinc-400 text-sm font-bold uppercase">Timeline</span>
                    </div>
                    <div className="text-2xl font-bold text-white">14 Days Left</div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{width: '65%'}}></div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-green-500/20 rounded-2xl"><CheckCircle className="w-6 h-6 text-green-400"/></div>
                        <span className="text-zinc-400 text-sm font-bold uppercase">Completion</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{project.progress || 0}%</div>
                    <p className="text-xs text-green-400 mt-1">On Track</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-500/20 rounded-2xl"><Layers className="w-6 h-6 text-purple-400"/></div>
                        <span className="text-zinc-400 text-sm font-bold uppercase">Molds Active</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{project.totalMolds} / {project.totalMolds}</div>
                    <p className="text-xs text-zinc-500 mt-1">100% Utilized</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-yellow-500/20 rounded-2xl"><DollarSign className="w-6 h-6 text-yellow-400"/></div>
                        <span className="text-zinc-400 text-sm font-bold uppercase">Est. Cost</span>
                    </div>
                    <div className="text-2xl font-bold text-white">$12,450</div>
                    <p className="text-xs text-yellow-400 mt-1">Material Only</p>
                </div>
            </div>

            {/* Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Production Velocity (Planned vs Actual)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={progressData}>
                                <defs>
                                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="day" stroke="#52525b" axisLine={false} tickLine={false} />
                                <YAxis stroke="#52525b" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="Planned" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPlanned)" strokeWidth={2} />
                                <Area type="monotone" dataKey="Actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl flex flex-col justify-center">
                     <h3 className="text-lg font-bold text-white mb-4">Team Efficiency</h3>
                     <div className="space-y-6">
                        {['Stock Team', 'Lamination', 'Finishing'].map((team, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-zinc-400">{team}</span>
                                    <span className="text-white font-bold">{90 + i * 2}%</span>
                                </div>
                                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full rounded-full" style={{width: `${90 + i * 2}%`}}></div>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
      )}

      {/* --- TAB 2: PRODUCTION (Excel Data Grid) --- */}
      {activeTab === 'production' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {/* Toolbar */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-400" /> Production EBOM & Status
                    </h3>
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                        <Save className="w-4 h-4" /> Export Excel
                    </button>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/40 text-zinc-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4 border-b border-white/10">Task Name</th>
                                <th className="p-4 border-b border-white/10">Department</th>
                                <th className="p-4 border-b border-white/10">Assignee</th>
                                <th className="p-4 border-b border-white/10 text-center">Target (SQM)</th>
                                <th className="p-4 border-b border-white/10 text-center">Completed</th>
                                <th className="p-4 border-b border-white/10 text-center">Status</th>
                                <th className="p-4 border-b border-white/10 text-right">Material Used</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {/* Mock rows mimicking data-entry.html table structure */}
                            {[
                                { task: "Base Making", dept: "Stock", user: "Rajesh", target: 50, done: 50, status: "Completed", mat: "20kg Wood" },
                                { task: "CNC Roughing", dept: "Machining", user: "Amit", target: 50, done: 25, status: "In Progress", mat: "-" },
                                { task: "Gelcoat App", dept: "Lamination", user: "Sarah", target: 50, done: 0, status: "Pending", mat: "15kg Gel" },
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white">{row.task}</td>
                                    <td className="p-4 text-zinc-400">{row.dept}</td>
                                    <td className="p-4 text-purple-300 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">{row.user.charAt(0)}</div>
                                        {row.user}
                                    </td>
                                    <td className="p-4 text-center font-mono">{row.target}</td>
                                    <td className="p-4 text-center font-mono text-white">{row.done}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                            row.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            row.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                        }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-zinc-400">{row.mat}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}