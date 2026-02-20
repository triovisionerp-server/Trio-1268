'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, CheckCircle2, 
  Package, ShoppingCart, Search, FileText,
  Loader2, AlertTriangle, Building2, DollarSign,
  Download, Upload, ChevronRight,
  ChevronLeft, Layers, Users, Send
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, onSnapshot, query, Timestamp, getDocs } from 'firebase/firestore';
import { toast } from '@/lib/toast';
import * as XLSX from 'xlsx';

interface AdvancedBOMCreatorProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface Material {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  supplier?: string;
  unitPrice?: number;
  leadTime?: number;
}

interface BOMItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  itemType: string; // Raw Material / Consumable / Tooling / Manpower / Machine
  gradeSpecification?: string; // Grade / Specification
  quantity: number;
  unit: string;
  wastagePercent: number; // Wastage %
  totalQuantity: number; // Auto-calculated: Qty + (Qty × Wastage %)
  currentStock: number;
  needToPurchase: number;
  category: string;
  supplier?: string;
  unitPrice?: number;
  totalPrice?: number; // Auto-calculated: Total Qty × Cost per Unit
  leadTime?: number;
  remarks?: string; // Per-item remarks
  notes?: string;
  alternatives?: string[];
}

interface BOMTemplate {
  id: string;
  name: string;
  category: string;
  items: BOMItem[];
}

const DEPARTMENTS = ['Production', 'Assembly', 'Tooling', 'Machining', 'Quality', 'R&D', 'Maintenance'];
const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' }
];

const ITEM_TYPES = [
  'Raw Material',
  'Consumable',
  'Tooling',
  'Manpower',
  'Machine',
  'Tool',
  'Safety Equipment',
  'Spare Part',
  'Chemical'
];

const CATEGORIES = ['Raw Material', 'Consumable', 'Tool', 'Safety Equipment', 'Spare Part', 'Chemical'];

