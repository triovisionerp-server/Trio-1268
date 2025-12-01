'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, TrendingUp, Package, Factory, Users, Download, Trash2, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [user, setUser] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      loadTasks();
    }
    
    // Auto-refresh every 5 seconds to sync with supervisor
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const loadTasks = () => {
    const savedTasks = localStorage.getItem('productionTasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const handleDeleteTask = (taskId: number) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem('productionTasks', JSON.stringify(updatedTasks));
  };

  const exportToExcel = () => {
    const csv = [
      ['Project ID', 'Part Type', 'Part Name', 'Process', 'Quantity', 'TEI %', 'Operator', 'Machine', 'Date', 'Time'],
      ...tasks.map(t => [
        t.projectId,
        t.partType,
        t.partName,
        t.manufacturingProcess,
        t.quantity,
        t.tei,
        t.operatorName,
        t.machineId,
        t.date,
        t.time
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate statistics
  const avgTEI = tasks.length > 0 ? (tasks.reduce((s, t) => s + t.tei, 0) / tasks.length).toFixed(1) : '0.0';
  const totalUnits = tasks.reduce((s, t) => s + (t.quantity || 0), 0);
  const totalTasks = tasks.length;

  // Prepare chart data
  const teiTrendData = tasks.slice(0, 10).reverse().map((t, i) => ({
    name: `Task ${i + 1}`,
    TEI: t.tei,
    date: t.date
  }));

  const partTypeData = tasks.reduce((acc: any[], task) => {
    const existing = acc.find(item => item.name === task.partType);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: task.partType, value: 1 });
    }
    return acc;
  }, []);

  const processData = tasks.reduce((acc: any[], task) => {
    const existing = acc.find(item => item.name === task.manufacturingProcess);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: task.manufacturingProcess, count: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  const filteredTasks = tasks.filter(task =>
    task.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.partType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.partName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                  <p className="text-zinc-400 text-sm mt-1">Production Analytics & Reporting</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Logged in as</p>
                  <p className="text-sm font-semibold text-blue-300">{user}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all duration-300 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Package className="w-6 h-6 text-blue-300" />
                </div>
                <span className="text-xs font-medium text-blue-300 uppercase">Total</span>
              </div>
              <h3 className="text-4xl font-bold text-white">{totalTasks}</h3>
              <p className="text-sm text-zinc-400 mt-2">Production Tasks</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                  <TrendingUp className="w-6 h-6 text-green-300" />
                </div>
                <span className="text-xs font-medium text-green-300 uppercase">Average</span>
              </div>
              <h3 className="text-4xl font-bold text-white">{avgTEI}%</h3>
              <p className="text-sm text-zinc-400 mt-2">Task Efficiency</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                  <Factory className="w-6 h-6 text-purple-300" />
                </div>
                <span className="text-xs font-medium text-purple-300 uppercase">Total</span>
              </div>
              <h3 className="text-4xl font-bold text-white">{totalUnits}</h3>
              <p className="text-sm text-zinc-400 mt-2">Units Produced</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                  <Users className="w-6 h-6 text-yellow-300" />
                </div>
                <span className="text-xs font-medium text-yellow-300 uppercase">Active</span>
              </div>
              <h3 className="text-4xl font-bold text-white">{new Set(tasks.map(t => t.operatorName)).size}</h3>
              <p className="text-sm text-zinc-400 mt-2">Operators</p>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* TEI Trend Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
            >
              <h2 className="text-xl font-bold text-white mb-6">TEI Trend (Last 10 Tasks)</h2>
              {teiTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={teiTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="name" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="TEI" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-zinc-500">
                  No data available
                </div>
              )}
            </motion.div>

            {/* Part Type Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
            >
              <h2 className="text-xl font-bold text-white mb-6">Part Type Distribution</h2>
              {partTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={partTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {partTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-zinc-500">
                  No data available
                </div>
              )}
            </motion.div>

            {/* Process Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl lg:col-span-2"
            >
              <h2 className="text-xl font-bold text-white mb-6">Manufacturing Process Distribution</h2>
              {processData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={processData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="name" stroke="#a1a1aa" angle={-15} textAnchor="end" height={100} />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-zinc-500">
                  No data available
                </div>
              )}
            </motion.div>
          </div>

          {/* Data Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">All Production Tasks</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-lg focus:bg-white/10 focus:border-blue-500/50 outline-none"
                />
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {filteredTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Project ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Part Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Part Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Process</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Qty</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">TEI %</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Operator</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                        <td className="py-3 px-4 text-sm text-blue-300 font-medium">{task.projectId}</td>
                        <td className="py-3 px-4 text-sm text-zinc-300">{task.partType}</td>
                        <td className="py-3 px-4 text-sm text-zinc-300">{task.partName}</td>
                        <td className="py-3 px-4 text-sm text-zinc-400">{task.manufacturingProcess}</td>
                        <td className="py-3 px-4 text-sm text-white font-semibold">{task.quantity}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                            task.tei >= 85 ? 'bg-green-500/20 text-green-300' :
                            task.tei >= 70 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {task.tei}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-300">{task.operatorName}</td>
                        <td className="py-3 px-4 text-sm text-zinc-400">{task.date}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <Package className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <p className="font-medium">No tasks found</p>
                <p className="text-sm mt-2 text-zinc-500">
                  {searchTerm ? 'Try a different search term' : 'Supervisor will add tasks from their dashboard'}
                </p>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
