'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Save, CheckCircle2, 
  Package, ShoppingCart, Search, FileText, Calendar, 
  Loader2, AlertTriangle, Building2
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { toast } from '@/lib/toast';

interface NeatBOMCreatorProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface Material {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  unit: string;
  category: string;
}

interface BOMItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  currentStock: number;
  needToPurchase: number;
  category: string;
  notes?: string;
}

export default function NeatBOMCreator({ projectId, projectName, onClose }: NeatBOMCreatorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [bomName, setBomName] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [department, setDepartment] = useState('Production');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');

  // Load materials from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'materials')),
      (snapshot) => {
        const mats: Material[] = [];
        snapshot.forEach((doc) => {
          mats.push({ id: doc.id, ...doc.data() } as Material);
        });
        setMaterials(mats.sort((a, b) => a.name.localeCompare(b.name)));
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter materials
  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add material to BOM
  const addMaterial = (material: Material) => {
    if (bomItems.find(item => item.materialId === material.id)) {
      toast.error('Material already added');
      return;
    }

    const newItem: BOMItem = {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      quantity: 1,
      unit: material.unit,
      currentStock: material.currentStock || 0,
      needToPurchase: Math.max(0, 1 - (material.currentStock || 0)),
      category: material.category,
      notes: ''
    };

    setBomItems([...bomItems, newItem]);
    setSearchTerm('');
    setShowSearch(false);
    toast.success(`${material.name} added`);
  };

  // Update quantity
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const updated = [...bomItems];
    updated[index].quantity = quantity;
    updated[index].needToPurchase = Math.max(0, quantity - updated[index].currentStock);
    setBomItems(updated);
  };

  // Remove item
  const removeItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalItems = bomItems.length;
  const itemsAvailable = bomItems.filter(item => item.needToPurchase === 0).length;
  const itemsNeedingPurchase = bomItems.filter(item => item.needToPurchase > 0).length;

  // Validate form
  const validateForm = () => {
    if (!bomName.trim()) {
      toast.error('Please enter BOM name');
      return false;
    }
    if (!requiredDate) {
      toast.error('Please select required date');
      return false;
    }
    if (bomItems.length === 0) {
      toast.error('Please add at least one material');
      return false;
    }
    return true;
  };

  // Save BOM
  const saveBOM = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const bomData = {
        bomName,
        projectId,
        projectName,
        department,
        priority,
        requiredDate,
        notes,
        items: bomItems.map(item => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          requiredQty: item.quantity,
          unit: item.unit,
          currentStock: item.currentStock,
          shortfall: item.needToPurchase,
          category: item.category,
          notes: item.notes || '',
          status: item.needToPurchase > 0 ? 'need_purchase' : 'available'
        })),
        summary: {
          totalItems,
          itemsAvailable,
          itemsNeedingPurchase
        },
        status: itemsNeedingPurchase > 0 ? 'pending_purchase' : 'ready',
        createdAt: Timestamp.now().toMillis(),
        createdBy: 'PM User'
      };

      const docRef = await addDoc(collection(db, 'bom_records'), bomData);
      toast.success('BOM created successfully!');
      
      // Auto-create purchase request
      if (itemsNeedingPurchase > 0) {
        await createPurchaseRequest(docRef.id);
      }
      
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create BOM');
    } finally {
      setLoading(false);
    }
  };

  // Create purchase request
  const createPurchaseRequest = async (bomId: string) => {
    try {
      const itemsNeedingPurchaseList = bomItems.filter(item => item.needToPurchase > 0);
      
      await addDoc(collection(db, 'purchase_requests'), {
        bomId,
        bomName,
        projectId,
        projectName,
        department,
        priority,
        requiredDate,
        requestedBy: 'PM User',
        items: itemsNeedingPurchaseList.map(item => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.needToPurchase,
          unit: item.unit,
          category: item.category
        })),
        status: 'pending',
        createdAt: Timestamp.now().toMillis()
      });
      
      toast.success('Purchase request created automatically');
    } catch (error) {
      console.error('Error creating PR:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-white/20 rounded-3xl w-full max-w-6xl my-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-8 rounded-t-3xl">
          <div className="absolute inset-0 bg-black/20 rounded-t-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Bill of Materials</h2>
                  <p className="text-purple-100 text-sm">Create new BOM for project</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Building2 className="w-4 h-4 text-white" />
                <span className="text-white font-medium">{projectName}</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="relative p-3 hover:bg-white/20 rounded-xl transition-colors group"
            >
              <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* BOM Details Form */}
          <div className="bg-zinc-800/50 border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              BOM Information
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* BOM Name */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  BOM Name *
                </label>
                <input
                  type="text"
                  value={bomName}
                  onChange={(e) => setBomName(e.target.value)}
                  placeholder="e.g., Production BOM - Phase 1"
                  className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Required Date */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Required By Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Production">Production</option>
                  <option value="Assembly">Assembly</option>
                  <option value="Machining">Machining</option>
                  <option value="Welding">Welding</option>
                  <option value="Finishing">Finishing</option>
                  <option value="Quality">Quality</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or requirements..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Add Materials Section */}
          <div className="bg-zinc-800/50 border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Add Materials
            </h3>
            
            <div className="relative">
              <Search className="absolute left-4 top-4 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search materials by name, code, or category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(e.target.value.length > 0);
                }}
                onFocus={() => setShowSearch(searchTerm.length > 0)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearch && filteredMaterials.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 w-full bg-zinc-900 border border-white/20 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-10"
                  >
                    {filteredMaterials.slice(0, 10).map((material) => (
                      <button
                        key={material.id}
                        onClick={() => addMaterial(material)}
                        className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                                  {material.name}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm text-zinc-400">{material.code}</span>
                                  <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded text-zinc-300">
                                    {material.category}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-zinc-400 mb-1">Stock</p>
                            <p className="text-lg font-bold text-white">
                              {material.currentStock} {material.unit}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              material.currentStock > 0 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {material.currentStock > 0 ? 'Available' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* BOM Items Table */}
          {bomItems.length > 0 ? (
            <div className="bg-zinc-800/50 border border-white/10 rounded-2xl overflow-hidden mb-6">
              <div className="p-6 border-b border-white/10 bg-zinc-900/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Materials List ({bomItems.length} items)
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-900/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Quantity Required
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Stock Available
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        To Purchase
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bomItems.map((item, index) => (
                      <motion.tr
                        key={item.materialId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-white">{item.materialName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-zinc-400">{item.materialCode}</span>
                              <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded text-zinc-300">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                              className="w-24 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-sm text-zinc-400">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-lg font-bold text-blue-400">
                            {item.currentStock} {item.unit}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className={`text-lg font-bold ${
                            item.needToPurchase > 0 ? 'text-orange-400' : 'text-green-400'
                          }`}>
                            {item.needToPurchase} {item.unit}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {item.needToPurchase > 0 ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium">
                                <ShoppingCart className="w-4 h-4" />
                                Need Purchase
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                Available
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => removeItem(index)}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-800/30 border-2 border-dashed border-white/10 rounded-2xl p-16 text-center mb-6">
              <Package className="w-20 h-20 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-zinc-400 mb-2">No materials added yet</h3>
              <p className="text-zinc-500">Search and add materials using the search box above</p>
            </div>
          )}
        </div>

        {/* Footer with Summary and Actions */}
        <div className="border-t border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-800 p-8 rounded-b-3xl">
          <div className="flex items-center justify-between gap-8">
            {/* Summary Cards */}
            <div className="flex gap-6">
              {/* Total Items */}
              <div className="bg-zinc-800/50 border border-white/10 rounded-xl px-6 py-4 min-w-[140px]">
                <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">Total Items</p>
                <p className="text-3xl font-bold text-white">{totalItems}</p>
              </div>
              
              {/* Available */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-4 min-w-[140px]">
                <p className="text-xs text-green-400 mb-1 uppercase tracking-wide">Available</p>
                <p className="text-3xl font-bold text-green-400">{itemsAvailable}</p>
              </div>
              
              {/* Need Purchase */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-6 py-4 min-w-[140px]">
                <p className="text-xs text-orange-400 mb-1 uppercase tracking-wide">Need Purchase</p>
                <p className="text-3xl font-bold text-orange-400">{itemsNeedingPurchase}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveBOM}
                disabled={loading || bomItems.length === 0}
                className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-purple-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating BOM...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Create BOM
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Purchase Alert */}
          {itemsNeedingPurchase > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-400 mb-1">
                  Purchase Request Required
                </p>
                <p className="text-sm text-orange-300/80">
                  {itemsNeedingPurchase} item(s) need to be purchased. A purchase request will be created automatically.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
