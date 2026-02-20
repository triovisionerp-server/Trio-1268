'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, Calculator, TrendingUp, DollarSign, Edit } from 'lucide-react';
import { BOM, BOMComponent, ComponentCategory } from '@/types/bom';
import { updateBOM, createBOMRevision } from '@/lib/services/bomService';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/lib/stores/useAuthStore';

interface BOMEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BOM;
}

export default function BOMEditorModal({ isOpen, onClose, bom }: BOMEditorModalProps) {
  const [components, setComponents] = useState<BOMComponent[]>(bom.components || []);
  const [pricing, setPricing] = useState(bom.pricing);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setComponents(bom.components || []);
      setPricing(bom.pricing);
    }
  }, [isOpen, bom]);

  const addComponent = () => {
    const newComponent: BOMComponent = {
      id: `COMP-${Date.now()}`,
      itemCode: '',
      itemName: '',
      description: '',
      category: ComponentCategory.RAW_MATERIAL,
      specification: '',
      quantity: 1,
      unit: 'Kg',
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0,
      requiredStock: 0,
      stockStatus: 'unavailable',
      isOptional: false,
    };
    setComponents([...components, newComponent]);
  };

  const updateComponent = (index: number, field: keyof BOMComponent, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    }
    
    setComponents(updated);
    recalculatePricing(updated);
  };

  const deleteComponent = (index: number) => {
    const updated = components.filter((_, i) => i !== index);
    setComponents(updated);
    recalculatePricing(updated);
  };

  const recalculatePricing = (comps: BOMComponent[]) => {
    const totalMaterialCost = comps.reduce((sum, c) => sum + c.totalPrice, 0);
    const laborCost = totalMaterialCost * (pricing.laborCost / pricing.totalMaterialCost || 0.3);
    const overheadCost = totalMaterialCost * (pricing.overheadCost / pricing.totalMaterialCost || 0.15);
    const toolingCost = totalMaterialCost * (pricing.toolingCost / pricing.totalMaterialCost || 0.1);
    const totalCost = totalMaterialCost + laborCost + overheadCost + toolingCost;
    const profitAmount = totalCost * (pricing.profitMargin / 100);
    const sellingPrice = totalCost + profitAmount;
    const gst = sellingPrice * 0.18;
    const finalPrice = sellingPrice + gst;

    setPricing({
      ...pricing,
      totalMaterialCost,
      laborCost,
      overheadCost,
      toolingCost,
      totalCost,
      profitAmount,
      sellingPrice,
      gst,
      finalPrice,
    });
  };

  const updateProfitMargin = (margin: number) => {
    const profitAmount = pricing.totalCost * (margin / 100);
    const sellingPrice = pricing.totalCost + profitAmount;
    const gst = sellingPrice * 0.18;
    const finalPrice = sellingPrice + gst;

    setPricing({
      ...pricing,
      profitMargin: margin,
      profitAmount,
      sellingPrice,
      gst,
      finalPrice,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Create revision entry
      await createBOMRevision(
        bom.id!,
        `Updated ${components.length} components, Total: ₹${pricing.finalPrice.toLocaleString()}`,
        'PM Review Edit',
        user?.id || '',
        user?.name || ''
      );

      // Update BOM
      await updateBOM(bom.id!, {
        components,
        pricing,
        updatedAt: new Date(),
      });

      toast.success('BOM updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating BOM:', error);
      toast.error('Failed to update BOM');
    } finally {
      setSaving(false);
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-7xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Edit BOM - {bom.bomNumber}
                </h2>
                <p className="text-zinc-400 text-sm">{bom.projectName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Pricing Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Material Cost</p>
                  <p className="text-white font-semibold text-lg">
                    ₹{pricing.totalMaterialCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Total Cost</p>
                  <p className="text-white font-semibold text-lg">
                    ₹{pricing.totalCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Profit Margin (%)</label>
                  <input
                    type="number"
                    value={pricing.profitMargin}
                    onChange={(e) => updateProfitMargin(Number(e.target.value))}
                    className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Final Price</p>
                  <p className="text-green-400 font-bold text-lg">
                    ₹{pricing.finalPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Components List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Components ({components.length})
                  </h3>
                  <button
                    onClick={addComponent}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Component
                  </button>
                </div>

                <div className="space-y-3">
                  {components.map((component, index) => (
                    <div
                      key={component.id}
                      className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-zinc-400 mb-1 block">Item Code</label>
                          <input
                            type="text"
                            value={component.itemCode}
                            onChange={(e) => updateComponent(index, 'itemCode', e.target.value)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            placeholder="ITEM-001"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-xs text-zinc-400 mb-1 block">Item Name</label>
                          <input
                            type="text"
                            value={component.itemName}
                            onChange={(e) => updateComponent(index, 'itemName', e.target.value)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            placeholder="Component name"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs text-zinc-400 mb-1 block">Category</label>
                          <select
                            value={component.category}
                            onChange={(e) => updateComponent(index, 'category', e.target.value as ComponentCategory)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                          >
                            {Object.values(ComponentCategory).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-1">
                          <label className="text-xs text-zinc-400 mb-1 block">Qty</label>
                          <input
                            type="number"
                            value={component.quantity}
                            onChange={(e) => updateComponent(index, 'quantity', Number(e.target.value))}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            min="0"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="text-xs text-zinc-400 mb-1 block">Unit</label>
                          <select
                            value={component.unit}
                            onChange={(e) => updateComponent(index, 'unit', e.target.value)}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                          >
                            <option>Kg</option>
                            <option>Liters</option>
                            <option>Pieces</option>
                            <option>Meters</option>
                            <option>Boxes</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs text-zinc-400 mb-1 block">Unit Price</label>
                          <input
                            type="number"
                            value={component.unitPrice}
                            onChange={(e) => updateComponent(index, 'unitPrice', Number(e.target.value))}
                            className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm"
                            min="0"
                          />
                        </div>

                        <div className="col-span-1 flex items-end">
                          <button
                            onClick={() => deleteComponent(index)}
                            className="w-full p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <input
                          type="text"
                          value={component.specification}
                          onChange={(e) => updateComponent(index, 'specification', e.target.value)}
                          className="flex-1 p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-400 text-xs"
                          placeholder="Specification / Description"
                        />
                        <span className="ml-4 text-white font-medium">
                          Total: ₹{component.totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-4 p-6 border-t border-zinc-800">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
