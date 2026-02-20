# BOM-Purchase-Store Integration Guide

## Overview
Complete end-to-end material procurement workflow connecting BOM creation, purchase orders, goods receipt, and material issuance to projects.

## Workflow Steps

### 1. BOM Creation (PM Role)
**Location**: `/pm/bom`

- **Generate from Requirements**: Input customer requirements → AI generates BOM
- **Edit Components**: Adjust quantities, add/remove items, update pricing
- **Submit for Approval**: Send to MD for financial review
- **Check Stock**: Verify material availability before production

### 2. MD Approval (MD Role)
**Location**: `/md/bom-approval`

- **Financial Analysis**: Review cost breakdown, profit margins, GST calculations
- **Approve/Reject**: Make final decision with comments
- **Pricing Validation**: Ensure profit targets are met

### 3. Stock Check & PO Generation (Purchase Team)
**Location**: `/purchase/bom-integration`

#### Auto-Generate Purchase Orders:
1. Select approved BOM
2. System checks stock availability
3. View shortfall items (materials with insufficient stock)
4. Click "Generate POs" → System creates separate PO for each supplier
5. **Auto-routing**:
   - POs < ₹100,000: Auto-approved, ready to send
   - POs ≥ ₹100,000: Requires MD approval

**Features**:
- Groups items by supplier automatically
- Calculates GST (18% default)
- Links PO to BOM and project
- Generates unique PO numbers

### 4. Goods Receipt (Store Team)
**Location**: `/purchase/bom-integration` → "Receive Goods" button

**Process**:
1. Select PO with status "Approved"
2. Click "Receive Goods"
3. Modal opens with all PO items
4. Verify quantities received (can adjust for partial deliveries)
5. Add remarks for any issues/damage
6. Submit → System:
   - Creates GRN (Goods Receipt Note)
   - Updates inventory quantities atomically
   - Changes PO status to "Received"
   - Records receiving details (date, user, remarks)

### 5. Material Issuance (Store → Production)
**Location**: `/purchase/bom-integration` → "Issue Materials" button

**Process**:
1. Select PO with status "Received"
2. Click "Issue Materials"
3. Modal shows available items with stock validation
4. Select materials to issue (checkbox)
5. Adjust quantities if needed
6. Submit → System:
   - Deducts from inventory (atomic transaction)
   - Creates issue_records for tracking
   - Updates PO with issuance details
   - Links to project for cost analysis

### 6. Exception Handling (Supervisor)
**Location**: `/supervisor/indent-deviation`

#### Indent Form:
- Request **additional materials** not in original BOM
- Multi-item support
- Priority levels (Low/Normal/High/Urgent)
- Approval workflow: Supervisor → PM → Store

#### Deviation Form:
- Report **BOM changes/substitutions** during production
- Document why deviation occurred
- Update cost impact
- Track for future BOM improvements

## Key Features

### Automatic PO Grouping
```
BOM has 10 items from 3 suppliers:
├── Supplier A: Items 1, 2, 3, 7 → PO-001
├── Supplier B: Items 4, 5, 6    → PO-002
└── Supplier C: Items 8, 9, 10   → PO-003
```

### Inventory Safety
- **Atomic Transactions**: Uses Firebase `runTransaction()` to prevent race conditions
- **Stock Validation**: Checks availability before issuance
- **Partial Delivery Support**: Can receive and issue partial quantities
- **Audit Trail**: Every movement logged with user, date, quantity

### Real-Time Tracking
```
BOM → PO → GRN → Issue
 ↓     ↓    ↓      ↓
All linked via projectId, bomId, poId for complete traceability
```

### Material Flow Analytics
View complete project material flow:
- Total purchase value across all POs
- Materials received with GRN dates
- Materials issued to production
- Outstanding orders and pending deliveries

## Database Collections

| Collection | Purpose |
|-----------|---------|
| `boms` | Bill of Materials with components |
| `purchase_orders` | Generated POs with supplier details |
| `goods_receipts` | GRN records from receiving |
| `issue_records` | Material issuance to projects |
| `materials` | Inventory master with current stock |
| `indent_forms` | Additional material requests |
| `deviation_forms` | BOM change requests |

## Permissions

| Role | Responsibilities |
|------|-----------------|
| **PM** | Create/edit BOM, review stock, submit for approval |
| **MD** | Approve BOM, approve high-value POs (>₹1L) |
| **Purchase** | Generate POs, send to suppliers, track delivery |
| **Store** | Receive goods (GRN), issue to production |
| **Supervisor** | Create indent/deviation forms, request materials |

## API Functions

### BOM Purchase Integration Service
Located: `src/lib/services/bomPurchaseIntegration.ts`

```typescript
// Generate POs from BOM shortfall
generatePOsFromBOM(bomId, stockReport, userId, userName)

// Link PO to project
linkPOToProject(poId, projectId, bomId)

// Get all POs for a project
getProjectPOs(projectId)

// Receive goods and update inventory
receiveGoodsFromPO(poId, receivedBy, receivedByName, items)

// Issue materials to project
issueMaterialsFromPO(poId, projectId, issuedBy, issuedByName, items)

// Check if materials are available for issuance
checkPOMaterialAvailability(poId)

// Get complete material flow for project
getProjectMaterialFlow(projectId)
```

## Testing Checklist

- [ ] Create BOM from customer requirements
- [ ] PM reviews and submits to MD
- [ ] MD approves with pricing
- [ ] Navigate to purchase integration page
- [ ] Select approved BOM
- [ ] Verify stock check shows shortfalls
- [ ] Generate POs → Verify grouped by supplier
- [ ] Open POGenerationModal → Check summary
- [ ] Close modal → See POs in list
- [ ] Click "Receive Goods" → Verify quantities
- [ ] Submit GRN → Check inventory updated
- [ ] Click "Issue Materials" → Select items
- [ ] Submit issuance → Verify stock deducted
- [ ] View project material flow analytics
- [ ] Test partial delivery workflow
- [ ] Test indent form creation
- [ ] Test deviation form submission

## Troubleshooting

### PO Generation Fails
- Verify BOM is approved
- Check stock report exists
- Ensure user auth is valid

### Goods Receipt Error
- Confirm PO status is "Approved"
- Verify received quantities ≤ ordered quantities
- Check Firebase transaction limits

### Material Issuance Blocked
- Ensure goods are received first (GRN created)
- Verify sufficient stock after receiving
- Check project ID is valid

### Modal Not Opening
- Check browser console for errors
- Verify modal import paths
- Ensure PurchaseOrder object has required fields

## Next Steps

1. **Add Email Notifications**: Send PO to suppliers automatically
2. **SMS Alerts**: Notify supervisors when materials arrive
3. **Barcode Scanning**: Speed up GRN process with barcode scanner
4. **Mobile App**: Field supervisors access indent forms on mobile
5. **Advanced Analytics**: Supplier performance, lead time tracking
6. **Automatic Reordering**: Generate PO when min stock reached

---

**Last Updated**: January 2026  
**Project**: Composite ERP - Triovision  
**Module**: BOM-Purchase-Store Integration
