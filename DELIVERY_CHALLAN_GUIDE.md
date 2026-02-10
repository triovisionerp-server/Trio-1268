# 📦 Delivery Challan (DC) System - Complete Guide

**Created**: February 7, 2026  
**Module**: Dispatch & Logistics  
**Location**: `/dispatch` route

---

## 🎯 Overview

The DC system manages outgoing shipments with:
- ✅ Full DC creation form with all GST/E-Way Bill fields
- ✅ Real-time Firebase storage & tracking
- ✅ Professional A4 print templates (4 copy types)
- ✅ Status workflow: Pending → In Transit → Delivered
- ✅ Quick test mode with sample data

---

## 📂 System Architecture

### Files Created
```
src/app/(dashboard)/dispatch/
├── page.tsx              # Main dispatch dashboard (tabs, stats)
├── CreateDCForm.tsx      # DC creation form (Option 1 + 2)
├── DCList.tsx           # DC management & listing
└── ../purchase/documents/
    └── DeliveryChallanTemplate.tsx  # Print template
```

### Firebase Collection
```typescript
Collection: 'delivery_challans'
Document Structure: {
  dcNumber: string          // DC/2026/0001
  dcDate: string           // ISO date
  poNumber?: string        // Optional PO reference
  poDate?: string
  
  consignor: {             // Sender (Triovision)
    name, address, gstin, stateCode, phone
  }
  
  consignee: {             // Receiver (Customer)
    name, address, gstin, stateCode, phone
  }
  
  transport: {
    mode: 'Road' | 'Rail' | 'Air' | 'Courier' | 'Hand Delivery'
    vehicleNumber?, driverName?, driverPhone?
    lrNumber?, lrDate?
    eWayBillNo?, eWayBillDate?
  }
  
  items: DCItem[]          // Array of items
  reason: 'Supply' | 'Job Work' | 'Sales Return' | ...
  preparedBy, checkedBy?, approvedBy?
  remarks?: string
  
  // Auto-generated
  createdAt: timestamp
  status: 'pending' | 'in_transit' | 'delivered'
}
```

---

## 🚀 How to Use (3 Options)

### **Option 1: Create Real DC**

1. **Navigate**:
   ```
   Login → Dispatch Dashboard → Click "Create DC" tab
   ```

2. **Fill Form**:
   - **Basic**: DC Number (auto-generated), DC Date, PO reference
   - **Consignee**: Customer name, address, GSTIN, state code, phone
   - **Transport**: Mode, vehicle, driver, E-Way Bill number
   - **Items**: Click "+ Add Item" for each product
     - Item Code, Description, HSN Code
     - Quantity, Unit (Nos/Kg/Liters)
   - **Additional**: Prepared by, Checked by, Remarks

3. **Actions**:
   - 💾 **Save DC**: Stores in Firebase (appears in DC List)
   - 🖨️ **Print DC**: Opens print dialog (4 copy types)
   - 👁️ **Show Preview**: Toggle print preview visibility

4. **Print Copies**:
   - Select copy type: ORIGINAL | DUPLICATE | TRIPLICATE | TRANSPORT COPY
   - Click "Print DC" button
   - Choose printer or "Save as PDF"

---

### **Option 2: Quick Test (Demo Mode)**

1. **Load Sample Data**:
   ```
   Click "Load Sample Data (Test)" button
   ```

2. **What Gets Loaded**:
   - Sample consignee: ABC Manufacturing Ltd. (Chennai)
   - Transport: Road, Vehicle TN-01-AB-1234, E-Way Bill
   - 2 sample items: Composite Mold + Panels
   - All fields pre-filled for testing

3. **Test Print**:
   - Click "Show Preview" to verify layout
   - Click "Print DC" to test print functionality
   - Try all 4 copy types

4. **Use Case**:
   - Testing print layout before going live
   - Training new staff
   - Demo for management

---

### **Option 3: Data Structure Reference**

