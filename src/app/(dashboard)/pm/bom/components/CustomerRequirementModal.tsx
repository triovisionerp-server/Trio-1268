'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, User, Mail, Package, Calendar } from 'lucide-react';
import { CustomerRequirement } from '@/types/bom';

interface CustomerRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (requirement: CustomerRequirement) => void;
  generating?: boolean;
}

export default function CustomerRequirementModal({
  isOpen,
  onClose,
  onSubmit,
  generating = false
}: CustomerRequirementModalProps) {
  const [formData, setFormData] = useState<Partial<CustomerRequirement>>({
    customerId: '',
    customerName: '',
    projectName: '',
    productType: '',
    specifications: {
      material: '',
      finish: '',
      color: '',
      customSpecs: {}
    },
    quantity: 1,
    deadline: undefined,
    rawText: '',
    createdBy: '',
    status: 'pending'
  });
  
  const [specificationsText, setSpecificationsText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as CustomerRequirement);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Customer Requirement</h2>
              </div>
              <button
                onClick={onClose}
                disabled={generating}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Customer ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="CUST-001"
                  />
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Package className="w-4 h-4 inline mr-2" />
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Product Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mold, Tool, Component"
                  />
                </div>
              </div>

              {/* Specifications */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Specifications *
                </label>
                <textarea
                  required
                  value={specificationsText}
                  onChange={(e) => {
                    setSpecificationsText(e.target.value);
                    setFormData({ 
                      ...formData, 
                      rawText: e.target.value,
                      specifications: { 
                        ...formData.specifications,
                        customSpecs: { description: e.target.value }
                      } 
                    });
                  }}
                  rows={4}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter detailed specifications, materials, dimensions, etc."
                />
              </div>

              {/* Quantity & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value ? new Date(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Material Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Material Type
                </label>
                <input
                  type="text"
                  value={formData.specifications?.material || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, material: e.target.value } 
                  })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Steel, Aluminum, Plastic"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={generating}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating BOM...
                    </>
                  ) : (
                    'Generate BOM'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
