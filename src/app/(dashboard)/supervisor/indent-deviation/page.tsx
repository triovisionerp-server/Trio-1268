'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Send, FileText, AlertTriangle, Package, Clock,
  CheckCircle, XCircle, Eye, Edit, Filter, Search, RefreshCw
} from 'lucide-react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { IndentForm, IndentStatus } from '@/types/bom';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { toast } from '@/lib/toast';

export default function IndentDeviationPage() {
  const [forms, setForms] = useState<IndentForm[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formType, setFormType] = useState<'indent' | 'deviation'>('indent');
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<IndentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuthStore();

  // Load forms
  const loadForms = async () => {
    try {
      setLoading(true);
      const formsRef = collection(db, 'indent_forms');
      const q = query(formsRef);
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IndentForm[];
      
      setForms(data);
    } catch (error) {
      console.error('Error loading forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  // Create new indent
  const handleCreateIndent = () => {
    setFormType('indent');
    setShowCreateModal(true);
  };

  // Create new deviation
  const handleCreateDeviation = () => {
    setFormType('deviation');
    setShowCreateModal(true);
  };

  const stats = {
    pending: forms.filter(f => f.status === IndentStatus.PENDING).length,
    approved: forms.filter(f => f.status === IndentStatus.APPROVED).length,
    rejected: forms.filter(f => f.status === IndentStatus.REJECTED).length,
  };

  const filteredForms = forms.filter(form => {
    const matchesStatus = filterStatus === 'all' || form.status === filterStatus;
    const matchesSearch = form.indentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
form.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: IndentStatus) => {
    const colors = {
      [IndentStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400',
      [IndentStatus.APPROVED]: 'bg-green-500/20 text-green-400',
      [IndentStatus.REJECTED]: 'bg-red-500/20 text-red-400',
      [IndentStatus.FULFILLED]: 'bg-blue-500/20 text-blue-400',
    };
    return colors[status];
  };

  const getStatusIcon = (status: IndentStatus) => {
    const icons = {
      [IndentStatus.PENDING]: Clock,
      [IndentStatus.APPROVED]: CheckCircle,
      [IndentStatus.REJECTED]: XCircle,
      [IndentStatus.FULFILLED]: Package,
    };
    const Icon = icons[status];
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Indent & Deviation Management
        </h1>
        <p className="text-zinc-400">
          Request additional materials or report deviations from approved BOM
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-yellow-400 text-sm font-medium">Pending</p>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-400 text-sm font-medium">Approved</p>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.approved}</p>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-400 text-sm font-medium">Rejected</p>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.rejected}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <button
          onClick={handleCreateIndent}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Indent Form
        </button>

        <button
          onClick={handleCreateDeviation}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg transition-all flex items-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          New Deviation Form
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as IndentStatus | 'all')}
          className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value={IndentStatus.PENDING}>Pending</option>
          <option value={IndentStatus.APPROVED}>Approved</option>
          <option value={IndentStatus.REJECTED}>Rejected</option>
          <option value={IndentStatus.FULFILLED}>Fulfilled</option>
        </select>

        <button
          onClick={loadForms}
          className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-2">No forms found</p>
          <p className="text-zinc-500 text-sm">
            Create a new indent or deviation form to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredForms.map((form, index) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-white">
                      {form.indentNumber}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${getStatusColor(form.status)}`}>
                      {getStatusIcon(form.status)}
                      {form.status.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      form.type === 'indent' 
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {form.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-zinc-500 text-sm">Department</p>
                      <p className="text-white font-medium">{form.department}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Requested By</p>
                      <p className="text-white font-medium">{form.requestedByName}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Items</p>
                      <p className="text-white font-medium">{form.items.length}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Priority</p>
                      <p className={`font-medium ${
                        form.priority === 'critical' ? 'text-red-400' :
                        form.priority === 'high' ? 'text-orange-400' :
                        form.priority === 'medium' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {form.priority.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm">{form.justification}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                  {form.status === IndentStatus.PENDING && (
                    <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <IndentFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          formType={formType}
          onSuccess={loadForms}
        />
      )}
    </div>
  );
}

// Indent Form Modal Component
interface IndentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'indent' | 'deviation';
  onSuccess: () => void;
}

function IndentFormModal({ isOpen, onClose, formType, onSuccess }: IndentFormModalProps) {
  const [formData, setFormData] = useState({
    projectName: '',
    bomId: '',
    department: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    justification: '',
    items: [
      {
        itemCode: '',
        itemName: '',
        specification: '',
        quantity: 1,
        unit: 'Kg',
        urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        reason: '',
      }
    ],
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemCode: '',
          itemName: '',
          specification: '',
          quantity: 1,
          unit: 'Kg',
          urgency: 'medium',
          reason: '',
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.department || !formData.justification || formData.items.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const indentNumber = `${formType === 'indent' ? 'IND' : 'DEV'}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

      const newForm: Partial<IndentForm> = {
        indentNumber,
        type: formType,
        projectName: formData.projectName,
        bomId: formData.bomId,
        requestedBy: user?.id || '',
        requestedByName: user?.name || '',
        department: formData.department,
        requestDate: new Date(),
        items: formData.items,
        approvals: {},
        status: IndentStatus.PENDING,
        priority: formData.priority,
        justification: formData.justification,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'indent_forms'), newForm);

      toast.success(`${formType === 'indent' ? 'Indent' : 'Deviation'} form submitted successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-screen p-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  formType === 'indent' 
                    ? 'bg-blue-600' 
                    : 'bg-orange-600'
                }`}>
                  {formType === 'indent' ? (
                    <FileText className="w-6 h-6 text-white" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {formType === 'indent' ? 'New Indent Form' : 'New Deviation Form'}
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    {formType === 'indent' 
                      ? 'Request additional materials'
                      : 'Report deviation from approved BOM'
                    }
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    placeholder="Project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="">Select Department</option>
                    <option value="Machining">Machining</option>
                    <option value="Assembly">Assembly</option>
                    <option value="Welding">Welding</option>
                    <option value="Quality">Quality</option>
                    <option value="Tooling">Tooling</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Justification *
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  placeholder="Explain why these materials are needed or why deviation is necessary..."
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="grid grid-cols-12 gap-3 mb-3">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={item.itemCode}
                            onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            placeholder="Item Code"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            placeholder="Item Name"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            min="1"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                          >
                            <option>Kg</option>
                            <option>Liters</option>
                            <option>Pieces</option>
                            <option>Meters</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-full p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={item.reason}
                        onChange={(e) => updateItem(index, 'reason', e.target.value)}
                        className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                        placeholder="Reason for this item"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