#### TypeScript Interface
```typescript
// Item structure for each product
export interface DCItem {
  slNo: number              // Serial number (1, 2, 3...)
  itemCode: string          // Product code (COMP-001)
  description: string       // Product name/description
  hsnCode: string          // GST HSN code (8480, 3920)
  quantity: number         // Quantity shipped
  unit: string            // Nos, Kg, Liters, Meters, etc.
  remarks?: string        // Optional notes
}

// Full DC document
export interface DeliveryChallanData {
  dcNumber: string
  dcDate: string
  poNumber?: string
  poDate?: string
  
  consignor: {
    name: string
    address: string
    gstin: string
    stateCode: string
    phone: string
  }
  
  consignee: {
    name: string
    address: string
    gstin: string
    stateCode: string
    phone: string
  }
  
  transport: {
    mode: 'Road' | 'Rail' | 'Air' | 'Courier' | 'Hand Delivery'
    vehicleNumber?: string
    driverName?: string
    driverPhone?: string
    lrNumber?: string          // Lorry Receipt
    lrDate?: string
    eWayBillNo?: string       // E-Way Bill number
    eWayBillDate?: string
  }
  
  items: DCItem[]
  reason: 'Supply' | 'Job Work' | 'Sales Return' | 'Approval' | 'Exhibition' | 'Personal Use' | 'Others'
  reasonRemarks?: string
  preparedBy: string
  checkedBy?: string
  approvedBy?: string
  remarks?: string
}
```

#### Example JSON
```json
{
  "dcNumber": "DC/2026/0001",
  "dcDate": "2026-02-07",
  "poNumber": "PO/2026/A001",
  "consignor": {
    "name": "Triovision Engineering Pvt. Ltd.",
    "address": "Industrial Area, Phase-2, Bangalore - 560099",
    "gstin": "29AAACT1234C1Z5",
    "stateCode": "29",
    "phone": "+91-80-12345678"
  },
  "consignee": {
    "name": "ABC Manufacturing Ltd.",
    "address": "123, Industrial Estate, Chennai - 600001",
    "gstin": "33AAACB5678D1Z1",
    "stateCode": "33",
    "phone": "+91-44-87654321"
  },
  "transport": {
    "mode": "Road",
    "vehicleNumber": "TN-01-AB-1234",
    "driverName": "Rajesh Kumar",
    "driverPhone": "+91-9876543210",
    "eWayBillNo": "EWB123456789012",
    "eWayBillDate": "2026-02-07"
  },
  "items": [
    {
      "slNo": 1,
      "itemCode": "COMP-001",
      "description": "Composite Mold - Type A",
      "hsnCode": "8480",
      "quantity": 5,
      "unit": "Nos",
      "remarks": "Finished goods"
    }
  ],
  "reason": "Supply",
  "preparedBy": "John Doe",
  "remarks": "Handle with care"
}
```

---

## 📊 DC Management Features

### DC List View
Access via "DC List" tab:

1. **Search & Filter**:
   - Search by DC number or consignee name
   - Filter by status: All | Pending | In Transit | Delivered

2. **DC Cards**:
   Each card shows:
   - DC number, date, PO reference
   - Consignee name & address
   - Transport mode & vehicle
   - E-Way Bill number (if present)
   - Item count & total quantity
   - Current status badge

3. **Actions**:
   - 🖨️ **Print**: Print any DC instantly
   - 🗑️ **Delete**: Remove DC (with confirmation)
   - 📦 **Mark In Transit**: Move pending DC to in-transit
   - ✅ **Mark Delivered**: Complete delivery

### Status Workflow
```
Pending ──────> In Transit ──────> Delivered
  (Blue)         (Yellow)            (Green)
```

---

## 🎨 UI Features

### Dashboard Stats (Real-time)
- **Ready to Ship**: Pending DCs count
- **In Transit**: DCs currently being shipped
- **Delivered**: Completed deliveries
- **Total DCs**: All-time DC count

### Form Features
- **Auto-generate** DC numbers: DC/YYYY/NNNN format
- **Date picker** with default today's date
- **Dynamic items**: Add/remove items dynamically
- **Unit dropdown**: Nos, Kg, Liters, Meters, Boxes, Sets
- **Transport mode**: Road, Rail, Air, Courier, Hand Delivery
- **Reason dropdown**: Supply, Job Work, Sales Return, etc.

### Print Template Features
- **A4 size** optimized layout
- **Company branding** with logo placeholder
- **4 copy types** with watermark: ORIGINAL, DUPLICATE, TRIPLICATE, TRANSPORT COPY
- **GST compliant** with consignor/consignee details
- **E-Way Bill** section highlighted
- **Item table** with HSN codes
- **Signatures** section: Prepared, Checked, Approved

