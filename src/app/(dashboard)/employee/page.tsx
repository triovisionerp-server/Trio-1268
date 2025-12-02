'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Shield, Mail, Key, 
  CheckCircle, XCircle, Trash2, Ban, Lock 
} from 'lucide-react';

const COMPANY_DOMAIN = '@triovisioninternational.com';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [username, setUsername] = useState('');
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    role: 'supervisor',
    password: 'Trio@2025',
    status: 'Active'
  });

  useEffect(() => {
    const savedUsers = localStorage.getItem('erp_users');
    if (savedUsers) {
      try {
        setEmployees(JSON.parse(savedUsers));
      } catch {
        setEmployees([]);
      }
    } else {
      // Seed Data
      const initial = [
        { id: 1, name: 'Admin User', email: `admin${COMPANY_DOMAIN}`, role: 'md', status: 'Active', joined: new Date().toISOString().split('T')[0] },
        { id: 2, name: 'Rajesh Kumar', email: `rajesh${COMPANY_DOMAIN}`, role: 'supervisor', status: 'Active', joined: new Date().toISOString().split('T')[0] },
      ];
      localStorage.setItem('erp_users', JSON.stringify(initial));
      setEmployees(initial);
    }
  }, []);

  // Keep email in sync with username
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
    setUsername(val);
    setNewEmp(prev => ({ ...prev, email: val ? `${val}${COMPANY_DOMAIN}` : '' }));
  };

  const handleCreateUser = () => {
    if (!newEmp.name || !username) return alert("Please fill all fields");

    const emailExists = employees.some(emp => emp.email.toLowerCase() === newEmp.email.toLowerCase());
    if (emailExists) return alert('A user with this Corporate ID already exists.');

    const newUser = { 
      id: Date.now(), 
      ...newEmp, 
      joined: new Date().toISOString().split('T')[0] 
    };

    const updatedList = [newUser, ...employees];
    setEmployees(updatedList);
    localStorage.setItem('erp_users', JSON.stringify(updatedList));
    
    setShowModal(false);
    setUsername('');
    setNewEmp({
      name: '',
      email: '',
      role: 'supervisor',
      password: 'Trio@2025',
      status: 'Active'
    });
    alert(`User Created: ${newUser.email}`);
  };

  const handleDelete = (id: number) => {
      if(confirm("Remove this user access?")) {
          const updated = employees.filter(e => e.id !== id);
          setEmployees(updated);
          localStorage.setItem('erp_users', JSON.stringify(updated));
      }
  };

  const toggleStatus = (id: number) => {
    const updated = employees.map(e => e.id === id ? { ...e, status: e.status === 'Active' ? 'Inactive' : 'Active' } : e);
    setEmployees(updated);
    localStorage.setItem('erp_users', JSON.stringify(updated));
  };

  const filtered = employees.filter(e => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 font-sans text-white pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-4xl font-light tracking-tight">Employee Directory</h1>
           <p className="text-zinc-400 mt-1">Access Control & Onboarding</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
           <UserPlus className="w-5 h-5" /> Onboard Employee
        </button>
      </div>

      {/* Glass Data Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[600px] shadow-2xl">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" /> Staff List
            </h2>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                    placeholder="Search staff..." 
                    className="pl-9 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-blue-500 w-64 transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>

         <div className="overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
               <thead className="bg-black/20 text-zinc-400 uppercase font-bold text-xs">
                  <tr>
                     <th className="p-5">Name</th>
                     <th className="p-5">Corporate ID</th>
                     <th className="p-5">Role</th>
                     <th className="p-5 text-center">Status</th>
                     <th className="p-5 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 bg-zinc-900/20">
                  {filtered.map((emp) => (
                     <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-5 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-xs border border-white/10">{emp.name?.charAt(0) || '?'}</div>
                            {emp.name}
                        </td>
                        <td className="p-5 text-zinc-400 font-mono text-xs">{emp.email}</td>
                        <td className="p-5">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                                emp.role === 'md' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                                emp.role === 'pm' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                                'bg-zinc-700/50 text-zinc-300 border-zinc-600'
                            }`}>
                                {emp.role}
                            </span>
                        </td>
                        <td className="p-5 text-center">
                            <button onClick={() => toggleStatus(emp.id)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${emp.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {emp.status}
                            </button>
                        </td>
                        <td className="p-5 text-right">
                            <button onClick={() => handleDelete(emp.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* ADD USER MODAL (Login Style) */}
      <AnimatePresence>
        {showModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-2xl font-bold text-white">New Employee</h2>
                        <button onClick={() => setShowModal(false)}><XCircle className="w-6 h-6 text-zinc-500 hover:text-white"/></button>
                    </div>
                    
                    <div className="space-y-5 relative z-10">
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Full Name</label>
                            <input className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none mt-1 focus:border-blue-500 transition-colors" placeholder="e.g. Sarah Jenkins" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                        </div>
                        
                        {/* AUTO DOMAIN INPUT */}
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Corporate ID</label>
                            <div className="flex items-center bg-zinc-800 border border-white/10 rounded-xl mt-1 overflow-hidden focus-within:border-blue-500 transition-colors">
                                <input 
                                    className="w-full bg-transparent p-3 text-white outline-none font-mono" 
                                    placeholder="username" 
                                    value={username}
                                    onChange={handleUsernameChange}
                                />
                            </div>
                            <p className="text-[10px] text-blue-400 mt-2 font-mono">{username}{COMPANY_DOMAIN}</p>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Role</label>
                            <select className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none mt-1 cursor-pointer" value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})}>
                                <option value="supervisor">Supervisor</option>
                                <option value="pm">Project Manager</option>
                                <option value="store">Store Keeper</option>
                                <option value="md">Executive (MD)</option>
                            </select>
                        </div>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Key className="w-4 h-4" /></div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase font-bold">One-Time Password</p>
                                <p className="text-white font-mono font-bold tracking-wider">Trio@2025</p>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleCreateUser} className="w-full mt-8 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 shadow-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-[1.02]">
                        <CheckCircle className="w-5 h-5" /> Create Account
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}