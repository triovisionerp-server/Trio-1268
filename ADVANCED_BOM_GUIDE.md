# Advanced BOM Creator - Integration Guide

## 🎯 Overview
The Advanced BOM Creator is a professional, multi-step wizard for creating Bill of Materials with full Purchase and Store integration.

## ✨ Key Features

### 1. **Multi-Step Wizard** (3 Steps)
- **Step 1: BOM Information**
  - BOM name, version, department, priority
  - Required date, budget, approver email
  - Project context display
  
- **Step 2: Materials Selection**
  - Advanced search with filters (category, stock status)
  - Add materials individually or bulk import
  - Excel import/export functionality
  - BOM templates (reusable)
  - Real-time stock checking
  - Cost calculation per material
  
- **Step 3: Review & Submit**
  - Complete BOM summary
  - Cost analysis dashboard
  - Materials breakdown by category
  - Budget validation with warnings
  - Integration workflow preview

### 2. **Smart Material Management**
- **Search & Filter**
  - Search by name, code, or category
  - Filter by category (Raw Material, Consumable, Tool, etc.)
  - Filter by stock status (All, Low Stock, Out of Stock)
  
- **Bulk Operations**
  - Import materials from Excel/CSV
  - Export BOM to Excel
  - Apply BOM templates for common assemblies
  
- **Real-time Calculations**
  - Auto-calculate purchase requirements (Quantity - Current Stock)
  - Unit price × quantity = total cost
  - Lead time display
  - Budget vs actual cost comparison

### 3. **Purchase Team Integration** ✅
When BOM is created with items needing purchase, the system automatically:

1. **Groups materials by supplier** for consolidated ordering
2. **Creates purchase requests** in `purchase_requests` collection with:
   - BOM ID and project reference
   - Supplier information
   - Required date cascading
   - Priority level
   - Material list with quantities and prices
   - Total amount
   - Status: `pending_approval`
   - Assigned to: `Purchase Team`

3. **Sends notifications** to purchase team
4. Purchase team sees requests in their dashboard at `/purchase`

### 4. **Store Integration** ✅
Real-time connection with Store page:

1. **Live Stock Data**
   - BOM creator reads from `materials` collection (same as Store page)
   - Shows current stock levels in real-time
   - Color-coded status (green=available, red=need purchase)

2. **Stock Reservation** (Planned)
   - When BOM approved, materials can be reserved
   - Store page shows reserved quantities
   - Prevents double-allocation

3. **Purchase Receipt Flow**
   - Purchase team creates POs
   - Store receives materials via GRN (Goods Receipt Note)
   - Stock updates in `materials` collection
   - BOM automatically reflects updated availability

### 5. **Workflow Integration**

```
PM Dashboard → Create BOM → Advanced BOM Creator
                    ↓
            [Step 1: BOM Info]
                    ↓
            [Step 2: Add Materials]
                    ↓
            [Step 3: Review]
                    ↓
            Save to Firebase
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
[Purchase Requests]      [BOM Records]
        ↓                       ↓
Purchase Team Dashboard   Store Dashboard
        ↓                       ↓
  Create PO              Check Stock
        ↓                       ↓
  Order Materials         Receive GRN
        ↓                       ↓
  └─────→ Update Stock ←───────┘
```

## 📊 Firebase Collections

### `bom_records`
```json
{
  "bomName": "Water Tank Assembly BOM",
  "bomVersion": "1.0",
  "projectId": "PSS-4963",
  "projectName": "water",
  "department": "Production",
  "priority": "high",
  "requiredDate": "2026-03-01",
  "notes": "Urgent project",
  "budget": 50000,
  "approverEmail": "md@triovision.com",
  "items": [
    {
      "materialId": "mat123",
      "materialCode": "STL-001",
      "materialName": "Steel Sheet 2mm",
      "requiredQty": 10,
      "unit": "Kg",
      "currentStock": 5,
      "shortfall": 5,
      "category": "Raw Material",
      "supplier": "ABC Suppliers",
      "unitPrice": 500,
      "totalCost": 2500,
      "leadTime": 7,
      "status": "need_purchase"
    }
  ],
  "summary": {
    "totalItems": 15,
    "itemsAvailable": 8,
    "itemsNeedingPurchase": 7,
    "totalCost": 45000,
    "estimatedLeadTime": 14
  },
  "status": "pending_purchase",
  "approvalStatus": "pending_pm_approval",
  "createdAt": 1739280000000,
  "createdBy": "PM User",
  "updatedAt": 1739280000000
}
```

### `purchase_requests`
```json
{
  "bomId": "bom_abc123",
  "bomName": "Water Tank Assembly BOM",
  "projectId": "PSS-4963",
  "projectName": "water",
  "supplier": "ABC Suppliers",
  "department": "Production",
  "priority": "high",
  "requiredDate": "2026-03-01",
  "items": [
    {
      "materialId": "mat123",
      "materialCode": "STL-001",
      "materialName": "Steel Sheet 2mm",
      "quantity": 5,
      "unit": "Kg",
      "unitPrice": 500,
      "totalPrice": 2500,
      "category": "Raw Material",
      "leadTime": 7
    }
  ],
  "totalAmount": 25000,
  "status": "pending_approval",
  "approvalStatus": "pending",
  "requestedBy": "PM Department",
  "assignedTo": "Purchase Team",
  "createdAt": 1739280000000,
  "updatedAt": 1739280000000
}
```

