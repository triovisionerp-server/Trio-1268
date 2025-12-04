'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx'; 
import { 
  Save, Upload, Download, Trash2, Plus, Search, 
  FileText, Calendar, MoreVertical, ExternalLink 
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- EXACT COLUMNS FROM YOUR HTML ---
const COLUMNS = [
  { id: 'projectCode', name: 'Project Code', width: 140 },
  { id: 'projectDescription', name: 'Description', width: 250 },
  { id: 'destination', name: 'Destination', width: 150 },
  { id: 'poReference', name: 'PO Ref', width: 120 },
  { id: 'targetCompletionDate', name: 'Target Date', type: 'date', width: 140 },
  { id: 'estimatedStartDate', name: 'Start Date', type: 'date', width: 140 },
  { id: 'totalParts', name: 'Total Parts', type: 'number', width: 100 },
  { id: 'totalPartsProduced', name: 'Produced', type: 'number', width: 100 },
  { id: 'totalPartsToBeProduced', name: 'Remaining', width: 100, readOnly: true },
  { id: 'percentCompleted', name: '% Done', width: 100, readOnly: true },
  { id: 'expectedCompletionDate', name: 'Exp. Completion', type: 'date', width: 140 },
  { id: 'containerNumber', name: 'Container #', width: 140 },
  { id: 'containerType', name: 'Type', width: 100 },
  { id: 'dispatchDate', name: 'Dispatch', type: 'date', width: 140 },
  { id: 'arrivalDate', name: 'Arrival', type: 'date', width: 140 },
  { id: 'status', name: 'Status', width: 120 },
  { id: 'remarks', name: 'Remarks', width: 200 }
];

export default function PMDataGrid() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 1. LOAD DATA
  useEffect(() => {
    const saved = localStorage.getItem('erpProjectData');
    if (saved) {
      const parsed = JSON.parse(saved);
      setData(parsed);
      updateStats(parsed);
    } else {
      const initial = Array(5).fill({}).map((_, i) => ({ id: Date.now() + i }));
      setData(initial);
    }
  }, []);

  // 2. AUTO-SAVE & CALCULATION ENGINE
  const handleCellChange = (index: number, field: string, value: any) => {
    const updated = [...data];
    if (!updated[index]) updated[index] = { id: Date.now() };
    updated[index][field] = value;

    // Logic 4A: Auto-Calculate Progress
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
        updateStats(updated);
    }, 500);
  };

  const updateStats = (dataset: any[]) => {
      const valid = dataset.filter(r => r.projectCode);
      setStats({
          total: valid.length,
          active: valid.filter(r => r.status === 'In Progress').length,
          completed: valid.filter(r => r.status === 'Completed').length
      });
  };

  const addNewRow = () => setData([...data, { id: Date.now() }]);

  // 3. EXCEL IMPORT (Option 2B)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const mapped = json.map((row: any) => ({
            id: Date.now() + Math.random(),
            projectCode: row['Code'] || '',
            projectDescription: row['Description'] || '',
            totalParts: row['Total'] || 0,
            status: 'Pending'
        }));
        
        const merged = [...mapped, ...data];
        setData(merged);
        localStorage.setItem('erpProjectData', JSON.stringify(merged));
        updateStats(merged);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 font-sans text-white pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h1 className="text-4xl font-light tracking-tight">Project Manager</h1>
           <p className="text-zinc-400 mt-1">Master Production Schedule</p>
        </div>
        <div className="flex gap-3">
            <div className="px-5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm font-bold border-l-4 border-l-blue-500">
                {stats.active} Active
            </div>
            <div className="px-5 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm font-bold border-l-4 border-l-green-500">
                {stats.completed} Done
            </div>
            <div className="px-5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 text-sm font-bold">
                {stats.total} Total
            </div>
        </div>
      </div>

      {/* --- TOOLBAR (Glass) --- */}
      <div className="flex flex-wrap justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
         <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative group w-full md:w-64">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                 <input 
                    className="pl-10 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all w-full" 
                    placeholder="Search projects..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
         </div>
         
         <div className="flex gap-2 mt-3 md:mt-0">
             <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx" />
             <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                <Upload className="w-4 h-4"/> Import Excel
             </button>
             <button onClick={() => { if(confirm('Clear?')) { setData([]); localStorage.removeItem('erpProjectData'); } }} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                <Trash2 className="w-4 h-4"/> Clear
             </button>
         </div>
      </div>

      {/* --- THE DARK GLASS GRID --- */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl relative">
         <div className="overflow-x-auto max-h-[65vh] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            <table className="w-full text-left text-sm border-collapse">
               <thead className="sticky top-0 z-10 bg-[#09090b] shadow-lg">
                  <tr>
                     <th className="p-4 border-b border-white/10 text-zinc-500 w-12 text-center text-xs">#</th>
                     {COLUMNS.map((col) => (
                        <th key={col.id} className="p-4 border-b border-white/10 text-zinc-300 font-medium text-xs uppercase tracking-wider whitespace-nowrap" style={{ minWidth: col.width }}>
                           {col.name}
                        </th>
                     ))}
                     <th className="p-4 border-b border-white/10 text-zinc-500 text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {data.filter(r => !searchTerm || JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row, i) => (
                     <motion.tr 
                        key={row.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="group hover:bg-white/[0.02] transition-colors"
                     >
                        <td className="p-0 border-r border-white/5 text-center text-zinc-600 font-mono text-xs bg-white/[0.01]">{i + 1}</td>
                        
                        {COLUMNS.map((col) => (
                           <td key={col.id} className="p-0 border-r border-white/5 relative h-12">
                               {col.id === 'percentCompleted' ? (
                                   <div className="w-full h-full flex items-center px-4 relative">
                                       <div className="absolute inset-0 bg-blue-500/10" style={{ width: `${row[col.id] || 0}%` }} />
                                       <span className={`relative z-10 font-bold text-xs ${row[col.id] >= 100 ? 'text-green-400' : 'text-blue-400'}`}>{row[col.id] || 0}%</span>
                                   </div>
                               ) : (
                                   <input 
                                     type={col.type || 'text'}
                                     readOnly={col.readOnly}
                                     className={`w-full h-full bg-transparent px-4 text-xs text-white outline-none focus:bg-blue-500/10 focus:shadow-[inset_3px_0_0_#3b82f6] transition-all placeholder-zinc-700 ${col.readOnly ? 'cursor-not-allowed text-zinc-500' : ''}`}
                                     value={row[col.id] || ''}
                                     onChange={(e) => handleCellChange(i, col.id, e.target.value)}
                                     placeholder="..."
                                   />
                               )}
                           </td>
                        ))}

                        <td className="p-2 text-right">
                            <button 
                                onClick={() => window.open(`/pm/project/${row.id}`, '_blank')}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                title="Open Project Dashboard"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </td>
                     </motion.tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         {/* Empty State */}
         {data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p>No projects found.</p>
                <button onClick={addNewRow} className="mt-4 text-blue-500 hover:text-blue-400 text-sm hover:underline">Create your first entry</button>
            </div>
         )}
      </div>

      {/* FAB Add Button */}
      <button 
         onClick={addNewRow}
         className="fixed bottom-10 right-10 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-2xl shadow-blue-900/50 flex items-center justify-center text-white transition-transform hover:scale-110 z-50"
      >
         <Plus className="w-6 h-6" />
      </button>

    </div>
  );
}