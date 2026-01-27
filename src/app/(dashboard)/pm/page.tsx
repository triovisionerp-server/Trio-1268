'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx'; 
import { 
  Save, Upload, Download, Trash2, Plus, RefreshCw, 
  Search, ExternalLink, TrendingUp, Clock, CheckCircle, 
  Activity, Package, FileText 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- EXACT COLUMNS (From your Data Entry HTML) ---
const COLUMNS = [
  { id: 'projectCode', name: 'Project Code', type: 'text', width: 120 },
  { id: 'projectDescription', name: 'Project Description', type: 'text', width: 220 },
  { id: 'destination', name: 'Destination', type: 'text', width: 140 },
  { id: 'poReference', name: 'PO Reference', type: 'text', width: 130 },
  { id: 'targetCompletionDate', name: 'Target Date', type: 'date', width: 140 },
  { id: 'totalParts', name: 'Total Parts', type: 'number', width: 100 },
  { id: 'totalPartsProduced', name: 'Produced', type: 'number', width: 100 },
  { id: 'totalPartsToBeProduced', name: 'Remaining', type: 'number', width: 100, readOnly: true },
  { id: 'percentCompleted', name: '% Done', type: 'number', width: 100, readOnly: true },
  { id: 'status', name: 'Status', type: 'text', width: 120 },
  { id: 'containerNumber', name: 'Container #', type: 'text', width: 140 },
  { id: 'dispatchDate', name: 'Dispatch', type: 'date', width: 140 },
  { id: 'remarks', name: 'Remarks', type: 'text', width: 200 }
];

export default function ProjectManagerDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, efficiency: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusChart, setStatusChart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const saved = localStorage.getItem('erpProjectData');
    if (saved) {
      const parsed = JSON.parse(saved);
      setData(parsed);
      runAnalytics(parsed);
    } else {
      // Default empty rows
      const initial = Array(5).fill({}).map((_, i) => ({ id: Date.now() + i, status: 'Pending' }));
      setData(initial);
      runAnalytics(initial);
    }
  }, []);

  // --- 2. LIVE ANALYTICS (Updates Graphs Instantly) ---
  const runAnalytics = (dataset: any[]) => {
    const valid = dataset.filter(p => p.projectCode);
    
    const total = valid.length;
    const completed = valid.filter(p => (p.percentCompleted || 0) >= 100).length;
    const inProgress = valid.filter(p => (p.percentCompleted || 0) > 0 && (p.percentCompleted || 0) < 100).length;
    
    // Efficiency: Avg completion of active projects
    const totalPercent = valid.reduce((acc, curr) => acc + (curr.percentCompleted || 0), 0);
    const efficiency = total > 0 ? Math.round(totalPercent / total) : 0;

    setStats({ total, completed, inProgress, efficiency });

    // Chart Data (Production)
    const barData = valid.slice(0, 8).map(p => ({
        name: p.projectCode,
        Target: parseFloat(p.totalParts) || 0,
        Actual: parseFloat(p.totalPartsProduced) || 0
    }));
    setChartData(barData);

    // Pie Data (Status)
    setStatusChart([
        { name: 'Done', value: completed, color: '#10b981' }, // Green
        { name: 'Active', value: inProgress, color: '#3b82f6' }, // Blue
        { name: 'Pending', value: total - completed - inProgress, color: '#f59e0b' } // Yellow
    ]);
  };

  // --- 3. DATA ENTRY & AUTO-CALC ---
  const handleCellChange = (index: number, field: string, value: any) => {
    const updated = [...data];
    if (!updated[index]) updated[index] = { id: Date.now() };
    updated[index][field] = value;

    // Auto-Math: Progress Calculation
    if (field === 'totalParts' || field === 'totalPartsProduced') {
       const total = parseFloat(updated[index].totalParts) || 0;
       const produced = parseFloat(updated[index].totalPartsProduced) || 0;
       const percent = total > 0 ? Math.round((produced / total) * 100) : 0;
       
       updated[index].percentCompleted = percent;
       updated[index].totalPartsToBeProduced = Math.max(0, total - produced);
       
       if (percent >= 100) updated[index].status = 'Completed';
       else if (percent > 0) updated[index].status = 'In Progress';
       else updated[index].status = 'Pending';
    }

    setData(updated);
    
    // Debounce Save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
        localStorage.setItem('erpProjectData', JSON.stringify(updated));
        localStorage.setItem('boms', JSON.stringify(updated)); // Sync with MD
        runAnalytics(updated);
    }, 500);
  };

  const addNewRow = () => {
    setData([...data, { id: Date.now(), status: 'Pending' }]);
  };

  // --- 4. EXCEL IMPORT ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

            const mapped = json.map((row: any) => ({
                id: Date.now() + Math.random(),
                projectCode: row['Project Code'] || row['Code'] || '',
                projectDescription: row['Project Description'] || row['Description'] || '',
                destination: row['Destination'] || '',
                poReference: row['PO Reference'] || '',
                totalParts: row['Total No. of parts'] || row['Total'] || 0,
                totalPartsProduced: row['Total parts produced'] || 0,
                status: 'Pending'
            }));

            // Run calc on imported data
            const processed = mapped.map(row => {
                const total = parseFloat(row.totalParts) || 0;
                const produced = parseFloat(row.totalPartsProduced) || 0;
                return {
                    ...row,
                    percentCompleted: total > 0 ? Math.round((produced / total) * 100) : 0,
                    totalPartsToBeProduced: Math.max(0, total - produced)
                };
            });

            const finalData = [...processed, ...data];
            setData(finalData);
            runAnalytics(finalData);
            localStorage.setItem('erpProjectData', JSON.stringify(finalData));
            alert(`Imported ${processed.length} projects.`);
        } catch (e) { alert("Excel Error"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleExport = () => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Projects");
      XLSX.writeFile(wb, "Project_Data.xlsx");
  };

    // --- 5. CLEAR ALL / RESET ---
    const clearAll = () => {
        if (!confirm('Clear all project data? This cannot be undone.')) return;
        try {
            localStorage.removeItem('erpProjectData');
            localStorage.removeItem('boms');
            setData([]);
            setStats({ total: 0, completed: 0, inProgress: 0, efficiency: 0 });
            setChartData([]);
            setStatusChart([]);
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
            }
            alert('Project data cleared.');
        } catch (e) {
            console.error('Error clearing data', e);
        }
    };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-20 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
      <div className="fixed top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 space-y-8 p-2">
      
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
            <h1 className="text-4xl font-light tracking-tight text-white">Project Manager</h1>
            <p className="text-zinc-400 mt-1">Master Production Control</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-bold animate-pulse">
                <Activity className="w-4 h-4" /> Live Sync
            </div>
        </div>

        {/* --- 1. VISUALS (Charts & KPIs) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPIs */}
            <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center justify-between">
                    <div>
                        <p className="text-zinc-400 text-xs uppercase font-bold">Total Projects</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{stats.total}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><FileText className="w-6 h-6"/></div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center justify-between">
                    <div>
                        <p className="text-zinc-400 text-xs uppercase font-bold">Avg Completion</p>
                        <h3 className="text-3xl font-bold text-green-400 mt-1">{stats.efficiency}%</h3>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-xl text-green-400"><TrendingUp className="w-6 h-6"/></div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex items-center justify-between">
                    <div>
                        <p className="text-zinc-400 text-xs uppercase font-bold">In Progress</p>
                        <h3 className="text-3xl font-bold text-yellow-400 mt-1">{stats.inProgress}</h3>
                    </div>
                    <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-400"><Clock className="w-6 h-6"/></div>
                </div>
            </div>

            {/* Charts */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
                    <h3 className="text-sm font-bold text-zinc-300 mb-4">Project Status</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {statusChart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor:'#18181b', borderColor:'#27272a', borderRadius:'10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Done</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Active</span>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
                    <h3 className="text-sm font-bold text-zinc-300 mb-4">Production Targets</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis dataKey="name" hide />
                                <Tooltip contentStyle={{backgroundColor:'#18181b', borderColor:'#27272a', borderRadius:'10px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Bar dataKey="Actual" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Target" fill="#27272a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 2. DATA GRID (Excel Logic + Dark UI) --- */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            
            {/* Toolbar */}
            <div className="p-5 border-b border-white/10 flex flex-wrap justify-between items-center gap-4 bg-white/5">
                <div className="flex gap-2">
                    <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                        <RefreshCw className="w-3 h-3"/> Sync
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                        <Upload className="w-3 h-3"/> Import
                        <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx" />
                    </button>
                    <button onClick={handleExport} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                        <Download className="w-3 h-3"/> Export
                    </button>
                    <button onClick={clearAll} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                        <Trash2 className="w-3 h-3"/> Clear
                    </button>
                </div>
                
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                        className="pl-9 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-blue-500 transition-all w-64" 
                        placeholder="Search..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-zinc-950 sticky top-0 z-10 shadow-lg">
                        <tr>
                            <th className="p-4 border-b border-r border-white/10 text-center w-12 text-zinc-500 text-xs">#</th>
                            {COLUMNS.map(col => (
                                <th key={col.id} className="p-4 border-b border-r border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-wider whitespace-nowrap" style={{minWidth: col.width}}>
                                    {col.name}
                                </th>
                            ))}
                            <th className="p-4 border-b border-white/10 text-zinc-500 text-center text-xs uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.filter(r => !searchTerm || JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row, i) => (
                            <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="p-2 border-r border-white/5 text-center text-zinc-600 font-mono text-xs bg-black/20">{i + 1}</td>
                                
                                {COLUMNS.map(col => (
                                    <td key={col.id} className="p-0 border-r border-white/5 relative h-10">
                                        {col.id === 'percentCompleted' ? (
                                            <div className="w-full h-full flex items-center px-3 relative">
                                                <div className="absolute inset-0 bg-blue-500/10" style={{ width: `${Math.min(100, row[col.id] || 0)}%` }}></div>
                                                <span className={`relative z-10 font-bold text-xs ${row[col.id] >= 100 ? 'text-green-400' : 'text-blue-400'}`}>{row[col.id] || 0}%</span>
                                            </div>
                                        ) : (
                                            <input 
                                                type={col.type || 'text'}
                                                readOnly={col.readOnly}
                                                className={`w-full h-full bg-transparent px-3 text-xs text-white outline-none focus:bg-blue-500/10 focus:shadow-[inset_2px_0_0_#3b82f6] transition-all placeholder-zinc-700 ${col.readOnly ? 'text-zinc-500 cursor-not-allowed' : ''}`}
                                                value={row[col.id] || ''}
                                                onChange={(e) => handleCellChange(i, col.id, e.target.value)}
                                            />
                                        )}
                                    </td>
                                ))}

                                <td className="p-2 text-center">
                                    <button 
                                        onClick={() => window.open(`/pm/project/${row.id}`, '_blank')}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Floating Add Button */}
        <button 
            onClick={addNewRow}
            className="fixed bottom-10 right-10 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-2xl shadow-blue-900/50 flex items-center justify-center text-white transition-transform hover:scale-110 z-50"
        >
            <Plus className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
}