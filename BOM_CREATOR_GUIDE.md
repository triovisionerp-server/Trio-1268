# 📋 Simple BOM Creator Guide

## Quick Start

### How to Create a BOM (Bill of Materials)

1. **Go to PM Dashboard**
   - Navigate to `/pm` page
   - Click on **"Projects"** tab

2. **Select a Project**
   - Find the project you want to create BOM for
   - Click **"Create BOM"** button on the project card

3. **Add Materials**
   - Search for materials by name or code
   - Click on the material from dropdown
   - Click **"Add"** button
   - Material will appear in the BOM items list

4. **Set Quantities**
   - For each material, enter required quantity
   - System automatically calculates:
     - ✅ Stock available
     - 🛒 How much needs to be purchased

5. **Review Summary**
   - Bottom panel shows:
     - Total items in BOM
     - Items available in stock
     - Items that need purchase

6. **Save BOM**
   - Click **"Create BOM"** button
   - BOM is saved to Firebase
   - Purchase request is automatically created for items that need purchase

---

## Features

### ✨ Automatic Stock Check
- Real-time stock checking
- Shows current stock vs required quantity
- Calculates shortfall automatically

### 🚀 Auto Purchase Request
- If materials need purchase, PR is created automatically
- No manual steps needed
- Purchase team gets notified

### 🎨 Visual Indicators
- 🟢 **Green Badge** = Stock available
- 🟠 **Orange Badge** = Need to purchase
- Clear color coding for quick decisions

### 📊 Live Data
- All materials synced from Firebase
- Real-time stock updates
- Instant calculations

---

## Step-by-Step Example

### Example: Creating BOM for "Project Alpha"

**Project requires:**
- Mild Steel Sheet - 100 kg
- Welding Electrode - 50 pieces
- Paint - 20 liters

**Steps:**

1. Click **"Create BOM"** on Project Alpha card
2. Search "Mild Steel" → Select from dropdown → Add
3. Change quantity from 1 to 100 kg
4. Search "Welding Electrode" → Add → Set 50 pieces
5. Search "Paint" → Add → Set 20 liters
6. Review summary:
   - If Mild Steel stock = 80 kg → Need to buy 20 kg
   - If Welding Electrode stock = 50 → ✅ Available
   - If Paint stock = 5 liters → Need to buy 15 liters
7. Click **"Create BOM"**
8. System creates:
   - ✅ BOM saved
   - 🛒 Purchase request for Mild Steel (20 kg) and Paint (15 liters)

---

## Tips

### 🎯 Best Practices
1. **Check stock before creating BOM** - Materials show current stock
2. **Add all materials at once** - Easier to review
3. **Double-check quantities** - System calculates automatically
4. **Use search** - Faster than scrolling

### ⚡ Keyboard Shortcuts
- Type in search box to filter materials
- Use Tab to navigate between fields
- Enter to add selected material

### 🔍 Search Tips
- Search by material name: "Steel"
- Search by code: "MS-001"
- Partial matches work: "wel" finds "Welding Electrode"

---

## Troubleshooting

### ❌ "Material already added"
**Problem:** Trying to add same material twice  
**Solution:** Update quantity instead of adding again

### ❌ "Please select a material"
**Problem:** No material selected  
**Solution:** Click on material from dropdown first

### ⚠️ No materials showing in search
**Problem:** Materials collection empty  
**Solution:** Add materials in Data Entry page first (`/empStore`)

---

## Data Flow

```
PM Dashboard → Projects Tab → Create BOM
   ↓
SimpleBOMCreator opens
   ↓
Search & Add Materials (from Firebase 'materials')
   ↓
Set Quantities
   ↓
Auto Calculate Stock vs Required
   ↓
Click "Create BOM"
   ↓
Save to Firebase 'bom_records'
   ↓
Auto-create Purchase Request (if needed)
   ↓
Success! ✅
```

---

## Firebase Collections Used

1. **materials** - Source of materials (code, name, stock)
2. **bom_records** - Stores created BOMs
3. **purchase_requests** - Auto-generated for materials needing purchase

---

## What Happens After BOM Creation?

1. ✅ BOM saved with status "pending_purchase" or "ready"
2. 🛒 Purchase request created automatically
3. 📧 Purchase team can see pending requests
4. 📦 Once materials purchased, stock updates automatically
5. ✅ BOM status changes to "ready"

---

## Need Help?

- **Material not found?** → Add it in Data Entry page first
- **Stock wrong?** → Check Data Entry page for updates
- **Want to edit BOM?** → Currently view-only, create new version

---

## Benefits of New Simple BOM Creator

✅ **Easy to Use** - Simple 3-step process  
✅ **Fast** - No complex forms  
✅ **Smart** - Auto-calculates everything  
✅ **Visual** - Clear indicators  
✅ **Automated** - Auto-creates purchase requests  
✅ **Real-time** - Live stock data  
✅ **Error-free** - Validation built-in  

---

**Last Updated:** February 2026  
**Component:** SimpleBOMCreator.tsx  
**Location:** `/pm` → Projects Tab → Create BOM
