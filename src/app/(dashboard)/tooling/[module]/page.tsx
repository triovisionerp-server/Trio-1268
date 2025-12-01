'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle, Clock, Users, 
  Plus, Search, Filter, AlertCircle, User 
} from 'lucide-react';

export default function ToolingModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleKey = params.module as string;
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 1. Get User
    const session = localStorage.getItem('currentUser'); // e.g., "pm" or object
    // For demo purposes, let's assume we store the full user object or just name
    // If you logged in as 'supervisor', we need to know WHICH supervisor.
    // For this test, we will assume the name is stored.
    
    // MOCK LOGIN FOR TESTING (Remove this in production)
    // You can manually set this in browser console to test: localStorage.setItem('currentUserName', 'Rajesh Kumar')
    const loggedInName = localStorage.getItem('currentUserName') || 'Rajesh Kumar'; 
    const role = localStorage.getItem('currentUser'); // 'pm' or 'supervisor'

    setCurrentUser({ name: loggedInName, role: role });

    // 2. Load Jobs
    const allJobs = JSON.parse(localStorage.getItem('tooling_jobs') || "[]");
    
    // 3. Filter Jobs based on Module AND User
    const moduleJobs = allJobs.filter((job: any) => job.module === moduleKey);

    if (role === 'pm' || role === 'md') {
        // PM sees everything
        setTasks(moduleJobs);
    } else {
        // Supervisor sees ONLY their assignments
        // Note: Ensure the name matches exactly what was assigned in Step 1
        const myJobs = moduleJobs.filter((job: any) => job.assignedTo === loggedInName);
        setTasks(myJobs);
    }

  }, [moduleKey]);

  const handleCreate = () => {
    router.push(`/tooling/${moduleKey}/new-job`);
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight capitalize">{moduleKey} Dept</h1>
            <p className="text-zinc-400">Task Management</p>
          </div>
        </div>
        
        {/* Only PM can create new jobs */}
        {currentUser?.role === 'pm' && (
            <button onClick={handleCreate} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all">
            <Plus className="w-4 h-4" /> Assign New Job
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Task List */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl min-h-[500px]">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" /> 
                    {currentUser?.role === 'pm' ? 'All Department Tasks' : 'My Assigned Tasks'}
                  </h2>
                  <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-zinc-300">{tasks.length} Active</span>
              </div>
              
              <div className="space-y-3">
                {tasks.length > 0 ? tasks.map((task: any) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-zinc-800/80 transition-all cursor-pointer"
                  >
                     <div className="flex items-center gap-5">
                        <div className={`w-3 h-3 rounded-full ${task.status === 'In Progress' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors">{task.partCode}</h3>
                                <span className="text-xs text-zinc-500 border border-white/10 px-1.5 py-0.5 rounded">{task.operation}</span>
                           </div>
                           <p className="text-xs text-zinc-400 flex items-center gap-2">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.createdDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-purple-300"><User className="w-3 h-3" /> {task.assignedTo}</span>
                           </p>
                        </div>
                     </div>
                     <span className={`px-4 py-2 rounded-xl text-xs font-bold ${task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                        {task.status}
                     </span>
                  </motion.div>
                )) : (
                  <div className="text-center py-20 text-zinc-500 flex flex-col items-center">
                     <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                     <p>No tasks found.</p>
                     {currentUser?.role === 'pm' && <p className="text-xs mt-1">Assign a job to see it here.</p>}
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Right Panel: Supervisor Info */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-3xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-2">Logged In As</h2>
              <div className="flex items-center gap-3 mt-4">
                 <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                    {currentUser?.name?.charAt(0) || 'U'}
                 </div>
                 <div>
                    <div className="text-white font-bold">{currentUser?.name || 'Guest'}</div>
                    <div className="text-xs text-zinc-400 uppercase">{currentUser?.role === 'pm' ? 'Project Manager' : 'Supervisor'}</div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}