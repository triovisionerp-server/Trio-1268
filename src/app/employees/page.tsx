'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  employeeId: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  joinDate: string;
}

export default function EmployeesPage() {
  const [user, setUser] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const router = useRouter();

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      loadEmployees();
    }
  }, [router]);

  const loadEmployees = () => {
    const saved = localStorage.getItem('employees');
    if (saved) {
      setEmployees(JSON.parse(saved));
    } else {
      // Demo data
      const demoEmployees: Employee[] = [
        {
          id: 1,
          name: 'Rajesh Kumar',
          employeeId: 'EMP001',
          role: 'Team Lead Supervisor',
          department: 'Production',
          phone: '+91 9876543210',
          email: 'rajesh@triovision.com',
          joinDate: '2023-01-15'
        },
        {
          id: 2,
          name: 'Priya Sharma',
          employeeId: 'EMP002',
          role: 'Supervisor',
          department: 'Production',
          phone: '+91 9876543211',
          email: 'priya@triovision.com',
          joinDate: '2023-03-20'
        },
        {
          id: 3,
          name: 'Amit Patel',
          employeeId: 'EMP003',
          role: 'Technician',
          department: 'Production',
          phone: '+91 9876543212',
          email: 'amit@triovision.com',
          joinDate: '2023-06-10'
        }
      ];
      setEmployees(demoEmployees);
      localStorage.setItem('employees', JSON.stringify(demoEmployees));
    }
  };

  const handleAddEmployee = () => {
    if (!formData.name || !formData.employeeId || !formData.role) {
      alert('Please fill required fields');
      return;
    }

    const newEmployee: Employee = {
      id: Date.now(),
      name: formData.name || '',
      employeeId: formData.employeeId || '',
      role: formData.role || '',
      department: formData.department || 'Production',
      phone: formData.phone || '',
      email: formData.email || '',
      joinDate: formData.joinDate || new Date().toISOString().split('T')[0]
    };

    const updated = [...employees, newEmployee];
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
    setShowAddModal(false);
    setFormData({});
  };

  const handleDeleteEmployee = (id: number) => {
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employees.length,
    teamLeads: employees.filter(e => e.role.includes('Team Lead')).length,
    supervisors: employees.filter(e => e.role === 'Supervisor').length,
    technicians: employees.filter(e => e.role === 'Technician').length
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Employee Management</h1>
                  <p className="text-zinc-400 text-sm mt-1">Manage your workforce</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Logged in as</p>
                  <p className="text-sm font-semibold text-blue-300">{user}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all duration-300 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-4xl font-bold text-white">{stats.total}</h3>
              <p className="text-sm text-zinc-400 mt-2">Total Employees</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-4xl font-bold text-white">{stats.teamLeads}</h3>
              <p className="text-sm text-zinc-400 mt-2">Team Leads</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-4xl font-bold text-white">{stats.supervisors}</h3>
              <p className="text-sm text-zinc-400 mt-2">Supervisors</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-4xl font-bold text-white">{stats.technicians}</h3>
              <p className="text-sm text-zinc-400 mt-2">Technicians</p>
            </motion.div>
          </div>

          {/* Employee List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">All Employees</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-lg focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Employee ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Join Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className="py-3 px-4 text-sm text-blue-300 font-medium">{emp.employeeId}</td>
                      <td className="py-3 px-4 text-sm text-white font-semibold">{emp.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          emp.role.includes('Team Lead') ? 'bg-purple-500/20 text-purple-300' :
                          emp.role === 'Supervisor' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-300">{emp.department}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">{emp.phone}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">{emp.email}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">{emp.joinDate}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Add Employee</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Employee ID *</label>
                  <input
                    type="text"
                    value={formData.employeeId || ''}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="EMP001"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Role *</label>
                  <select
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl focus:border-blue-500/50 outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Select Role</option>
                    <option value="Team Lead Supervisor">Team Lead Supervisor</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Technician">Technician</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@triovision.com"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <button
                  onClick={handleAddEmployee}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all mt-6"
                >
                  Add Employee
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
