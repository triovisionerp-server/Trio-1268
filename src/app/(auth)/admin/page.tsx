'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, Users, Database, Activity, Server, 
  Lock, AlertTriangle, FileText, CheckCircle, 
  Search, Trash2, RotateCcw, UserPlus 
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 1. Load Users
    const savedUsers = JSON.parse(localStorage.getItem('erp_users') || "[]");
    setUsers(savedUsers);

    // 2. Calculate Stats
    setStats({
        total: savedUsers.length,
        active: savedUsers.filter((u: any) => u.status === 'Active').length,
        admins: savedUsers.filter((u: any) => u.role === 'admin' || u.role === 'md').length
    });
  }, []);

  const handleDeleteUser = (id: number) => {
      if(confirm("Permanently delete this user?")) {
          const updated = users.filter(u => u.id !== id);
          setUsers(updated);
          localStorage.setItem('erp_users', JSON.stringify(updated));
      }
  };

  return (
    <div className="space-y-8 font-sans text-white pb-20">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex justify-between items-end"
      >
        <div>
           <h1 className="text-4xl font-light tracking-tight">System Administration</h1>
           <p className="text-zinc-400 mt-1">Platform Health & Security</p>
        </div>
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm font-bold flex items-center gap-2 animate-pulse">
           <Shield className="w-4 h-4" /> Root Access
        </div>
      </motion.div>

      {/* 1. System KPIs (Glass Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "text-blue-400", bg: "bg-blue-500/20" },
          { label: "Active Sessions", value: "4", icon: Activity, color: "text-green-400", bg: "bg-green-500/20" },
          { label: "System Health", value: "99.9%", icon: Server, color: "text-purple-400", bg: "bg-purple-500/20" },
          { label: "Security Issues", value: "0", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/20" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:bg-white/10 transition-all"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-20 group-hover:opacity-40 transition-all ${item.bg}`} />
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.bg} border border-white/5`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="text-zinc-400 text-sm font-medium">{item.label}</span>
            </div>
            <div className="text-3xl font-light text-white">{item.value}</div>
          </motion.div>
        ))}
      </div>

      {/* 2. User Management Panel */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl min-h-[500px]">
         <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" /> User Database
            </h2>
            <div className="flex gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input 
                        placeholder="Search users..." 
                        className="pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-blue-500 w-64 transition-all"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => router.push('/employees')} 
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
                >
                    <UserPlus className="w-4 h-4" /> Manage
                </button>
            </div>
         </div>

         <div className="overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
               <thead className="bg-black/40 text-zinc-400 uppercase font-bold text-xs">
                  <tr>
                     <th className="p-5">User</th>
                     <th className="p-5">Role</th>
                     <th className="p-5">Email</th>
                     <th className="p-5 text-center">Status</th>
                     <th className="p-5 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 bg-zinc-900/20">
                  {users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((user) => (
                     <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-5 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-xs border border-white/10">
                                {user.name?.charAt(0)}
                            </div>
                            {user.name}
                        </td>
                        <td className="p-5">
                            <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-white/5 border border-white/10 text-zinc-300">
                                {user.role}
                            </span>
                        </td>
                        <td className="p-5 text-zinc-400 font-mono text-xs">{user.email}</td>
                        <td className="p-5 text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                Active
                            </div>
                        </td>
                        <td className="p-5 text-right flex justify-end gap-2">
                            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Reset Password">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" 
                                title="Delete User"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {users.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No users found in database.</p>
                </div>
            )}
         </div>
      </div>

      {/* 3. Database Health Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" /> Database Status
              </h3>
              <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-zinc-300 text-sm">Primary Cluster</span>
                      </div>
                      <span className="text-green-400 text-xs font-bold">OPERATIONAL</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-zinc-300 text-sm">Backup System</span>
                      </div>
                      <span className="text-blue-400 text-xs font-bold">SYNCED (2m ago)</span>
                  </div>
              </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-yellow-400" /> Security Audit
              </h3>
              <div className="space-y-4">
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Last Login</p>
                      <div className="flex justify-between">
                          <span className="text-white text-sm">Admin (You)</span>
                          <span className="text-zinc-400 text-xs font-mono">Just now</span>
                      </div>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                      <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Failed Attempts</p>
                      <div className="flex justify-between">
                          <span className="text-white text-sm">0 Failed Logins</span>
                          <span className="text-green-400 text-xs font-bold">SECURE</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
}