'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import { CustomerRequirement } from '@/types/bom';
import { toast } from '@/lib/toast';

interface CustomerRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (requirement: CustomerRequirement) => void;
  generating: boolean;
}

export default function CustomerRequirementModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  generating 
}: CustomerRequirementModalProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    projectName: '',
    productType: '',
    quantity: 1,
    deadline: '',
    specifications: {
      material: '',
      finish: '',
      color: '',
      weight: 0,
      dimensions: {
        length: 0,
        width: 0,
        height: 0,
        unit: 'mm',
      },
    },
    rawText: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.projectName || !formData.productType) {
      toast.error('Please fill in all required fields');
      return;
    }

    const requirement: CustomerRequirement = {
      id: `REQ-${Date.now()}`,
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
      createdAt: new Date(),
      createdBy: 'current-user',
      status: 'processing',
    };

    onSubmit(requirement);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          ...(grandchild ? {
            [child]: {
              ...(prev as any)[parent][child],
              [grandchild]: value,
            }
          } : {
            [child]: value,
          }),
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Generate BOM from Requirements
                </h2>
                <p className="text-zinc-400 text-sm">
                  AI will automatically create a Bill of Materials
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              disabled={generating}
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Customer ID
                </label>
                <input
                  type="text"
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="CUST-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
              </div>
            </div>

            {/* Project Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Composite Panel Manufacturing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Product Type *
                </label>
                <input
                  type="text"
                  name="productType"
                  value={formData.productType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Composite Panel, Mold, Tool, etc."
                />
              </div>
            </div>

            {/* Quantity & Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Specifications */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Specifications
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    name="specifications.material"
                    value={formData.specifications.material}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Composite, Steel, Aluminum"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Finish
                  </label>
                  <input
                    type="text"
                    name="specifications.finish"
                    value={formData.specifications.finish}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Matte, Glossy, Textured"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    name="specifications.color"
                    value={formData.specifications.color}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="White, Black, Custom"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Length
                  </label>
                  <input
                    type="number"
                    name="specifications.dimensions.length"
                    value={formData.specifications.dimensions.length}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Width
                  </label>
                  <input
                    type="number"
                    name="specifications.dimensions.width"
                    value={formData.specifications.dimensions.width}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Height
                  </label>
                  <input
                    type="number"
                    name="specifications.dimensions.height"
                    value={formData.specifications.dimensions.height}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Unit
                  </label>
                  <select
                    name="specifications.dimensions.unit"
                    value={formData.specifications.dimensions.unit}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="inch">inch</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Requirements (Raw Text) */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Additional Requirements
              </label>
              <textarea
                name="rawText"
                value={formData.rawText}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Describe any additional requirements, special processes, or technical details..."
              />
              <p className="text-zinc-500 text-sm mt-1">
                AI will analyze this text to suggest appropriate components
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating BOM...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate BOM
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