### `notifications` (Optional)
```json
{
  "type": "bom_approval",
  "bomId": "bom_abc123",
  "bomName": "Water Tank Assembly BOM",
  "projectName": "water",
  "recipientEmail": "md@triovision.com",
  "message": "BOM 'Water Tank Assembly BOM' for water requires your approval",
  "priority": "high",
  "createdAt": 1739280000000,
  "read": false
}
```

## 🔗 Page Connections

### PM Dashboard → BOM Creator
**Location:** `/pm` → Projects tab → "Create BOM" button

```tsx
<button onClick={() => {
  setSelectedProject({ id: project.projectCode, name: project.projectDescription });
  setShowBOMCreator(true);
}}>
  Create BOM
</button>
```

### Purchase Dashboard Integration
**Location:** `/purchase` → Purchase team sees requests

Purchase team can:
- View all BOM-generated purchase requests
- Create Purchase Orders from requests
- Track order status
- Link POs back to BOM

### Store Dashboard Integration
**Location:** `/store` → Store manager sees stock levels

Store manager can:
- View current stock (same data BOM reads)
- Receive materials via GRN
- Update stock levels (auto-reflects in BOMs)
- Track material movements

## 🎨 UI Highlights

### Step Progress Indicator
- **Visual steps**: BOM Info → Materials → Review
- **Completed steps**: White background with checkmark
- **Current step**: Highlighted
- **Future steps**: Dimmed

### Material Table
| Column | Description |
|--------|-------------|
| Material | Name + Code |
| Category | Raw Material, Consumable, etc. |
| Qty | Editable input field |
| Stock | Current stock (green if available, red if low/out) |
| Purchase | Auto-calculated shortfall |
| Cost | Unit price × purchase quantity |
| Supplier | Supplier name or TBD |
| Action | Delete button |

### Summary Dashboard
- **Total Items**: Count of materials
- **In Stock**: Materials fully available
- **Need Purchase**: Materials requiring purchase
- **Total Cost**: Sum of all purchase costs

### Budget Warning
If total cost > budget:
```
⚠️ Budget Exceeded
Estimated cost (₹45,000) exceeds budget (₹40,000) by ₹5,000
```

## 🚀 Usage Examples

### Example 1: Water Tank Project BOM
```typescript
// PM creates BOM for Water Tank project
1. Enter BOM name: "Water Tank Assembly BOM v2.0"
2. Select department: Production
3. Set priority: High
4. Set required date: 2026-03-15
5. Add materials:
   - Steel Sheet 2mm (10 kg)
   - Welding Rods (5 boxes)
   - Paint (3 liters)
6. Review → Shows 2 items need purchase (₹8,500)
7. Submit → Purchase requests created for 2 suppliers
```

### Example 2: Import from Excel
```typescript
// PM imports BOM from Excel spreadsheet
1. Prepare Excel with columns:
   - MaterialCode
   - MaterialName
   - Quantity
   - Notes
2. Click "Import Excel"
3. Select file
4. System matches materials from database
5. Adds matched materials to BOM
6. Shows import summary
```

### Example 3: Use BOM Template
```typescript
// PM uses template for common assembly
1. Click "Use Template" dropdown
2. Select "Standard Tooling Kit"
3. Template items populate table
4. Adjust quantities as needed
5. Proceed to review
```

## 📝 Best Practices

1. **Always fill required fields** (marked with *)
2. **Set realistic required dates** considering lead times
3. **Review budget warnings** before submitting
4. **Use descriptive BOM names** (include version, project)
5. **Add notes** for special requirements
6. **Check stock levels** before setting quantities
7. **Export Excel** for record-keeping
8. **Set approver email** for important BOMs

## 🔧 Technical Details

### Component
- **File**: `src/app/(dashboard)/pm/AdvancedBOMCreator.tsx`
- **Props**:
  - `projectId`: Project identifier
  - `projectName`: Project display name
  - `onClose`: Callback to close modal

### Dependencies
- React 18
- Framer Motion (animations)
- Firebase Firestore (data)
- XLSX.js (Excel import/export)
- Lucide Icons

### State Management
- Local component state (no Zustand)
- Firebase real-time listeners
- Automatic cleanup on unmount

## 🐛 Troubleshooting

**BOM not saving?**
- Check Firebase connection
- Ensure all required fields filled
- Check console for errors

**Materials not showing?**
- Verify `materials` collection exists
- Check Firebase permissions
- Refresh page to reload data

**Purchase requests not created?**
- Check if materials need purchase (shortfall > 0)
- Verify `purchase_requests` collection writable
- Check browser console for errors

**Cost calculations wrong?**
- Verify material `unitPrice` in database
- Check quantity inputs are valid numbers
- Refresh material data

---

**Last Updated**: February 12, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
