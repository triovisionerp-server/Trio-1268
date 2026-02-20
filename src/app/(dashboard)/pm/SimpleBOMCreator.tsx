'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Plus, Trash2, Save, AlertCircle, CheckCircle2, 
  Package, ShoppingCart
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { toast } from '@/lib/toast';

interface SimpleBOMCreatorProps {
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
  notes?: string;
}

export default function SimpleBOMCreator({ projectId, projectName, onClose }: SimpleBOMCreatorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Load materials from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'materials')),
      (snapshot) => {
        const mats: Material[] = [];
        snapshot.forEach((doc) => {
          mats.push({ id: doc.id, ...doc.data() } as Material);
        });
        setMaterials(mats);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter materials by search
  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add material to BOM
  const addMaterial = () => {
    if (!selectedMaterial) {
      toast.error('Please select a material');
      return;
    }

    const material = materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    // Check if already added
    if (bomItems.find(item => item.materialId === material.id)) {
      toast.error('Material already added to BOM');
      return;
    }

    const newItem: BOMItem = {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      quantity: 1,
      unit: material.unit,
      currentStock: material.currentStock || 0,
      needToPurchase: 0
    };

    setBomItems([...bomItems, newItem]);
    setSelectedMaterial('');
    setSearchTerm('');
    toast.success(`${material.name} added to BOM`);
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
    toast.success('Item removed from BOM');
  };

  // Calculate totals
  const totalItems = bomItems.length;
  const itemsNeedingPurchase = bomItems.filter(item => item.needToPurchase > 0).length;
  const totalStockAvailable = bomItems.filter(item => item.currentStock >= item.quantity).length;

  // Save BOM to Firebase
  const saveBOM = async () => {
    if (bomItems.length === 0) {
      toast.error('Please add at least one material');
      return;
    }

    setLoading(true);
    try {
      const bomData = {
        projectId,
        projectName,
        projectCode: projectId,
        items: bomItems.map(item => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          requiredQty: item.quantity,
          unit: item.unit,
          currentStock: item.currentStock,
          shortfall: item.needToPurchase,
          status: item.needToPurchase > 0 ? 'need_purchase' : 'available'
        })),
        totalItems: bomItems.length,
        itemsAvailable: totalStockAvailable,
        itemsNeedPurchase: itemsNeedingPurchase,
        status: itemsNeedingPurchase > 0 ? 'pending_purchase' : 'ready',
        createdAt: Timestamp.now().toMillis(),
        createdBy: 'PM User'
      };

      await addDoc(collection(db, 'bom_records'), bomData);
      
      toast.success('BOM created successfully!');
      
      // Auto-create purchase request if items need purchase
      if (itemsNeedingPurchase > 0) {
        await createPurchaseRequest(bomItems);
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving BOM:', error);
      toast.error('Failed to create BOM');
    } finally {
      setLoading(false);
    }
  };

  // Create purchase request
  const createPurchaseRequest = async (items: BOMItem[]) => {
    try {
      const itemsNeedingPurchaseList = items.filter(item => item.needToPurchase > 0);
      
      const prData = {
        projectId,
        projectName,
        requestedBy: 'PM User',
        items: itemsNeedingPurchaseList.map(item => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.needToPurchase,
          unit: item.unit
        })),
        status: 'pending',
        priority: 'medium',
        createdAt: Timestamp.now().toMillis(),
        bomReference: projectId
      };

      await addDoc(collection(db, 'purchase_requests'), prData);
      toast.success('Purchase request created automatically');
    } catch (error) {
      console.error('Error creating purchase request:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Create Bill of Materials</h2>
              <p className="text-purple-100 mt-1">{projectName}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {/* Add Material Section */}
          <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Materials to BOM
            </h3>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search materials by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                
                {/* Material Dropdown */}
                {searchTerm && (
                  <div className="mt-2 bg-zinc-900 border border-white/10 rounded-xl max-h-60 overflow-y-auto">
                    {filteredMaterials.length > 0 ? (
                      filteredMaterials.slice(0, 10).map((material) => (
                        <button
                          key={material.id}
                          onClick={() => {
                            setSelectedMaterial(material.id);
                            setSearchTerm(material.name);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">{material.name}</p>
                              <p className="text-sm text-zinc-400">{material.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-zinc-400">Stock: {material.currentStock} {material.unit}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                material.currentStock > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {material.currentStock > 0 ? 'Available' : 'Out of Stock'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-zinc-500 text-center">No materials found</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={addMaterial}
                disabled={!selectedMaterial}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
          </div>

          {/* BOM Items List */}
          {bomItems.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                BOM Items ({bomItems.length})
              </h3>
              
              {bomItems.map((item, index) => (
                <motion.div
                  key={item.materialId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-800/50 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Material Info */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{item.materialName}</h4>
                      <p className="text-sm text-zinc-400">{item.materialCode}</p>
                    </div>

                    {/* Quantity Input */}
                    <div className="w-32">
                      <label className="text-xs text-zinc-400 mb-1 block">Quantity</label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Stock Info */}
                    <div className="w-40 text-center">
                      <p className="text-xs text-zinc-400">Stock Available</p>
                      <p className="text-lg font-bold text-white">{item.currentStock} {item.unit}</p>
                    </div>

                    {/* Purchase Needed */}
                    <div className="w-40 text-center">
                      <p className="text-xs text-zinc-400">Need to Buy</p>
                      <p className={`text-lg font-bold ${
                        item.needToPurchase > 0 ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {item.needToPurchase} {item.unit}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.needToPurchase > 0 ? (
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          Purchase
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Available
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-800/30 border-2 border-dashed border-white/10 rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">No materials added yet</h3>
              <p className="text-zinc-500">Search and add materials to create your BOM</p>
            </div>
          )}
        </div>

        {/* Footer with Summary */}
        <div className="border-t border-white/10 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-zinc-400">Total Items</p>
                <p className="text-2xl font-bold text-white">{totalItems}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Stock Available</p>
                <p className="text-2xl font-bold text-green-400">{totalStockAvailable}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Need Purchase</p>
                <p className="text-2xl font-bold text-orange-400">{itemsNeedingPurchase}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBOM}
                disabled={loading || bomItems.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
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

          {itemsNeedingPurchase > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <p className="text-sm text-orange-400">
                A purchase request will be created automatically for {itemsNeedingPurchase} item(s) that need purchase.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
