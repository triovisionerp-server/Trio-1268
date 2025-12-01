'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LogOut, Users, Package, Factory, BarChart3, 
  ExternalLink, CheckCircle, Clock, AlertCircle, TrendingUp 
} from 'lucide-react';
// 1. Import Charts
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

export default function MDDashboard() {
  const [user, setUser] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  
  // 2. Chart State
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    // if (!currentUser || currentUser !== 'md') router.push('/login'); // Uncomment to lock
    setUser('MD');
    loadData();

    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const loadData = () => {
    const savedEmployees = localStorage.getItem('employees');
    const savedTasks = localStorage.getItem('productionTasks');
    const savedBOMs = localStorage.getItem('boms');
    const savedProductions = localStorage.getItem('productions');
    
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    
    const parsedBOMs = savedBOMs ? JSON.parse(savedBOMs) : [];
    if (savedBOMs) setBoms(parsedBOMs);
    
    const parsedProds = savedProductions ? JSON.parse(savedProductions) : [];
    if (savedProductions) setProductions(parsedProds);

    // --- 3. CALCULATE CHART DATA ---
    
    // Bar Chart: Target vs Actual per Project
    const liveProductionGraph = parsedProds.map((p: any) => ({
      name: p.projectCode, 
      Target: p.targetParts || 10, 
      Actual: p.partsCompleted || 0
    }));
    setChartData(liveProductionGraph);

    // Pie Chart: On Track vs Delayed
    const today = new Date();
    let onTrack = 0, delayed = 0;
    parsedBOMs.forEach((b: any) => {
        const deadline = b.targetCompletionDate ? new Date(b.targetCompletionDate) : new Date();
        if (b.status !== 'Completed' && deadline < today) delayed++;
        else onTrack++;
    });
    setPieData([
        { name: 'On Track', value: onTrack, color: '#4ade80' }, // Green
        { name: 'Delayed', value: delayed, color: '#f87171' }   // Red
    ]);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const openEmployeeDetails = () => {
    // router.push('/employees'); // Better to use router push for internal nav
  };

  // Stats Calculations
  const today = new Date().toISOString().split('T')[0];
  const todayProductions = productions.filter(p => p.completionDate === today);
  const partsCompletedToday = todayProductions.reduce((sum, p) => sum + (p.partsCompleted || 0), 0);
  const gelcoatToday = todayProductions.reduce((sum, p) => sum + (p.materialsUsed?.gelcoatUsed || 0), 0);

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => !e.status || e.status === 'Active').length,
    onLeave: employees.filter(e => e.status === 'On Leave').length,
    totalBOMs: boms.length,
    activeBOMs: boms.filter(b => b.status === 'Pending' || b.status === 'In Progress').length,
    completedBOMs: boms.filter(b => b.status === 'Completed').length,
    totalProduction: productions.length,
    inProgress: productions.filter(p => p.status === 'In Progress').length,
    completedProduction: productions.filter(p => p.status === 'Completed').length,
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden font-sans text-white">
      {/* Backgrounds */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">MD Dashboard</h1>
                  <p className="text-zinc-400 text-sm mt-1">Executive Overview</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300 font-medium">Live Updates</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* 1. TOP STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Employee Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30"><Users className="w-6 h-6 text-blue-300" /></div>
              </div>
              <h3 className="text-4xl font-bold text-white">{stats.totalEmployees}</h3>
              <p className="text-sm text-zinc-400 mt-2">Total Employees</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-zinc-400">
                 <span>Active: <strong className="text-green-300">{stats.activeEmployees}</strong></span>
                 <span>Leave: <strong className="text-yellow-300">{stats.onLeave}</strong></span>
              </div>
            </motion.div>

            {/* Projects Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay:0.1}} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30"><Package className="w-6 h-6 text-purple-300" /></div>
              </div>
              <h3 className="text-4xl font-bold text-white">{stats.totalBOMs}</h3>
              <p className="text-sm text-zinc-400 mt-2">Total Projects</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-zinc-400">
                 <span>Active: <strong className="text-blue-300">{stats.activeBOMs}</strong></span>
                 <span>Done: <strong className="text-green-300">{stats.completedBOMs}</strong></span>
              </div>
            </motion.div>

            {/* Production Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay:0.2}} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30"><Factory className="w-6 h-6 text-green-300" /></div>
              </div>
              <h3 className="text-4xl font-bold text-white">{stats.totalProduction}</h3>
              <p className="text-sm text-zinc-400 mt-2">Total Productions</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-zinc-400">
                 <span>Active: <strong className="text-blue-300">{stats.inProgress}</strong></span>
                 <span>Done: <strong className="text-green-300">{stats.completedProduction}</strong></span>
              </div>
            </motion.div>

            {/* Today's Output */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{delay:0.3}} className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center border border-green-500/40"><CheckCircle className="w-6 h-6 text-green-300" /></div>
                <span className="text-xs font-medium text-green-300 uppercase">Today</span>
              </div>
              <h3 className="text-4xl font-bold text-white">{partsCompletedToday}</h3>
              <p className="text-sm text-zinc-400 mt-2">Parts Completed</p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-zinc-400">Gelcoat Used: <strong className="text-green-300">{gelcoatToday.toFixed(1)} kg</strong></p>
              </div>
            </motion.div>
          </div>

          {/* 2. ANALYTICS SECTION (NEW) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
             {/* Production Graph */}
             <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400"/> Production Targets vs Actual</h3>
                <div className="h-64 w-full">
                   {chartData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                           <XAxis dataKey="name" stroke="#71717a" axisLine={false} tickLine={false} />
                           <YAxis stroke="#71717a" axisLine={false} tickLine={false} />
                           <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                           <Bar dataKey="Actual" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Actual" />
                           <Bar dataKey="Target" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} name="Target" />
                        </BarChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="h-full flex items-center justify-center text-zinc-500">No active projects to chart</div>
                   )}
                </div>
             </motion.div>

             {/* Project Health Pie */}
             <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-blue-400"/> Project Health</h3>
                <div className="h-64 w-full flex items-center justify-center">
                   {boms.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                           </Pie>
                           <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        </PieChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="text-zinc-500">No data</div>
                   )}
                </div>
                <div className="flex justify-center gap-4 mt-[-20px]">
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-400"></div><span className="text-xs text-zinc-400">On Time</span></div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><span className="text-xs text-zinc-400">Delayed</span></div>
                </div>
             </motion.div>
          </div>

          {/* 3. LIVE STATUS LIST */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400 animate-pulse" /> Live Status
              </h2>
            </div>
            {productions.filter(p => p.status === 'In Progress').length > 0 ? (
              <div className="space-y-4">
                {productions.filter(p => p.status === 'In Progress').slice(0, 5).map((prod) => (
                  <div key={prod.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                    <div>
                       <h4 className="text-white font-bold">{prod.projectCode}</h4>
                       <p className="text-xs text-zinc-400">Target: {prod.targetParts} • Done: {prod.partsCompleted}</p>
                    </div>
                    <div className="text-right">
                       <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold">In Progress</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">No active production</div>
            )}
          </motion.div>

        </main>
      </div>
    </div>
  );
}