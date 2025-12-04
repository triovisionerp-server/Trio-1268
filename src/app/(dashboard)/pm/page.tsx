'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx'; 
import { 
  Save, Upload, Download, Trash2, Plus, 
  FileSpreadsheet, Search, ExternalLink, 
  TrendingUp, Clock, CheckCircle, Activity, AlertCircle,
  PieChart as PieIcon, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { motion } from 'framer-motion';

// --- EXACT COLUMNS (From data-entry.html) ---
const COLUMNS = [
  { id: 'projectCode', name: 'Project Code', type: 'text', width: 120 },
  { id: 'projectDescription', name: 'Description', type: 'text', width: 250 },
  { id: 'destination', name: 'Destination', type: 'text', width: 150 },
  { id: 'totalParts', name: 'Total Parts', type: 'number', width: 100 },
  { id: 'totalPartsProduced', name: 'Produced', type: 'number', width: 100 },
  { id: 'percentCompleted', name: '% Done', type: 'number', width: 100, readOnly: true },
  { id: 'targetCompletionDate', name: 'Target Date', type: 'date', width: 140 },
  { id: 'status', name: 'Status', type: 'text', width: 120 },
  { id: 'ebom_resin', name: 'Est. Resin', type: 'text', width: 100, readOnly: true }
];

export default function ProjectManagerDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [graphData, setGraphData] = useState<any[]>([]);
  const [statusChart, setStatusChart] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // --- 1. LOAD & ANALYZE DATA ---
  useEffect(() => {
    const saved = localStorage.getItem('boms'); // Using 'boms' as the master DB
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjects(parsed);
      runAnalytics(parsed);
    }
  }, []);

  // --- 2. ANALYTICS ENGINE (Odoo Style) ---
  const runAnalytics = (data: any[]) => {
    // KPIs
    const total = data.length;
    const active = data.filter(p => p.status === 'In Progress').length;
    const completed = data.filter(p => p.status === 'Completed').length;
    setStats({ total, active, completed });

    // Graph 1: Project Status Distribution (Pie)
    const pie = [
        { name: 'Pending', value: data.filter(p => p.status === 'Pending').length, color: '#f59e0b' },
        { name: 'In Progress', value: active, color: '#3b82f6' },
        { name: 'Completed', value: completed, color: '#10b981' }
    ];
    setStatusChart(pie);

    // Graph 2: Material Load (Bar - Top 5 Projects)
    // Shows how much Resin each big project needs
    const bar = data
        .filter(p => p.status !== 'Completed')
        .sort((a, b) => (b.sqmPerPart || 0) - (a.sqmPerPart || 0))
        .slice(0, 5)
        .map(p => ({
            name: p.projectCode,
            Resin: parseFloat(p.ebom?.resin) || 0,
            Gelcoat: parseFloat(p.ebom?.gelcoat) || 0
        }));
    setGraphData(bar);
  };

  // --- 3. DATA ENTRY & AUTO-CALC ---
  const handleCellChange = (index: number, field: string, value: any) => {
    const updated = [...projects];
    updated[index][field] = value;

    // Auto-Math: Progress
    if (field === 'totalParts' || field === 'totalPartsProduced') {
       const total = parseFloat(updated[index].totalParts) || 0;
       const produced = parseFloat(updated[index].totalPartsProduced) || 0;
       const percent = total > 0 ? Math.round((produced / total) * 100) : 0;
       
       updated[index].percentCompleted = percent;
       updated[index].totalPartsToBeProduced = Math.max(0, total - produced);
       
       if (percent >= 100) updated[index].status = 'Completed';
       else if (percent > 0) updated[index].status = 'In Progress';
    }

    setProjects(updated);
    localStorage.setItem('boms', JSON.stringify(updated));
    runAnalytics(updated); // Update graphs live!
  };

  // --- 4. EXCEL IMPORT (Auto-BOM) ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const mapped = json.map((row: any) => {
            const sqm = parseFloat(row['SQM'] || row['Area']) || 10;
            return {
                id: Date.now() + Math.random(),
                projectCode: row['Code'] || row['Project Code'] || 'NEW',
                projectDescription: row['Description'] || 'Imported',
                totalParts: row['Total'] || row['Qty'] || 0,
                sqmPerPart: sqm,
                status: 'Pending',
                // AUTO-BOM CALCULATOR
                ebom: {
                    resin: (sqm * 1.5).toFixed(1),
                    gelcoat: (sqm * 0.6).toFixed(1),
                    manpower: Math.ceil(sqm / 5)
                }
            };
        });

        const finalData = [...mapped, ...projects];
        setProjects(finalData);
        localStorage.setItem('boms', JSON.stringify(finalData));
        runAnalytics(finalData);
        alert(`Imported ${mapped.length} projects with Auto-BOM!`);
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; 
  };

  const addNewRow = () => {
      setProjects([...projects, { id: Date.now(), status: 'Pending', ebom: { resin: 0 } }]);
  };

  const clearAll = () => {
      if(confirm("Clear Database?")) {
          setProjects([]);
          localStorage.removeItem('boms');
          runAnalytics([]);
      }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans text-[#333] pb-20">
      
      {/* --- TOP SECTION: ODOO STYLE ANALYTICS --- */}
      <div className="bg-[linear-gradient(135deg,#4c90af_0%,#175d69_100%)] text-white p-8 pb-32 shadow-xl">
         <div className="max-w-[1800px] mx-auto flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Project Command Center</h1>
                <p className="text-blue-200 text-sm opacity-80">Real-time Overview & Planning</p>
            </div>
            <div className="flex gap-3">
                 <div className="text-right">
                    <p className="text-xs uppercase font-bold opacity-70">Active Projects</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                 </div>
                 <div className="h-10 w-px bg-white/20"></div>
                 <div className="text-right">
                    <p className="text-xs uppercase font-bold opacity-70">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-400">
                        {stats.total > 0 ? Math.round((stats.completed/stats.total)*100) : 0}%
                    </p>
                 </div>
            </div>
         </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 -mt-24 space-y-8">
          
          {/* CHARTS ROW (Floating Glass Cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Status Chart */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl flex flex-col justify-between min-h-[300px]">
                  <h3 className="text-white font-bold flex items-center gap-2">
                      <PieIcon className="w-5 h-5 text-yellow-400"/> Project Status
                  </h3>
                  <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={statusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {statusChart.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Pie>
                              <Tooltip contentStyle={{borderRadius:'12px'}} />
                              <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Material Load Chart */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl min-h-[300px]">
                  <h3 className="text-white font-bold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400"/> Material Load (Top 5 Projects)
                  </h3>
                  <div className="h-64 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={graphData} barSize={20} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                              <XAxis type="number" stroke="#ccc" fontSize={10} />
                              <YAxis dataKey="name" type="category" width={80} stroke="#ccc" fontSize={10} />
                              <Tooltip contentStyle={{borderRadius:'12px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                              <Bar dataKey="Resin" fill="#3b82f6" name="Resin (kg)" radius={[0, 4, 4, 0]} />
                              <Bar dataKey="Gelcoat" fill="#10b981" name="Gelcoat (kg)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* 3. DATA GRID (Excel Style - White) */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              
              {/* Toolbar */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                      <button onClick={() => localStorage.setItem('boms', JSON.stringify(projects))} className="bg-[#1c8ccc] hover:bg-[#1565c0] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                          <Save className="w-4 h-4"/> Save Changes
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                          <Upload className="w-4 h-4"/> Import Excel
                          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx" />
                      </button>
                      <button onClick={clearAll} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                          <Trash2 className="w-4 h-4"/> Clear DB
                      </button>
                  </div>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                          placeholder="Search projects..." 
                          className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1c8ccc] w-64"
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 z-10 shadow-sm">
                          <tr className="bg-[#ffe0b2]">
                              <th className="p-3 border border-[#ffcc80] text-[#e65100] text-center w-12 text-xs font-bold">#</th>
                              {COLUMNS.map(col => (
                                  <th key={col.id} className="p-3 border border-[#ffcc80] text-[#e65100] text-xs font-bold whitespace-nowrap text-center" style={{minWidth: col.width || 120}}>
                                      {col.name}
                                  </th>
                              ))}
                              <th className="p-3 border border-[#ffcc80] text-[#e65100] text-center text-xs font-bold w-20">Open</th>
                          </tr>
                      </thead>
                      <tbody>
                          {projects.filter(r => !searchTerm || JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row, i) => (
                              <tr key={row.id} className="hover:bg-[#fff3e0] odd:bg-[#fcfcfc] group">
                                  <td className="p-2 border border-gray-300 text-center font-bold text-gray-500 text-xs bg-gray-100">{i + 1}</td>
                                  
                                  {COLUMNS.map(col => (
                                      <td key={col.id} className="p-0 border border-gray-300">
                                          {col.id === 'percentCompleted' ? (
                                               <div className="w-full h-8 flex items-center px-2">
                                                   <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                                       <div className={`h-full ${row[col.id] >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${row[col.id]}%`}}></div>
                                                   </div>
                                                   <span className="text-xs font-bold text-gray-600">{row[col.id]}%</span>
                                               </div>
                                          ) : (
                                              <input 
                                                  type={col.type || 'text'}
                                                  readOnly={col.readOnly}
                                                  className={`w-full h-8 px-2 text-xs bg-transparent outline-none focus:bg-[#fff3e0] focus:ring-1 focus:ring-[#ff9800] ${col.readOnly ? 'text-gray-500 bg-gray-50' : 'text-gray-800'}`}
                                                  value={row[col.id] || ''}
                                                  onChange={(e) => handleCellChange(i, col.id, e.target.value)}
                                              />
                                          )}
                                      </td>
                                  ))}

                                  <td className="p-2 border border-gray-300 text-center">
                                      <button 
                                        onClick={() => window.open(`/pm/project/${row.id}`, '_blank')}
                                        className="text-[#1c8ccc] hover:text-[#1565c0] font-bold text-xs hover:underline flex items-center justify-center w-full"
                                      >
                                          Dashboard <ExternalLink className="w-3 h-3 ml-1" />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* FAB */}
          <button 
              onClick={addNewRow}
              className="fixed bottom-8 right-8 w-14 h-14 bg-[#1c8ccc] hover:bg-[#1565c0] text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all z-50 hover:scale-110"
              title="Add Project Row"
          >
              <Plus className="w-6 h-6" />
          </button>
      </div>
    </div>
  );
}