---

## 🔗 Integration Points

### Firebase Realtime Sync
```typescript
// Stats update automatically
useEffect(() => {
  const q = query(collection(db, 'delivery_challans'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Updates stats in real-time
  });
  return () => unsubscribe();
}, []);
```

### Print Integration
```typescript
import { useReactToPrint } from 'react-to-print';

const handlePrint = useReactToPrint({
  content: () => printRef.current,
  documentTitle: `DC_${dcNumber}`
});
```

---

## 📋 Common Workflows

### Workflow 1: Regular Supply DC
1. Create DC with customer details
2. Add items from finished goods
3. Enter vehicle & driver info
4. Generate E-Way Bill number (external system)
5. Enter E-Way Bill in DC form
6. Save & Print ORIGINAL copy (customer)
7. Print TRANSPORT COPY (driver)
8. Mark as "In Transit" when vehicle leaves
9. Mark as "Delivered" when confirmed

### Workflow 2: Job Work DC
1. Select reason: "Job Work"
2. Fill sub-contractor details as consignee
3. Add items (materials/components for processing)
4. No E-Way Bill needed if within state
5. Save & Print
6. Track return using PO reference

### Workflow 3: Demo/Test DC
1. Click "Load Sample Data"
2. Verify all fields populated
3. Modify items if needed
4. Print without saving (for demo only)

---

## 🛠️ Customization Guide

### Change DC Number Format
```typescript
// In CreateDCForm.tsx
dcNumber: `DC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`

// Change to: DC/BRANCH/YYYY/NNNN
dcNumber: `DC/BLR/${new Date().getFullYear()}/${counter}`
```

### Add Custom DC Fields
```typescript
// 1. Update interface in DeliveryChallanTemplate.tsx
export interface DeliveryChallanData {
  // ... existing fields
  customField: string;  // Add new field
}

// 2. Add form field in CreateDCForm.tsx
<input
  type="text"
  value={formData.customField}
  onChange={(e) => handleChange('customField', e.target.value)}
/>

// 3. Update print template to display field
```

### Modify Units List
```typescript
// In CreateDCForm.tsx - updateItem function area
<select value={item.unit}>
  <option value="Nos">Nos</option>
  <option value="Kg">Kg</option>
  // Add new units:
  <option value="Ton">Ton</option>
  <option value="Sqft">Sqft</option>
</select>
```

---

## 🔒 Access Control

Current setup: All authenticated users can access dispatch.

To restrict by role:
```typescript
// In page.tsx
import { useAuthStore } from '@/lib/stores/useAuthStore';

export default function DispatchPage() {
  const { user } = useAuthStore();
  
  // Only dispatch & admin roles
  if (!['dispatch', 'admin', 'md'].includes(user?.role)) {
    return <div>Access Denied</div>;
  }
  
  // ... rest of code
}
```

---

## 📱 Mobile Responsive

All components are mobile-optimized:
- Grid layout adapts to screen size
- Forms stack vertically on mobile
- Print preview hidden on mobile (print directly)
- Touch-friendly buttons

---

## ⚡ Performance Tips

1. **Pagination**: For 100+ DCs, add pagination to DCList
2. **Date range filter**: Filter by date range to reduce query size
3. **Lazy load**: Load DC details only when card expanded
4. **Print optimization**: Hide preview by default

---

## 🐛 Troubleshooting

### Print not working?
- Install `react-to-print`: Already in package.json
- Check browser print settings
- Verify printRef is attached to template

### Data not saving?
- Check Firebase rules: Allow write to `delivery_challans`
- Verify user authentication
- Check console for errors

### Stats showing 0?
- Verify Firebase collection name: `delivery_challans`
- Check if documents have `status` field
- Confirm real-time listener is active

### E-Way Bill field missing?
- Check DeliveryChallanTemplate.tsx - transport section
- Verify formData.transport includes eWayBillNo
- Confirm print template displays E-Way Bill

---

## 📞 Support

For issues or enhancements:
1. Check console errors (F12)
2. Verify Firebase connection
3. Test with sample data first
4. Review this guide for data structure

---

**System Status**: ✅ Production Ready  
**Last Updated**: February 7, 2026  
**Version**: 1.0
