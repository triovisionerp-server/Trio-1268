'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardHat, Save, 
  ChevronRight, Sparkles, Target, X, Package, ClipboardList
} from 'lucide-react';
import SupervisorMaterialRequest from './SupervisorMaterialRequest';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

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

type TabType = 'tasks' | 'materials';

export default function SupervisorPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [input, setInput] = useState({ sqmDone: 0, hoursSpent: 0, manpower: 0 });
  const [currentUser, setCurrentUser] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('tasks');

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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-end"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <div>
             <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
             <p className="text-zinc-400">Tasks & Material Requests</p>
          </div>
        </div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
            <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase font-bold">Logged In</p>
                <p className="text-white font-bold">{currentUser}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
                {currentUser.charAt(0)}
            </div>
        </motion.div>
      </motion.div>

      {/* TABS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800"
      >
        <motion.button
          onClick={() => setActiveTab('tasks')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'tasks'
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          My Tasks
          {tasks.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'tasks' ? 'bg-white/20' : 'bg-zinc-700'
            }`}>
              {tasks.length}
            </span>
          )}
        </motion.button>
        
        <motion.button
          onClick={() => setActiveTab('materials')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'materials'
              ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Material Requests
        </motion.button>
      </motion.div>

      {/* TAB CONTENT */}
      {activeTab === 'materials' ? (
        <SupervisorMaterialRequest />
      ) : (
        <>
          {/* TASK LIST */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4"
          >
            {tasks.length === 0 ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed"
                 >
                    <HardHat className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                    <p className="text-zinc-500">No pending tasks assigned to you.</p>
                 </motion.div>
            ) : (
                tasks.map((job, index) => {
                    const progress = Math.min(100, Math.round(((job.completedSQM || 0) / job.targetSQM) * 100));
                    return (
                    <motion.div 
                        key={job.id}
                        layoutId={job.id}
                        variants={fadeInUp}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01, y: -2 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl hover:bg-white/[0.07] transition-all"
                    >
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                <motion.span 
                                  whileHover={{ scale: 1.05 }}
                                  className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold border border-blue-500/30"
                                >
                                  {job.projectName}
                                </motion.span>
                                <span className="text-zinc-400 text-sm bg-zinc-900/50 px-2 py-1 rounded">{job.department}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{job.operation}</h2>
                            
                            {/* Progress Bar */}
                            <div className="mt-4 w-full max-w-md">
                                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                    <span>{(job.completedSQM || 0)} / {job.targetSQM} SQM</span>
                                    <span className={progress >= 75 ? 'text-green-400' : progress >= 50 ? 'text-yellow-400' : 'text-zinc-400'}>{progress}%</span>
                                </div>
                                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut' }}
                                      className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-end">
                            <motion.button 
                                whileHover={{ scale: 1.05, x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedJob(job)}
                                className="px-6 py-3 bg-gradient-to-r from-white to-zinc-100 text-black hover:from-zinc-100 hover:to-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                            >
                                Daily Entry <ChevronRight className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
                );
            })
        )}
          </motion.div>
        </>
      )}

      {/* ENTRY MODAL */}
      <AnimatePresence>
        {selectedJob && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Background glow effects */}
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                      className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" 
                    />

                    <div className="mb-6 border-b border-white/10 pb-4 relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
                              <Target className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-white">Update Progress</h2>
                              <p className="text-zinc-400 text-sm">{selectedJob.projectName} - {selectedJob.operation}</p>
                            </div>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelectedJob(null)}
                            className="p-2 text-zinc-500 hover:text-white transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </motion.button>
                        </div>
                    </div>

                    <motion.div 
                      initial="hidden"
                      animate="visible"
                      variants={staggerContainer}
                      className="space-y-5 relative z-10"
                    >
                        <motion.div variants={fadeInUp} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <label className="block text-xs text-zinc-400 uppercase font-bold mb-2 flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-green-400" /> Output Achieved (SQM)
                            </label>
                            <input 
                              type="number" 
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white font-bold text-lg outline-none focus:border-green-500 transition-colors" 
                              onChange={e => setInput({...input, sqmDone: parseFloat(e.target.value)})} 
                            />
                        </motion.div>

                        <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Manpower</label>
                                <input 
                                  type="number" 
                                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors" 
                                  onChange={e => setInput({...input, manpower: parseFloat(e.target.value)})} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Hours Spent</label>
                                <input 
                                  type="number" 
                                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors" 
                                  onChange={e => setInput({...input, hoursSpent: parseFloat(e.target.value)})} 
                                />
                            </div>
                        </motion.div>

                        {/* Live Efficiency Preview */}
                        <motion.div 
                          variants={fadeInUp}
                          className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-white/10 rounded-2xl"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400 uppercase font-bold">Estimated Efficiency</span>
                            <motion.span 
                              key={calculateEfficiency()}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={`text-2xl font-bold ${calculateEfficiency() >= 85 ? 'text-green-400' : calculateEfficiency() >= 70 ? 'text-yellow-400' : 'text-red-400'}`}
                            >
                              {calculateEfficiency()}%
                            </motion.span>
                          </div>
                        </motion.div>
                    </motion.div>

                    <motion.div 
                      variants={fadeInUp}
                      className="flex gap-3 mt-8 pt-4 border-t border-white/10 relative z-10"
                    >
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedJob(null)} 
                          className="flex-1 py-3 text-zinc-400 hover:text-white bg-white/5 rounded-xl border border-white/10 font-medium transition-all hover:bg-white/10"
                        >
                          Cancel
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSubmit} 
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 transition-all"
                        >
                            <Save className="w-4 h-4" /> Submit
                        </motion.button>
                    </motion.div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}