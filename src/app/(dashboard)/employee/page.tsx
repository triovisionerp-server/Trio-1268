'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Shield, Mail, Key, 
  CheckCircle, XCircle, Trash2, Ban, Lock, Sparkles
} from 'lucide-react';

const COMPANY_DOMAIN = '@triovisioninternational.com';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const tableRowVariant = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-end"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
             <h1 className="text-4xl font-light tracking-tight">Employee Directory</h1>
             <p className="text-zinc-400 mt-1">Access Control & Onboarding</p>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)} 
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
        >
           <UserPlus className="w-5 h-5" /> Onboard Employee
        </motion.button>
      </motion.div>

      {/* Glass Data Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[600px] shadow-2xl"
      >
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
               <motion.tbody 
                 variants={staggerContainer}
                 initial="hidden"
                 animate="visible"
                 className="divide-y divide-white/5 bg-zinc-900/20"
               >
                  {filtered.map((emp, index) => (
                     <motion.tr 
                        key={emp.id} 
                        variants={tableRowVariant}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        className="transition-colors group"
                     >
                        <td className="p-5 font-bold text-white flex items-center gap-3">
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-xs border border-white/10"
                            >
                              {emp.name?.charAt(0) || '?'}
                            </motion.div>
                            <span className="group-hover:text-blue-300 transition-colors">{emp.name}</span>
                        </td>
                        <td className="p-5 text-zinc-400 font-mono text-xs">{emp.email}</td>
                        <td className="p-5">
                            <motion.span 
                              whileHover={{ scale: 1.05 }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border inline-block ${
                                emp.role === 'md' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                                emp.role === 'pm' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                                'bg-zinc-700/50 text-zinc-300 border-zinc-600'
                            }`}>
                                {emp.role}
                            </motion.span>
                        </td>
                        <td className="p-5 text-center">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleStatus(emp.id)} 
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${emp.status === 'Active' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                            >
                                {emp.status}
                            </motion.button>
                        </td>
                        <td className="p-5 text-right">
                            <motion.button 
                              whileHover={{ scale: 1.2, rotate: 10 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(emp.id)} 
                              className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </motion.button>
                        </td>
                     </motion.tr>
                  ))}
               </motion.tbody>
            </table>
         </div>
      </motion.div>

      {/* ADD USER MODAL (Login Style) */}
      <AnimatePresence>
        {showModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 30, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                      className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" 
                    />
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <h2 className="text-2xl font-bold text-white">New Employee</h2>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowModal(false)}
                        >
                          <XCircle className="w-6 h-6 text-zinc-500 hover:text-white transition-colors"/>
                        </motion.button>
                    </div>
                    
                    <motion.div 
                      initial="hidden"
                      animate="visible"
                      variants={staggerContainer}
                      className="space-y-5 relative z-10"
                    >
                        <motion.div variants={fadeInUp}>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Full Name</label>
                            <input className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none mt-1 focus:border-blue-500 transition-all" placeholder="e.g. Sarah Jenkins" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                        </motion.div>
                        
                        {/* AUTO DOMAIN INPUT */}
                        <motion.div variants={fadeInUp}>
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
                        </motion.div>

                        <motion.div variants={fadeInUp}>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Role</label>
                            <select className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none mt-1 cursor-pointer focus:border-blue-500 transition-colors" value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})}>
                                <option value="supervisor">Supervisor</option>
                                <option value="pm">Project Manager</option>
                                <option value="store">Store Keeper</option>
                                <option value="md">Executive (MD)</option>
                            </select>
                        </motion.div>

                        <motion.div 
                          variants={fadeInUp}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-4"
                        >
                            <motion.div 
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"
                            >
                              <Key className="w-4 h-4" />
                            </motion.div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase font-bold">One-Time Password</p>
                                <p className="text-white font-mono font-bold tracking-wider">Trio@2025</p>
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateUser} 
                      className="w-full mt-8 bg-gradient-to-r from-white to-zinc-100 text-black font-bold py-3 rounded-xl hover:from-zinc-100 hover:to-white shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <CheckCircle className="w-5 h-5" /> Create Account
                    </motion.button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}