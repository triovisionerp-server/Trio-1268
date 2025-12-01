'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardHat, CheckCircle, Clock, Save, AlertCircle, 
  ChevronRight, Calendar, User 
} from 'lucide-react';

// --- EXCEL NORMS (Minutes per SQM) ---
const NORMS: Record<string, number> = {
  "Base Making": 40,
  "Stock Cutting": 45,
  "Stock Bonding": 60,
  "CNC Roughing": 30,
  "Manual Finishing": 50,
  "Gelcoat Application": 25,
  "Fiber Layup": 120,
  // Add others from your Excel...
  "default": 60
};

export default function SupervisorPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [input, setInput] = useState({ sqmDone: 0, hoursSpent: 0, manpower: 0 });
  const [currentUser, setCurrentUser] = useState('');

  useEffect(() => {
    // 1. SIMULATE LOGIN (In real app, this comes from Auth)
    // Change this name to test different supervisors: "Rajesh Kumar", "Amit Singh"
    const loggedInUser = localStorage.getItem('currentUserName') || "Rajesh Kumar";
    setCurrentUser(loggedInUser);

    // 2. LOAD ASSIGNED TASKS
    const allJobs = JSON.parse(localStorage.getItem('tooling_jobs') || "[]");
    
    // 3. FILTER: Only show tasks assigned to THIS supervisor
    const myJobs = allJobs.filter((job: any) => 
        job.assignedTo === loggedInUser && job.status !== 'Completed'
    );
    setTasks(myJobs);
  }, []);

  // --- EFFICIENCY FORMULA (From Excel) ---
  const calculateEfficiency = () => {
    if (!selectedJob) return 0;
    const norm = NORMS[selectedJob.operation] || NORMS['default'];
    
    // Standard Mins = Output (SQM) * Norm
    const standardMins = input.sqmDone * norm;
    
    // Actual Mins = Manpower * Hours * 60
    const actualMins = input.manpower * input.hoursSpent * 60;

    if (actualMins === 0) return 0;
    return Math.round((standardMins / actualMins) * 100);
  };

  const handleSubmit = () => {
    if (!selectedJob) return;
    const eff = calculateEfficiency();

    // Save Record
    const dailyLog = {
        jobId: selectedJob.id,
        projectName: selectedJob.projectName,
        operation: selectedJob.operation,
        date: new Date().toISOString(),
        output: input.sqmDone,
        manpower: input.manpower,
        efficiency: eff,
        status: "Submitted"
    };

    // Save to Server
    const productions = JSON.parse(localStorage.getItem('productions') || "[]");
    localStorage.setItem('productions', JSON.stringify([dailyLog, ...productions]));

    // Update Progress
    const allJobs = JSON.parse(localStorage.getItem('tooling_jobs') || "[]");
    const updatedJobs = allJobs.map((j: any) => {
        if (j.id === selectedJob.id) {
            const newTotal = (j.completedSQM || 0) + input.sqmDone;
            // Auto-Complete if target reached
            const status = newTotal >= j.targetSQM ? 'Completed' : 'In Progress';
            return { ...j, completedSQM: newTotal, status: status };
        }
        return j;
    });
    localStorage.setItem('tooling_jobs', JSON.stringify(updatedJobs));
    
    // Refresh View
    setTasks(updatedJobs.filter((j: any) => j.assignedTo === currentUser && j.status !== 'Completed'));
    
    alert(`Report Submitted!\nEfficiency: ${eff}%\nTask Status: ${updatedJobs.find((j:any)=>j.id===selectedJob.id).status}`);
    setSelectedJob(null);
  };

  return (
    <div className="space-y-8 font-sans text-white">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
           <p className="text-zinc-400">Assigned Work Orders</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase font-bold">Logged In</p>
                <p className="text-white font-bold">{currentUser}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">
                {currentUser.charAt(0)}
            </div>
        </div>
      </div>

      {/* TASK LIST */}
      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
             <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                <HardHat className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-500">No pending tasks assigned to you.</p>
             </div>
        ) : (
            tasks.map((job) => {
                const progress = Math.min(100, Math.round(((job.completedSQM || 0) / job.targetSQM) * 100));
                return (
                <motion.div 
                    key={job.id}
                    layoutId={job.id}
                    className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all"
                >
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold">{job.projectName}</span>
                                <span className="text-zinc-400 text-sm bg-zinc-900/50 px-2 py-1 rounded">{job.department}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{job.operation}</h2>
                            
                            {/* Progress Bar */}
                            <div className="mt-4 w-full max-w-md">
                                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                    <span>{(job.completedSQM || 0)} / {job.targetSQM} SQM</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-end">
                            <button 
                                onClick={() => setSelectedJob(job)}
                                className="px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                            >
                                Daily Entry <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
                );
            })
        )}
      </div>

      {/* ENTRY MODAL */}
      <AnimatePresence>
        {selectedJob && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <div className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-3xl p-8 shadow-2xl">
                    <div className="mb-6 border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-bold text-white">Update Progress</h2>
                        <p className="text-zinc-400 text-sm">{selectedJob.projectName} - {selectedJob.operation}</p>
                    </div>

                    <div className="space-y-5">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Output Achieved (SQM)</label>
                            <input type="number" className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white font-bold text-lg outline-none" onChange={e => setInput({...input, sqmDone: parseFloat(e.target.value)})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Manpower</label>
                                <input type="number" className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none" onChange={e => setInput({...input, manpower: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Hours Spent</label>
                                <input type="number" className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none" onChange={e => setInput({...input, hoursSpent: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                        <button onClick={() => setSelectedJob(null)} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancel</button>
                        <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 shadow-lg flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" /> Submit
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}