export default function AdvancedBOMCreator({ projectId, projectName, onClose }: AdvancedBOMCreatorProps) {
  const [step, setStep] = useState(1); // 1: Info, 2: Materials, 3: Review
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [templates, setTemplates] = useState<BOMTemplate[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out
  const [showSearch, setShowSearch] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [bomName, setBomName] = useState('');
  const [bomVersion, setBomVersion] = useState('1.0');
  const [requiredDate, setRequiredDate] = useState('');
  const [department, setDepartment] = useState('Production');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [budget, setBudget] = useState('');
  const [approverEmail, setApproverEmail] = useState('');

  // Load materials with pricing from Firebase (same collection as Store/empStore)
  useEffect(() => {
    setMaterialsLoading(true);
    setMaterialsError(null);
    
    const unsubscribe = onSnapshot(
      query(collection(db, 'inventory_materials')),
      (snapshot) => {
        const mats: Material[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          mats.push({ 
            id: doc.id, 
            code: data.code || '',
            name: data.name || '',
            currentStock: data.current_stock || 0,
            minStock: data.min_stock || 0,
            unit: data.unit || 'Units',
            category: data.category || 'Raw Material',
            supplier: data.supplier_name || data.supplier_id || '',
            unitPrice: data.purchase_price || data.unitPrice || 0,
            leadTime: data.leadTime || data.lead_time || 7
          } as Material);
        });
        setMaterials(mats.sort((a, b) => a.name.localeCompare(b.name)));
        setMaterialsLoading(false);
        console.log(`✓ BOM Creator: Loaded ${mats.length} materials from inventory_materials collection`);
        
        if (mats.length === 0) {
          setMaterialsError('No materials found. Please add materials in empStore first.');
        }
      },
      (error) => {
        console.error('Error loading materials:', error);
        setMaterialsError('Failed to load materials from database');
        setMaterialsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load suppliers
  useEffect(() => {
    // Suppliers loaded but not displayed in UI for simplicity
    // Can be used for future supplier recommendation features
  }, []);

  // Load BOM templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const q = query(collection(db, 'bom_templates'));
        const snapshot = await getDocs(q);
        const temps: BOMTemplate[] = [];
        snapshot.forEach((doc) => {
          temps.push({ id: doc.id, ...doc.data() } as BOMTemplate);
        });
        setTemplates(temps);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    loadTemplates();
  }, []);

  // Advanced filtering
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
      
      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'low' && m.currentStock > 0 && m.currentStock <= m.minStock) ||
        (stockFilter === 'out' && m.currentStock <= 0);
      
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [materials, searchTerm, categoryFilter, stockFilter]);

  // Add material to BOM
  const addMaterial = (material: Material) => {
    if (bomItems.find(item => item.materialId === material.id)) {
      toast.error('Material already added');
      return;
    }

    const qty = 1;
    const wastage = 0; // Default 0% wastage
    const totalQty = qty + (qty * wastage / 100); // Total Qty = Qty + (Qty × Wastage %)
    const needToPurchase = Math.max(0, totalQty - material.currentStock);
    const newItem: BOMItem = {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      itemType: material.category || 'Raw Material',
      gradeSpecification: '',
      quantity: qty,
      unit: material.unit,
      wastagePercent: wastage,
      totalQuantity: totalQty,
      currentStock: material.currentStock,
      needToPurchase,
      category: material.category,
      supplier: material.supplier,
      unitPrice: material.unitPrice || 0,
      totalPrice: (material.unitPrice || 0) * totalQty, // Total Cost = Total Qty × Cost per Unit
      leadTime: material.leadTime || 7,
      remarks: '',
      notes: ''
    };

    setBomItems([...bomItems, newItem]);
    setSearchTerm('');
    setShowSearch(false);
    toast.success(`${material.name} added`);
  };

  // Bulk add from template
  const applyTemplate = (template: BOMTemplate) => {
    setBomItems(template.items);
    toast.success(`Template "${template.name}" applied`);
  };

  // Import from Excel
  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Array<{
          MaterialCode?: string;
          MaterialName?: string;
          ItemType?: string;
          GradeSpecification?: string;
          Quantity?: string | number;
          'Wastage %'?: string | number;
          Remarks?: string;
          Notes?: string;
        }>;

        const imported: BOMItem[] = [];
        jsonData.forEach((row) => {
          const material = materials.find(m => 
            m.code === row.MaterialCode || m.name === row.MaterialName
          );
          if (material) {
            const qty = parseFloat(String(row.Quantity || 1));
            const wastage = parseFloat(String(row['Wastage %'] || 0));
            const totalQty = qty + (qty * wastage / 100);
            const needToPurchase = Math.max(0, totalQty - material.currentStock);
            imported.push({
              materialId: material.id,
              materialCode: material.code,
              materialName: material.name,
              itemType: row.ItemType || material.category || 'Raw Material',
              gradeSpecification: row.GradeSpecification || '',
              quantity: qty,
              unit: material.unit,
              wastagePercent: wastage,
              totalQuantity: totalQty,
              currentStock: material.currentStock,
              needToPurchase,
              category: material.category,
              supplier: material.supplier,
              unitPrice: material.unitPrice || 0,
              totalPrice: (material.unitPrice || 0) * totalQty,
              leadTime: material.leadTime,
              remarks: row.Remarks || '',
              notes: row.Notes || ''
            });
          }
        });

        if (imported.length > 0) {
          setBomItems([...bomItems, ...imported]);
          toast.success(`Imported ${imported.length} materials`);
        } else {
          toast.error('No matching materials found');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import file');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export to Excel (Industry Standard Template)
  const exportToExcel = () => {
    const exportData = bomItems.map((item) => ({
      'Project ID': projectId,
      'Product Name': projectName,
      'Item Type': item.itemType,
      'Item Name': item.materialName,
      'Material Code': item.materialCode,
      'Grade / Specification': item.gradeSpecification || '',
      'Qty': item.quantity,
      'Unit': item.unit,
      'Wastage %': item.wastagePercent,
      'Total Qty': item.totalQuantity.toFixed(2),
      'Supplier': item.supplier || '',
      'Cost per Unit': item.unitPrice?.toFixed(2) || '0.00',
      'Total Cost': item.totalPrice?.toFixed(2) || '0.00',
      'Remarks': item.remarks || ''
    }));

    // Add summary row
    exportData.push({
      'Project ID': '',
      'Product Name': 'TOTAL',
      'Item Type': '',
      'Item Name': '',
      'Material Code': '',
      'Grade / Specification': '',
      'Qty': '',
      'Unit': '',
      'Wastage %': '',
      'Total Qty': '',
      'Supplier': '',
      'Cost per Unit': '',
      'Total Cost': totalCost.toFixed(2),
      'Remarks': ''
    } as unknown as typeof exportData[0]);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM');
    XLSX.writeFile(wb, `BOM_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('✅ BOM exported with all industry-standard columns');
  };

  // Update quantity
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const updated = [...bomItems];
    updated[index].quantity = quantity;
    // Recalculate total quantity with wastage: Total Qty = Qty + (Qty × Wastage %)
    updated[index].totalQuantity = quantity + (quantity * updated[index].wastagePercent / 100);
    updated[index].needToPurchase = Math.max(0, updated[index].totalQuantity - updated[index].currentStock);
    // Recalculate total cost: Total Cost = Total Qty × Cost per Unit
    updated[index].totalPrice = (updated[index].unitPrice || 0) * updated[index].totalQuantity;
    setBomItems(updated);
  };

  // Update wastage percentage
  const updateWastage = (index: number, wastagePercent: number) => {
    if (wastagePercent < 0) return;
    const updated = [...bomItems];
    updated[index].wastagePercent = wastagePercent;
    // Recalculate total quantity: Total Qty = Qty + (Qty × Wastage %)
    updated[index].totalQuantity = updated[index].quantity + (updated[index].quantity * wastagePercent / 100);
    updated[index].needToPurchase = Math.max(0, updated[index].totalQuantity - updated[index].currentStock);
    // Recalculate total cost: Total Cost = Total Qty × Cost per Unit
    updated[index].totalPrice = (updated[index].unitPrice || 0) * updated[index].totalQuantity;
    setBomItems(updated);
  };

  // Update item type
  const updateItemType = (index: number, itemType: string) => {
    const updated = [...bomItems];
    updated[index].itemType = itemType;
    setBomItems(updated);
  };

  // Update grade/specification
  const updateGradeSpec = (index: number, gradeSpec: string) => {
    const updated = [...bomItems];
    updated[index].gradeSpecification = gradeSpec;
    setBomItems(updated);
  };

  // Update remarks
  const updateRemarks = (index: number, remarks: string) => {
    const updated = [...bomItems];
    updated[index].remarks = remarks;
    setBomItems(updated);
  };

  // Update unit price
  const updateUnitPrice = (index: number, unitPrice: number) => {
    if (unitPrice < 0) return;
    const updated = [...bomItems];
    updated[index].unitPrice = unitPrice;
    // Recalculate total cost: Total Cost = Total Qty × Cost per Unit
    updated[index].totalPrice = unitPrice * updated[index].totalQuantity;
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
  const totalCost = bomItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const maxLeadTime = Math.max(...bomItems.map(item => item.leadTime || 0), 0);

  // Validate form
  const validateStep = () => {
    if (step === 1) {
      if (!bomName.trim()) {
        toast.error('Please enter BOM name');
        return false;
      }
      if (!requiredDate) {
        toast.error('Please select required date');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (bomItems.length === 0) {
        toast.error('Please add at least one material');
        return false;
      }
      return true;
    }
    return true;
  };

  // Navigate steps
  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  // Save BOM with purchase integration
  const saveBOM = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      // Create BOM record
      const bomData = {
        bomName,
        bomVersion,
        projectId,
        projectName,
        department,
        priority,
        requiredDate,
        notes,
        budget: parseFloat(budget) || 0,
        approverEmail,
        items: bomItems.map(item => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          itemType: item.itemType,
          gradeSpecification: item.gradeSpecification || '',
          requiredQty: item.quantity,
          unit: item.unit,
          wastagePercent: item.wastagePercent,
          totalQuantity: item.totalQuantity,
          currentStock: item.currentStock,
          shortfall: item.needToPurchase,
          category: item.category,
          supplier: item.supplier || '',
          unitPrice: item.unitPrice || 0,
          totalCost: item.totalPrice || 0,
          leadTime: item.leadTime || 0,
          remarks: item.remarks || '',
          notes: item.notes || '',
          status: item.needToPurchase > 0 ? 'need_purchase' : 'available'
        })),
        summary: {
          totalItems,
          itemsAvailable,
          itemsNeedingPurchase,
          totalCost,
          estimatedLeadTime: maxLeadTime
        },
        status: itemsNeedingPurchase > 0 ? 'pending_purchase' : 'ready',
        approvalStatus: 'pending_pm_approval',
        createdAt: Timestamp.now().toMillis(),
        createdBy: 'PM User',
        updatedAt: Timestamp.now().toMillis()
      };

      const bomDocRef = await addDoc(collection(db, 'bom_records'), bomData);
      toast.success('✅ BOM created successfully!');
      
      // Auto-create purchase requests for items needing purchase
      if (itemsNeedingPurchase > 0) {
        await createAdvancedPurchaseRequests(bomDocRef.id);
      }

      // Send notification to approver
      if (approverEmail) {
        await sendApprovalNotification(bomDocRef.id, approverEmail);
      }
      
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create BOM');
    } finally {
      setLoading(false);
    }
  };

  // Create advanced purchase requests
  const createAdvancedPurchaseRequests = async (bomId: string) => {
    try {
      const itemsNeedingPurchaseList = bomItems.filter(item => item.needToPurchase > 0);
      
      // Group by supplier for consolidated purchase requests
      const groupedBySupplier = itemsNeedingPurchaseList.reduce((acc, item) => {
        const supplier = item.supplier || 'Unassigned';
        if (!acc[supplier]) acc[supplier] = [];
        acc[supplier].push(item);
        return acc;
      }, {} as Record<string, BOMItem[]>);

      // Create separate purchase request for each supplier
      const promises = Object.entries(groupedBySupplier).map(async ([supplier, items]) => {
        const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        
        return addDoc(collection(db, 'purchase_requests'), {
          bomId,
          bomName,
          projectId,
          projectName,
          supplier,
          department,
          priority,
          requiredDate,
          items: items.map(item => ({
            materialId: item.materialId,
            materialCode: item.materialCode,
            materialName: item.materialName,
            quantity: item.needToPurchase,
            unit: item.unit,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            category: item.category,
            leadTime: item.leadTime,
            notes: item.notes
          })),
          totalAmount,
          status: 'pending_approval',
          approvalStatus: 'pending',
          requestedBy: 'PM Department',
          assignedTo: 'Purchase Team',
          createdAt: Timestamp.now().toMillis(),
          updatedAt: Timestamp.now().toMillis()
        });
      });

      await Promise.all(promises);
      toast.success(`📦 ${promises.length} purchase request(s) created for Purchase Team`);
    } catch (error) {
      console.error('Error creating purchase requests:', error);
      toast.error('Failed to create purchase requests');
    }
  };

  // Send approval notification
  const sendApprovalNotification = async (bomId: string, email: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'bom_approval',
        bomId,
        bomName,
        projectName,
        recipientEmail: email,
        message: `BOM "${bomName}" for ${projectName} requires your approval`,
        priority,
        createdAt: Timestamp.now().toMillis(),
        read: false
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderInfoStep();
      case 2:
        return renderMaterialsStep();
      case 3:
        return renderReviewStep();
      default:
        return null;
    }
  };

  // Step 1: BOM Information
  const renderInfoStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            BOM Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bomName}
            onChange={(e) => setBomName(e.target.value)}
            placeholder="e.g., Water Tank Assembly BOM"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Version
          </label>
          <input
            type="text"
            value={bomVersion}
            onChange={(e) => setBomVersion(e.target.value)}
            placeholder="1.0"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
          >
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
          >
            {PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Required Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={requiredDate}
            onChange={(e) => setRequiredDate(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Budget (₹)
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Optional"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Approver Email
        </label>
        <input
          type="email"
          value={approverEmail}
          onChange={(e) => setApproverEmail(e.target.value)}
          placeholder="manager@triovision.com"
          className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional requirements or specifications..."
          rows={3}
          className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Project Context */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-sm font-medium text-zinc-200">Project: {projectName}</p>
            <p className="text-xs text-zinc-400">ID: {projectId}</p>
          </div>
        </div>
      </div>

      {/* Materials Connection Status */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Connected to Store Inventory</p>
              <p className="text-xs text-zinc-400">
                {materialsLoading ? 'Loading materials...' : 
                 materialsError ? materialsError :
                 `${materials.length} materials available from inventory_materials`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Materials Selection
  const renderMaterialsStep = () => (
    <div className="space-y-6">
      {/* BOM Header - Project Info */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-400 uppercase mb-1">Project ID</p>
            <p className="text-lg font-bold text-white">{projectId}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase mb-1">Product Name</p>
            <p className="text-lg font-bold text-white">{projectName}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>

        <label className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          Import Excel
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={importFromExcel}
            className="hidden"
          />
        </label>

        {bomItems.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        )}

        {templates.length > 0 && (
          <select
            onChange={(e) => {
              const template = templates.find(t => t.id === e.target.value);
              if (template) applyTemplate(template);
            }}
            className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors cursor-pointer"
          >
            <option value="">Use Template</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Search & Filter */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 bg-zinc-800/50 border border-white/10 rounded-lg p-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search materials by name, code, or category..."
                className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Stock Levels</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {searchTerm && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {materialsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin mb-2" />
                    <p className="text-sm text-zinc-400">Loading materials from Store...</p>
                  </div>
                ) : materialsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-8 h-8 mx-auto text-orange-400 mb-2" />
                    <p className="text-sm text-zinc-300 mb-2">{materialsError}</p>
                    <p className="text-xs text-zinc-500">Go to empStore to add materials first</p>
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-400">No materials found</p>
                    <p className="text-xs text-zinc-500 mt-1">Try different search terms or filters</p>
                  </div>
                ) : (
                  filteredMaterials.map(material => (
                    <div
                      key={material.id}
                      onClick={() => addMaterial(material)}
                      className="flex items-center justify-between p-3 bg-zinc-900 border border-white/10 rounded-lg hover:border-cyan-500/50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{material.name}</p>
                          <span className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">
                            {material.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                          <span>{material.category}</span>
                          <span>•</span>
                          <span>Stock: {material.currentStock} {material.unit}</span>
                          {material.unitPrice && (
                            <>
                              <span>•</span>
                              <span>₹{material.unitPrice}/{material.unit}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-cyan-400" />
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOM Table - Industry Standard */}
      {bomItems.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>No materials added yet</p>
          <p className="text-sm mt-1">Click &quot;Add Material&quot; to begin</p>
        </div>
      ) : (
        <div className="bg-zinc-800/50 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-white/10">
                  <th className="text-left px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Item Type</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Item Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Grade/Spec</th>
                  <th className="text-center px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Qty</th>
                  <th className="text-center px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Unit</th>
                  <th className="text-center px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Wastage %</th>
                  <th className="text-center px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap bg-cyan-500/5">Total Qty</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Supplier</th>
                  <th className="text-right px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Cost/Unit</th>
                  <th className="text-right px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap bg-green-500/5">Total Cost</th>
                  <th className="text-left px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Remarks</th>
                  <th className="text-center px-3 py-2 font-semibold text-zinc-400 uppercase whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {bomItems.map((item, index) => (
                  <tr key={index} className="hover:bg-zinc-800/50 transition-colors">
                    {/* Item Type */}
                    <td className="px-3 py-2">
                      <select
                        value={item.itemType}
                        onChange={(e) => updateItemType(index, e.target.value)}
                        className="w-full min-w-[120px] bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        {ITEM_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>

                    {/* Item Name */}
                    <td className="px-3 py-2">
                      <div className="min-w-[150px]">
                        <p className="font-medium text-white text-sm">{item.materialName}</p>
                        <p className="text-[10px] text-zinc-400">{item.materialCode}</p>
                      </div>
                    </td>

                    {/* Grade/Specification */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.gradeSpecification || ''}
                        onChange={(e) => updateGradeSpec(index, e.target.value)}
                        placeholder="Grade/Spec"
                        className="w-full min-w-[100px] bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.1"
                        className="w-20 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-center text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-2 text-center text-white">{item.unit}</td>

                    {/* Wastage % */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.wastagePercent}
                        onChange={(e) => updateWastage(index, parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.5"
                        className="w-20 bg-zinc-900 border border-orange-500/30 rounded px-2 py-1 text-center text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </td>

                    {/* Total Quantity (Auto-calculated) */}
                    <td className="px-3 py-2 text-center bg-cyan-500/5">
                      <span className="font-semibold text-cyan-400 text-sm">
                        {item.totalQuantity.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1">{item.unit}</span>
                    </td>

                    {/* Supplier */}
                    <td className="px-3 py-2">
                      <span className="text-white text-xs">{item.supplier || 'TBD'}</span>
                    </td>

                    {/* Cost per Unit */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateUnitPrice(index, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-24 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-right text-white text-xs focus:outline-none focus:border-green-500"
                      />
                    </td>

                    {/* Total Cost (Auto-calculated) */}
                    <td className="px-3 py-2 text-right bg-green-500/5">
                      <span className="font-semibold text-green-400 text-sm">
                        ₹{(item.totalPrice || 0).toFixed(2)}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => updateRemarks(index, e.target.value)}
                        placeholder="Remarks"
                        className="w-full min-w-[120px] bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Totals */}
          <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-t border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase">Total Items</p>
                  <p className="text-lg font-bold text-white">{totalItems}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase">Total Materials Cost</p>
                  <p className="text-lg font-bold text-green-400">₹{totalCost.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                <p>✓ Auto-calculated: Total Qty = Qty + (Qty × Wastage %)</p>
                <p>✓ Auto-calculated: Total Cost = Total Qty × Cost per Unit</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {bomItems.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{totalItems}</p>
                <p className="text-xs text-zinc-400">Total Items</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{itemsAvailable}</p>
                <p className="text-xs text-zinc-400">In Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">{itemsNeedingPurchase}</p>
                <p className="text-xs text-zinc-400">Need Purchase</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">₹{totalCost.toFixed(0)}</p>
                <p className="text-xs text-zinc-400">Total Cost</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 3: Review & Submit
  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* BOM Summary */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">BOM Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-zinc-400">BOM Name</p>
            <p className="text-white font-medium">{bomName}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Version</p>
            <p className="text-white font-medium">{bomVersion}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Project</p>
            <p className="text-white font-medium">{projectName}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Department</p>
            <p className="text-white font-medium">{department}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Priority</p>
            <p className="text-white font-medium capitalize">{priority}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Required Date</p>
            <p className="text-white font-medium">{requiredDate}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Estimated Lead Time</p>
            <p className="text-white font-medium">{maxLeadTime} days</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Budget</p>
            <p className="text-white font-medium">₹{budget || 'N/A'}</p>
          </div>
        </div>
        {notes && (
          <div className="mt-4">
            <p className="text-sm text-zinc-400">Notes</p>
            <p className="text-white">{notes}</p>
          </div>
        )}
      </div>

      {/* Cost Analysis */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-800/50 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Materials</p>
              <p className="text-2xl font-bold text-white">{totalItems}</p>
            </div>
            <Package className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        <div className="bg-zinc-800/50 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Purchase Cost</p>
              <p className="text-2xl font-bold text-white">₹{totalCost.toFixed(0)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-zinc-800/50 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Items to Purchase</p>
              <p className="text-2xl font-bold text-white">{itemsNeedingPurchase}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Materials Breakdown by Category */}
      <div className="bg-zinc-800/50 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3">Materials by Category</h4>
        <div className="space-y-2">
          {Object.entries(
            bomItems.reduce((acc, item) => {
              acc[item.category] = (acc[item.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">{category}</span>
              <span className="text-sm font-medium text-white">{count} items</span>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Info */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-white mb-2">Automated Workflow</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>BOM will be saved to <strong>bom_records</strong> collection</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Purchase requests created in <strong>purchase_requests</strong> for Purchase Team</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Stock data synced with <strong>inventory_materials</strong> (Store/empStore)</span>
              </div>
              {approverEmail && (
                <div className="flex items-center gap-2 text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Approval notification will be sent to {approverEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning if over budget */}
      {budget && parseFloat(budget) < totalCost && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Budget Exceeded</p>
            <p className="text-sm text-zinc-300 mt-1">
              Estimated cost (₹{totalCost.toFixed(2)}) exceeds budget (₹{parseFloat(budget).toFixed(2)}) by ₹{(totalCost - parseFloat(budget)).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Advanced BOM Creator</h2>
              <p className="text-purple-100">Create detailed Bill of Materials with purchase integration</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20">
              <div className={`w-2 h-2 rounded-full ${materialsLoading ? 'bg-yellow-400' : materialsError ? 'bg-red-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="text-sm text-white font-medium">
                {materialsLoading ? 'Connecting...' : materialsError ? 'Not Connected' : `${materials.length} Materials`}
              </span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {[
              { num: 1, label: 'BOM Info' },
              { num: 2, label: 'Materials' },
              { num: 3, label: 'Review' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      step >= s.num
                        ? 'bg-white text-purple-600'
                        : 'bg-white/20 text-white/60'
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-sm font-medium ${step >= s.num ? 'text-white' : 'text-white/60'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <ChevronRight className={`w-5 h-5 ${step > s.num ? 'text-white' : 'text-white/40'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Building2 className="w-4 h-4" />
              <span>Step {step} of 3</span>
            </div>
            {step === 2 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-cyan-300">
                  Connected to inventory_materials
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 text-white border border-white/10 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={saveBOM}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating BOM...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Create BOM & Send to Purchase
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
