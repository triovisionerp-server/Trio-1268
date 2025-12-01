'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, Clock, CheckCircle, Truck, 
  FileText, ArrowRight, Loader 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState({ name: '' });
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    // 1. Get Session
    const session = localStorage.getItem('currentUser');
    
    // If no session exists, go to register
    if (!session) {
      router.push('/register');
      return;
    }

    try {
      // 2. Safe Parse
      const userData = JSON.parse(session);

      // Check if it's the old format (string) or new format (object)
      if (typeof userData === 'string') {
         throw new Error("Legacy session detected");
      }

      setUser(userData);

      // 3. Load "My Projects" logic
      const allProjects = JSON.parse(localStorage.getItem('my_projects') || "[]");
      const myProjects = allProjects.filter((p: any) => p.data.customerName === userData.name);
      setProjects(myProjects);

    } catch (error) {
      // 4. AUTO-FIX: If error occurs (like "pm" string), clear data and redirect
      console.log("Resetting invalid session data...");
      localStorage.removeItem('currentUser');
      router.push('/register');
    }
  }, [router]);
  // Visual Steps for Progress Bar
  const steps = [
    { label: "Submitted", icon: FileText },
    { label: "Molding", icon: Package },
    { label: "Finishing", icon: Loader },
    { label: "Ready", icon: CheckCircle },
    { label: "Shipped", icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
               Hello, <span className="text-purple-400">{user.name}</span>
            </h1>
            <p className="text-zinc-400 mt-2">Track your active projects and specifications.</p>
          </div>
          <button 
            onClick={() => router.push('/projectspec')}
            className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            <FileText className="w-5 h-5" /> New Request
          </button>
        </header>

        {/* Project List */}
        <div className="space-y-8">
          {projects.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
              <Package className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500">You haven't submitted any projects yet.</p>
              <button onClick={() => router.push('/projectspec')} className="text-purple-400 font-bold mt-2 hover:underline">Start a new project</button>
            </div>
          ) : (
            projects.map((project, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl relative overflow-hidden group"
              >
                {/* Glow Effect */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500" />

                <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{project.title}</h3>
                    <p className="text-zinc-400 text-sm mt-1">Doc Ref: {project.data.docNo} • Submitted: {project.time}</p>
                  </div>
                  <div className="bg-purple-900/30 border border-purple-500/30 px-4 py-2 rounded-full text-purple-300 text-sm font-bold flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> In Production
                  </div>
                </div>

                {/* Progress Tracker */}
                <div className="relative">
                  {/* Line */}
                  <div className="absolute top-5 left-0 w-full h-1 bg-zinc-800 rounded-full" />
                  <div className="absolute top-5 left-0 w-1/3 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full" />

                  <div className="relative flex justify-between">
                    {steps.map((step, i) => {
                      const isActive = i <= 1; // Simulating "Molding" stage is active
                      return (
                        <div key={i} className="flex flex-col items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${isActive ? "bg-zinc-900 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "bg-zinc-800 border-zinc-700 text-zinc-600"}`}>
                            <step.icon className="w-4 h-4" />
                          </div>
                          <span className={`text-xs font-bold uppercase ${isActive ? "text-white" : "text-zinc-600"}`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                   <button className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
                      View Technical Details <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}