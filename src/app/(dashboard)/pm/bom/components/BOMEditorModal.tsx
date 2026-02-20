'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { BOM, BOMComponent, ComponentCategory } from '@/types/bom';
import { updateBOM } from '@/lib/services/bomService';
import { toast } from '@/lib/toast';

interface BOMEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BOM;
}

export default function BOMEditorModal({
  isOpen,
  onClose,
  bom
}: BOMEditorModalProps) {
  const [editedBOM, setEditedBOM] = useState<BOM>(bom);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedBOM(bom);
  }, [bom]);

  const handleAddComponent = () => {
    const newComponent: BOMComponent = {
      id: `comp_${Date.now()}`,
      itemCode: '',
      itemName: '',
      description: '',
      category: ComponentCategory.RAW_MATERIAL,
      specification: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0,
      requiredStock: 1,
      stockStatus: 'unavailable',
      isOptional: false
    };

    setEditedBOM({
      ...editedBOM,
      components: [...(editedBOM.components || []), newComponent]
    });
  };

  const handleUpdateComponent = (index: number, field: string, value: string | number) => {
    const updatedComponents = [...(editedBOM.components || [])];
    const component = updatedComponents[index];
    
    updatedComponents[index] = {
      ...component,
      [field]: value,
      totalPrice: field === 'quantity' || field === 'unitPrice' 
        ? (field === 'quantity' ? value as number : component.quantity) * 
          (field === 'unitPrice' ? value as number : component.unitPrice)
        : component.totalPrice
    };

    setEditedBOM({
      ...editedBOM,
      components: updatedComponents
    });
  };

  const handleDeleteComponent = (index: number) => {
    const updatedComponents = editedBOM.components?.filter((_, i) => i !== index);
    setEditedBOM({
      ...editedBOM,
      components: updatedComponents
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Recalculate pricing
      const totalMaterialCost = editedBOM.components?.reduce((sum, c) => sum + c.totalPrice, 0) || 0;
      const laborCost = totalMaterialCost * 0.3; // 30% of material cost
      const overheadCost = totalMaterialCost * 0.2; // 20% of material cost
      const toolingCost = totalMaterialCost * 0.1; // 10% of material cost
      const totalCost = totalMaterialCost + laborCost + overheadCost + toolingCost;
      const profitMargin = 15; // 15% profit margin
      const profitAmount = totalCost * (profitMargin / 100);
      const sellingPrice = totalCost + profitAmount;
      const gst = sellingPrice * 0.18; // 18% GST
      const finalPrice = sellingPrice + gst;

      const updatedBOM: Partial<BOM> = {
        ...editedBOM,
        pricing: {
          totalMaterialCost,
          laborCost,
          overheadCost,
          toolingCost,
          totalCost,
          sellingPrice,
          profitAmount,
          profitMargin,
          gst,
          finalPrice
        },
        updatedAt: new Date()
      };

      await updateBOM(editedBOM.id!, updatedBOM);
      toast.success('BOM updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving BOM:', error);
      toast.error('Failed to update BOM');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-white">{editedBOM.bomNumber}</h2>
                <p className="text-zinc-400 text-sm">{editedBOM.projectName}</p>
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Components Table */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Components</h3>
                  <button
                    onClick={handleAddComponent}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Component
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Component</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Category</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Specification</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Qty</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Unit</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Unit Cost</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Total</th>
                        <th className="text-left text-zinc-400 text-sm font-medium p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedBOM.components?.map((component, index) => (
                        <tr key={component.id} className="border-b border-zinc-800/50">
                          <td className="p-3">
                            <input
                              type="text"
                              value={component.itemName}
                              onChange={(e) => handleUpdateComponent(index, 'itemName', e.target.value)}
                              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                              placeholder="Component name"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={component.category}
                              onChange={(e) => handleUpdateComponent(index, 'category', e.target.value)}
                              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                            >
                              <option value="RAW_MATERIAL">Raw Material</option>
                              <option value="CONSUMABLE">Consumable</option>
                              <option value="HARDWARE">Hardware</option>
                              <option value="OUTSOURCED">Outsourced</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={component.specification}
                              onChange={(e) => handleUpdateComponent(index, 'specification', e.target.value)}
                              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                              placeholder="Specification"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              value={component.quantity}
                              onChange={(e) => handleUpdateComponent(index, 'quantity', parseFloat(e.target.value))}
                              className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={component.unit}
                              onChange={(e) => handleUpdateComponent(index, 'unit', e.target.value)}
                              className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={component.unitPrice}
                              onChange={(e) => handleUpdateComponent(index, 'unitPrice', parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                            />
                          </td>
                          <td className="p-3 text-white">
                            ₹{component.totalPrice.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteComponent(index)}
                              className="p-1 hover:bg-red-600/20 rounded text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-zinc-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Cost Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-zinc-400 text-sm">Material Cost</p>
                    <p className="text-white text-xl font-semibold">
                      ₹{(editedBOM.components?.reduce((sum, c) => sum + c.totalPrice, 0) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Components</p>
                    <p className="text-white text-xl font-semibold">
                      {editedBOM.components?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 p-6 flex gap-4">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Save className="w-5 h-5" />
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
