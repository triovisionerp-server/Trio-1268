'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx'; 
import { 
  LogOut, UploadCloud, Package, CheckCircle, XCircle, UserPlus,
  FileSpreadsheet, Bell, Trash2, AlertCircle, ChevronRight, Layers, Layout, Plus, RotateCcw 
} from 'lucide-react';
import { subscribeToProjects, addProjectToCloud, deleteProjectFromCloud } from '@/lib/services';

// --- CONFIGURATION ---
const DEPARTMENTS = [
  'Stock Building', 'Machining', 'Lamination', 'Assembly', 'Quality'
];

const SUPERVISORS = [
  { name: 'Rajesh Kumar', role: 'Stock Lead', dept: 'Stock Building' },
  { name: 'Amit Singh', role: 'Machining Lead', dept: 'Machining' },
  { name: 'Sarah Jenkins', role: 'Lamination Lead', dept: 'Lamination' },
  { name: 'Mike Ross', role: 'Assembly Lead', dept: 'Assembly' },
];

export default function ProjectManagerDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState('');
  const [boms, setBoms] = useState<any[]>([]);
  const [selectedBOM, setSelectedBOM] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Forms
  const [assignForm, setAssignForm] = useState({
     dept: 'Stock Building',
     supervisor: 'Rajesh Kumar',
     task: 'Base Making',
     allocationSQM: 0 
  });
  const [newProjectForm, setNewProjectForm] = useState({ code: '', name: '', client: '', molds: 1, sqm: 10 });

  // --- 1. LIVE DATA CONNECTION ---
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    setUser('Project Manager');

    // Connect to Cloud
    const unsubscribe = subscribeToProjects((data) => {
      console.log("Live Data Received:", data); // Debugging
      setBoms(data || []);
    });

    // Cleanup connection when leaving page
    return () => {
      try { if (typeof unsubscribe === 'function') unsubscribe(); } catch { /* ignore */ }
    };
  }, []);


  // --- 2. SMART EXCEL UPLOAD ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        console.log("Raw Excel Data:", rows);

        if (!rows || rows.length === 0) {
            alert("Excel file is empty or unreadable.");
            return;
        }

        // Build optimistic items and upload promises
        const optimisticItems: any[] = [];
        const uploadPromises = rows.map((row: any) => {
            const pCode = row['Code'] || row['Project Code'] || row['Job No'] || `AUTO-${Math.floor(Math.random()*1000)}`;
            const pDesc = row['Description'] || row['Project Name'] || row['Desc'] || 'No Description';
            const pSQM = parseFloat(row['SQM'] || row['Area'] || row['Total SQM']) || 10;
            const pMolds = parseInt(row['Molds'] || row['Qty']) || 1;

            const newProject = {
                projectCode: pCode,
                projectDescription: pDesc,
                customer: row['Customer'] || row['Client'] || 'General',
                moldSeries: row['Series'] || '32',
                totalMolds: pMolds,
                targetPartsCompletion: parseInt(row['Target']) || 50,
                sqmPerPart: pSQM,
                status: 'Pending',
                progress: 0,
                materials: {
                    resinType: 'Standard',
                    gelcoatPerMold: parseFloat((pSQM * 0.6).toFixed(2)),
                    resinPerMold: parseFloat((pSQM * 1.5).toFixed(2))
                }
            };

            const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            optimisticItems.push({ id: tempId, ...newProject });

            return (async () => {
              try {
                const cloudId = await addProjectToCloud(newProject);
                // Replace temp item id with cloud id when available
                setBoms(prev => prev.map(p => p.id === tempId ? { ...p, id: cloudId } : p));
                return { ok: true, cloudId };
              } catch (err) {
                console.error("Upload row error:", err);
                // remove optimistic item on failure
                setBoms(prev => prev.filter(p => p.id !== tempId));
                return { ok: false, err };
              }
            })();
        });

        // Immediately show optimistic items in the UI
        setBoms(prev => [...optimisticItems, ...prev]);

        // Wait for all uploads to finish (some may fail)
        const results = await Promise.allSettled(uploadPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && (r as any).value?.ok).length;
        alert(`Upload finished. Projects attempted: ${rows.length}. Succeeded: ${successCount}.`);
      } catch (error) {
        console.error("Excel Error:", error);
        alert("Error reading Excel file. Check console for details.");
      } finally {
        // Reset file input
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- 3. MANUAL CREATE ---
  const handleCreateManual = async () => {
    if(!newProjectForm.code || !newProjectForm.name) return alert("Fill required fields");
    
    const newProject = {
        projectCode: newProjectForm.code,
        projectDescription: newProjectForm.name,
        customer: newProjectForm.client,
        moldSeries: '32', 
        totalMolds: newProjectForm.molds,
        targetPartsCompletion: 50,
        sqmPerPart: newProjectForm.sqm,
        status: 'Pending',
        progress: 0,
        materials: { 
            resinType: 'Standard', 
            gelcoatPerMold: parseFloat((newProjectForm.sqm * 0.6).toFixed(1))
        }
    };

    // Optimistic UI: add temp item immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const tempProject = { id: tempId, ...newProject };
    setBoms(prev => [tempProject, ...prev]);

    try {
      const cloudId = await addProjectToCloud(newProject);
      // replace temp id with cloud id
      setBoms(prev => prev.map(p => p.id === tempId ? { ...p, id: cloudId } : p));
      setShowCreateModal(false);
      alert('Project created successfully.');
    } catch (err) {
      console.error('Create error', err);
      // remove optimistic item on failure
      setBoms(prev => prev.filter(p => p.id !== tempId));
      alert('Failed to create project. Check console.');
    }
  };

  const deleteProject = async (id: string) => {
     if(confirm("Delete this project from the Cloud?")) {
         try {
           await deleteProjectFromCloud(id);
         } catch (err) {
           console.error('Delete error', err);
           alert('Failed to delete project. Check console.');
         }
     }
  };

  const getGelcoat = (bom: any) => {
      if (!bom) return "0.0";
      const molds = Number(bom.totalMolds || 0);
      const perMold = Number(bom.materials?.gelcoatPerMold || 0);
      return (molds * perMold).toFixed(1);
  };

  return (
    <div className="space-y-8 font-sans text-white pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-4xl font-light text-white tracking-tight">Project Manager</h1>
           <p className="text-zinc-400 mt-1">Cloud Production Server</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="text-xs text-zinc-400 uppercase font-bold">Logged In</p>
                <p className="text-white font-medium">{user}</p>
            </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-green-400" /> Production Database
            </h2>
            <p className="text-sm text-zinc-400 mt-1">Real-time Sync across all devices</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold shadow-lg transition-all">
                <Plus className="w-5 h-5" /> New Project
            </button>
            <div className="relative">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-900/20 transition-all transform hover:scale-105">
                    <UploadCloud className="w-5 h-5" /> Import Excel
                </button>
            </div>
        </div>
      </div>

      {/* Project List */}
      <div className="space-y-4">
        {boms.length === 0 ? (
            <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                <UploadCloud className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                <p className="text-zinc-400 text-xl">No active projects.</p>
                <p className="text-zinc-600 text-sm mt-2">Upload an Excel file to start.</p>
            </div>
        ) : (
            boms.map((bom) => (
                <motion.div 
                    key={bom.id} 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all group relative backdrop-blur-md"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex-1">
                            <div className="flex flex-wrap gap-3 mb-4">
                                <span className="px-3 py-1 bg-purple-500/10 text-purple-300 rounded-lg text-xs font-bold border border-purple-500/20">{bom.projectCode}</span>
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-lg text-xs font-bold border border-blue-500/20">{bom.customer}</span>
                            </div>
                            <h3 className="text-2xl font-light text-white mb-2">{bom.projectDescription}</h3>
                            
                            <div className="grid grid-cols-4 gap-6 mt-6">
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Molds</p>
                                    <p className="text-white font-mono">{bom.totalMolds}</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Target</p>
                                    <p className="text-white font-mono">{bom.targetPartsCompletion}</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Area</p>
                                    <p className="text-white font-mono">{bom.sqmPerPart || 0} m²</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Gelcoat</p>
                                    <p className="text-green-400 font-mono">{getGelcoat(bom)} kg</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-3">
                            <button onClick={() => setSelectedBOM(bom)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg flex items-center gap-2 transition-all">
                                <UserPlus className="w-4 h-4" /> Assign Work
                            </button>
                            <button onClick={() => deleteProject(bom.id)} className="p-3 text-zinc-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl transition-colors border border-white/5">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))
        )}
      </div>

      {/* MANUAL CREATE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-2xl font-light text-white">Create New Project</h2>
                        <button onClick={() => setShowCreateModal(false)}><XCircle className="w-6 h-6 text-zinc-500 hover:text-white"/></button>
                    </div>
                    <div className="space-y-4 relative z-10">
                        <input className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="Project Code" onChange={e => setNewProjectForm({...newProjectForm, code: e.target.value})} />
                        <input className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="Project Name" onChange={e => setNewProjectForm({...newProjectForm, name: e.target.value})} />
                        <input className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="Client Name" onChange={e => setNewProjectForm({...newProjectForm, client: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="Molds" onChange={e => setNewProjectForm({...newProjectForm, molds: parseInt(e.target.value)})} />
                            <input type="number" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors" placeholder="Area (SQM)" onChange={e => setNewProjectForm({...newProjectForm, sqm: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                    <button onClick={handleCreateManual} className="w-full mt-8 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 shadow-lg flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Save Project
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Note: Assignment Modal code remains similar, focusing on Firebase/Service calls */}
    </div>
  );
}