'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Printer, Save, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import DeliveryChallanTemplate, { type DeliveryChallanData, type DCItem } from '../purchase/documents/DeliveryChallanTemplate';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import AutocompleteInput from '@/components/ui/AutocompleteInput';

// Company Address Options
const COMPANY_ADDRESSES = {
  triovision: {
    name: 'Triovision Composite Technologies Pvt Ltd',
    shortName: 'TRIOVISION',
    tagline: 'SHAPING IDEAS INTO REALITY',
    address: 'Plot No. 165, Jagananna Mega Industrial Hub, Kopparthy(V), C K Dinne(M), Kadapa - 516003, Andhra Pradesh',
    gstin: '37AAFCT4716N1ZV',
    stateCode: '37',
    phone: '+91-9281434840'
  },
  triobotics: {
    name: 'Triobotics Automaton Solutions Pvt. Ltd.',
    shortName: 'TRIOBOTICS',
    tagline: 'ENGINEERING EXCELLENCE',
    address: 'Plot No. 176, Jagananna Mega Industrial Hub, Kopparthy(V), C K Dinne(M), Kadapa - 516003, Andhra Pradesh',
    gstin: '37AAFCT3887J1ZP',
    stateCode: '37',
    phone: '+91-9281051644'
  }
};

export default function CreateDCForm() {
  const printRef = useRef<HTMLDivElement>(null);
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' | 'TRANSPORT COPY'>('ORIGINAL');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<'triovision' | 'triobotics'>('triovision');

  // Form state
  const [formData, setFormData] = useState<DeliveryChallanData>({
    dcNumber: `DC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
    dcDate: new Date().toISOString().split('T')[0],
    poNumber: '',
    poDate: '',
    
    consignor: {
      name: COMPANY_ADDRESSES.triovision.name,
      address: COMPANY_ADDRESSES.triovision.address,
      gstin: COMPANY_ADDRESSES.triovision.gstin,
      stateCode: COMPANY_ADDRESSES.triovision.stateCode,
      phone: COMPANY_ADDRESSES.triovision.phone
    },
    
    consignee: {
      name: '',
      address: '',
      gstin: '',
      stateCode: '',
      phone: ''
    },
    
    transport: {
      mode: 'Road',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      lrNumber: '',
      lrDate: '',
      eWayBillNo: '',
      eWayBillDate: ''
    },
    
    items: [
      {
        slNo: 1,
        itemCode: '',
        description: '',
        hsnCode: '',
        quantity: 0,
        unit: 'Nos',
        unitPrice: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        amount: 0,
        remarks: ''
      }
    ],
    
    reason: 'Supply',
    reasonRemarks: '',
    preparedBy: '',
    checkedBy: '',
    approvedBy: '',
    remarks: ''
  });

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: keyof DeliveryChallanData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent] as Record<string, unknown>, [field]: value }
    }));
  };

  // Handle company selection
  const handleCompanyChange = (company: 'triovision' | 'triobotics') => {
    setSelectedCompany(company);
    const companyData = COMPANY_ADDRESSES[company];
    setFormData(prev => ({
      ...prev,
      consignor: {
        name: companyData.name,
        address: companyData.address,
        gstin: companyData.gstin,
        stateCode: companyData.stateCode,
        phone: companyData.phone
      }
    }));
  };

  // Item management
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        slNo: prev.items.length + 1,
        itemCode: '',
        description: '',
        hsnCode: '',
        quantity: 0,
        unit: 'Nos',
        unitPrice: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        amount: 0,
        remarks: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, slNo: i + 1 }))
    }));
  };

  const updateItem = (index: number, field: keyof DCItem, value: string | number) => {
    setFormData(prev => {
      const updatedItems = prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          // Auto-calculate amount if quantity or unitPrice changes
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = field === 'quantity' ? (value as number) : item.quantity;
            const price = field === 'unitPrice' ? (value as number) : (item.unitPrice || 0);
            const baseAmount = qty * price;
            const cgstAmount = baseAmount * ((item.cgst || 0) / 100);
            const sgstAmount = baseAmount * ((item.sgst || 0) / 100);
            const igstAmount = baseAmount * ((item.igst || 0) / 100);
            updatedItem.amount = baseAmount + cgstAmount + sgstAmount + igstAmount;
          }
          // Auto-calculate amount if tax changes
          if (field === 'cgst' || field === 'sgst' || field === 'igst') {
            const baseAmount = item.quantity * (item.unitPrice || 0);
            const cgst = field === 'cgst' ? (value as number) : (item.cgst || 0);
            const sgst = field === 'sgst' ? (value as number) : (item.sgst || 0);
            const igst = field === 'igst' ? (value as number) : (item.igst || 0);
            const cgstAmount = baseAmount * (cgst / 100);
            const sgstAmount = baseAmount * (sgst / 100);
            const igstAmount = baseAmount * (igst / 100);
            updatedItem.amount = baseAmount + cgstAmount + sgstAmount + igstAmount;
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
  };

  // Save to Firebase
  const handleSave = async () => {
    try {
      setSaving(true);
      await addDoc(collection(db, 'delivery_challans'), {
        ...formData,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      alert('✅ Delivery Challan saved successfully!');
    } catch (error) {
      console.error('Error saving DC:', error);
      alert('❌ Failed to save DC');
    } finally {
      setSaving(false);
    }
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DC_${formData.dcNumber.replace(/\//g, '_')}`
  });

  // Load sample data for testing
  const loadSampleData = () => {
    setFormData({
      dcNumber: `DC/2026/SAMPLE-001`,
      dcDate: new Date().toISOString().split('T')[0],
      poNumber: 'PO/2026/A001',
      poDate: '2026-02-01',
      
      consignor: {
        name: COMPANY_ADDRESSES[selectedCompany].name,
        address: COMPANY_ADDRESSES[selectedCompany].address,
        gstin: COMPANY_ADDRESSES[selectedCompany].gstin,
        stateCode: COMPANY_ADDRESSES[selectedCompany].stateCode,
        phone: COMPANY_ADDRESSES[selectedCompany].phone
      },
      
      consignee: {
        name: 'ABC Manufacturing Ltd.',
        address: '123, Industrial Estate, Chennai - 600001',
        gstin: '33AAACB5678D1Z1',
        stateCode: '33',
        phone: '+91-44-87654321'
      },
      
      transport: {
        mode: 'Road',
        vehicleNumber: 'TN-01-AB-1234',
        driverName: 'Rajesh Kumar',
        driverPhone: '+91-9876543210',
        lrNumber: 'LR/2026/12345',
        lrDate: '2026-02-07',
        eWayBillNo: 'EWB123456789012',
        eWayBillDate: '2026-02-07'
      },
      
      items: [
        {
          slNo: 1,
          itemCode: 'COMP-001',
          description: 'Composite Mold - Type A',
          hsnCode: '8480',
          quantity: 5,
          unit: 'Nos',
          unitPrice: 25000,
          cgst: 9,
          sgst: 9,
          igst: 0,
          amount: 147500,
          remarks: 'Finished goods'
        },
        {
          slNo: 2,
          itemCode: 'COMP-002',
          description: 'Composite Panel - 1200x800mm',
          hsnCode: '3920',
          quantity: 20,
          unit: 'Nos',
          unitPrice: 1500,
          cgst: 9,
          sgst: 9,
          igst: 0,
          amount: 35400,
          remarks: 'QC Approved'
        }
      ],
      
      reason: 'Supply',
      reasonRemarks: 'Regular supply as per PO',
      preparedBy: 'John Doe',
      checkedBy: 'Jane Smith',
      approvedBy: 'Manager',
      remarks: 'Handle with care. Fragile items.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={loadSampleData}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-all flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Load Sample Data (Test)
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save DC'}
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-all flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl transition-all flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print DC
        </button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Basic Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">DC Number</label>
              <input
                type="text"
                value={formData.dcNumber}
                onChange={(e) => handleChange('dcNumber', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">DC Date</label>
              <input
                type="date"
                value={formData.dcDate}
                onChange={(e) => handleChange('dcDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400">PO Number (Optional)</label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => handleChange('poNumber', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">PO Date (Optional)</label>
              <input
                type="date"
                value={formData.poDate}
                onChange={(e) => handleChange('poDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
          </div>
        </motion.div>

        {/* Consignor Details (Sender) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Consignor (Sender - Your Company)</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">Select Company *</label>
              <select
                value={selectedCompany}
                onChange={(e) => handleCompanyChange(e.target.value as 'triovision' | 'triobotics')}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="triovision">Triovision Composite Technologies</option>
                <option value="triobotics">Triobotics Engineering</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Company Name</label>
              <input
                type="text"
                value={formData.consignor.name}
                readOnly
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white opacity-75"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Address</label>
              <textarea
                value={formData.consignor.address}
                readOnly
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white opacity-75"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-zinc-400">GSTIN</label>
                <input
                  type="text"
                  value={formData.consignor.gstin}
                  readOnly
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white opacity-75"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400">State Code</label>
                <input
                  type="text"
                  value={formData.consignor.stateCode}
                  readOnly
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white opacity-75"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Phone (Editable)</label>
              <input
                type="text"
                value={formData.consignor.phone}
                onChange={(e) => handleNestedChange('consignor', 'phone', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
          </div>
        </motion.div>

        {/* Consignee Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Consignee (Receiver)</h3>
          <div className="space-y-4">
            <AutocompleteInput
              label="Name"
              required
              value={formData.consignee.name}
              onChange={(val) => handleNestedChange('consignee', 'name', val)}
              storageKey="dc_consignee_name"
              placeholder="Enter consignee name..."
            />
            <AutocompleteInput
              label="Address"
              required
              type="textarea"
              rows={3}
              value={formData.consignee.address}
              onChange={(val) => handleNestedChange('consignee', 'address', val)}
              storageKey="dc_consignee_address"
              placeholder="Enter consignee address..."
            />
            <AutocompleteInput
              label="GSTIN"
              value={formData.consignee.gstin}
              onChange={(val) => handleNestedChange('consignee', 'gstin', val)}
              storageKey="dc_consignee_gstin"
              placeholder="Enter GSTIN..."
            />
            <div className="grid grid-cols-2 gap-3">
              <AutocompleteInput
                label="State Code"
                value={formData.consignee.stateCode}
                onChange={(val) => handleNestedChange('consignee', 'stateCode', val)}
                storageKey="dc_consignee_state"
                placeholder="e.g., 37"
              />
              <AutocompleteInput
                label="Phone"
                value={formData.consignee.phone}
                onChange={(val) => handleNestedChange('consignee', 'phone', val)}
                storageKey="dc_consignee_phone"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
          </div>
        </motion.div>

        {/* Transport Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Transport Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">Transport Mode</label>
              <select
                value={formData.transport.mode}
                onChange={(e) => handleNestedChange('transport', 'mode', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Courier">Courier</option>
                <option value="Hand Delivery">Hand Delivery</option>
              </select>
            </div>
            <AutocompleteInput
              label="Vehicle Number"
              value={formData.transport.vehicleNumber || ''}
              onChange={(val) => handleNestedChange('transport', 'vehicleNumber', val)}
              storageKey="dc_vehicle_number"
              placeholder="e.g., TN-01-AB-1234"
            />
            <AutocompleteInput
              label="Driver Name"
              value={formData.transport.driverName || ''}
              onChange={(val) => handleNestedChange('transport', 'driverName', val)}
              storageKey="dc_driver_name"
              placeholder="Enter driver name..."
            />
            <AutocompleteInput
              label="Driver Phone"
              value={formData.transport.driverPhone || ''}
              onChange={(val) => handleNestedChange('transport', 'driverPhone', val)}
              storageKey="dc_driver_phone"
              placeholder="+91-XXXXXXXXXX"
            />
            <AutocompleteInput
              label="LR Number"
              value={formData.transport.lrNumber || ''}
              onChange={(val) => handleNestedChange('transport', 'lrNumber', val)}
              storageKey="dc_lr_number"
              placeholder="Lorry Receipt No."
            />
            <div>
              <label className="text-sm text-zinc-400">LR Date</label>
              <input
                type="date"
                value={formData.transport.lrDate}
                onChange={(e) => handleNestedChange('transport', 'lrDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <AutocompleteInput
              label="E-Way Bill Number"
              value={formData.transport.eWayBillNo || ''}
              onChange={(val) => handleNestedChange('transport', 'eWayBillNo', val)}
              storageKey="dc_eway_bill"
              placeholder="Enter E-Way Bill No..."
            />
            <div>
              <label className="text-sm text-zinc-400">E-Way Bill Date</label>
              <input
                type="date"
                value={formData.transport.eWayBillDate}
                onChange={(e) => handleNestedChange('transport', 'eWayBillDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
          </div>
        </motion.div>

        {/* Additional Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Additional Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">Reason for Transport</label>
              <select
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                <option value="Supply">Supply</option>
                <option value="Job Work">Job Work</option>
                <option value="Sales Return">Sales Return</option>
                <option value="Approval">Approval</option>
                <option value="Exhibition">Exhibition</option>
                <option value="Personal Use">Personal Use</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <AutocompleteInput
              label="Prepared By"
              value={formData.preparedBy}
              onChange={(val) => handleChange('preparedBy', val)}
              storageKey="dc_prepared_by"
              placeholder="Enter name..."
            />
            <AutocompleteInput
              label="Checked By"
              value={formData.checkedBy || ''}
              onChange={(val) => handleChange('checkedBy', val)}
              storageKey="dc_checked_by"
              placeholder="Enter name..."
            />
            <AutocompleteInput
              label="Remarks"
              type="textarea"
              rows={3}
              value={formData.remarks || ''}
              onChange={(val) => handleChange('remarks', val)}
              storageKey="dc_remarks"
              placeholder="Additional remarks..."
            />
          </div>
        </motion.div>
      </div>

      {/* Items Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Items</h3>
          <button
            onClick={addItem}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-white">Item #{item.slNo}</span>
                {formData.items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                <div>
                  <label className="text-xs text-zinc-400">Item Code</label>
                  <input
                    type="text"
                    value={item.itemCode}
                    onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    list={`itemCode-suggestions-${index}`}
                  />
                  <datalist id={`itemCode-suggestions-${index}`}>
                    <option value="COMP-001" />
                    <option value="COMP-002" />
                    <option value="FG-001" />
                  </datalist>
                </div>
                <div className="md:col-span-2 xl:col-span-2">
                  <label className="text-xs text-zinc-400">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    list={`description-suggestions-${index}`}
                  />
                  <datalist id={`description-suggestions-${index}`}>
                    <option value="Composite Mold - Type A" />
                    <option value="Composite Panel" />
                    <option value="Tooling Assembly" />
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">HSN Code</label>
                  <input
                    type="text"
                    value={item.hsnCode}
                    onChange={(e) => updateItem(index, 'hsnCode', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    list={`hsn-suggestions-${index}`}
                  />
                  <datalist id={`hsn-suggestions-${index}`}>
                    <option value="8480" />
                    <option value="3920" />
                    <option value="8207" />
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                  >
                    <option value="Nos">Nos</option>
                    <option value="Kg">Kg</option>
                    <option value="Liters">Liters</option>
                    <option value="Meters">Meters</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Sets">Sets</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Unit Price (₹)</label>
                  <input
                    type="number"
                    value={item.unitPrice || 0}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">CGST (%)</label>
                  <input
                    type="number"
                    value={item.cgst || 0}
                    onChange={(e) => updateItem(index, 'cgst', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    placeholder="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">SGST (%)</label>
                  <input
                    type="number"
                    value={item.sgst || 0}
                    onChange={(e) => updateItem(index, 'sgst', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    placeholder="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">IGST (%)</label>
                  <input
                    type="number"
                    value={item.igst || 0}
                    onChange={(e) => updateItem(index, 'igst', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    placeholder="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={item.amount || 0}
                    readOnly
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm font-semibold opacity-75"
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-2">
                  <label className="text-xs text-zinc-400">Remarks</label>
                  <input
                    type="text"
                    value={item.remarks || ''}
                    onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Print Copy Selection */}
      <div className="flex gap-2">
        {(['ORIGINAL', 'DUPLICATE', 'TRIPLICATE', 'TRANSPORT COPY'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setCopyType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              copyType === type
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Print Preview (Hidden) */}
      <div style={{ display: showPreview ? 'block' : 'none' }}>
        <DeliveryChallanTemplate ref={printRef} data={formData} copyType={copyType} />
      </div>
    </div>
  );
}
