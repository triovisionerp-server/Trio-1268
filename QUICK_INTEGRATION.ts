/**
 * Quick Integration Example
 * How to integrate enterprise features into your existing ERP
 */

// ═══════════════════════════════════════════════════════════════
// 1. ADD NOTIFICATION BELL TO YOUR SIDEBAR/NAVBAR
// ═══════════════════════════════════════════════════════════════

// In src/components/Sidebar.tsx or DynamicSidebar.tsx
import { NotificationBell } from '@/components/dashboard/NotificationCenter';
import { useAuthStore } from '@/lib/stores/useAuthStore';

function EnhancedSidebar() {
  const { user } = useAuthStore();
  
  return (
    <div className="sidebar">
      {/* ... existing sidebar content ... */}
      
      <div className="flex items-center gap-3">
        {/* Add notification bell */}
        <NotificationBell userId={user?.id || user?.uid || ''} />
        
        {/* ... other header items ... */}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. INITIALIZE WORKFLOW ENGINE
// ═══════════════════════════════════════════════════════════════

// In src/app/layout.tsx or a global provider
'use client';
import { useEffect } from 'react';
import { workflowEngine } from '@/lib/services/workflowEngine';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize workflow automation engine
    const unsubscribe = workflowEngine.initialize();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. TRIGGER WORKFLOWS WHEN EVENTS HAPPEN
// ═══════════════════════════════════════════════════════════════

// Example: After creating a Purchase Order
import { triggerWorkflow } from '@/lib/services/workflowEngine';

async function handleCreatePO(poData) {
  // Create the PO
  const po = await createPurchaseOrder(poData);
  
  // Trigger workflow automation
  await triggerWorkflow('po_created', {
    id: po.id,
    poNumber: po.poNumber,
    totalAmount: po.totalAmount,
    status: po.status,
    createdBy: po.createdBy,
    supplierName: po.supplierName
  });
  
  return po;
}

// Example: After updating stock
async function handleStockUpdate(materialId, quantity) {
  const material = await updateMaterialStock(materialId, quantity);
  
  // Check if stock is low and trigger workflow
  if (material.currentStock < material.minStock) {
    await triggerWorkflow('stock_updated', {
      materialId: material.id,
      materialName: material.name,
      materialCode: material.code,
      currentStock: material.currentStock,
      minStock: material.minStock,
      supplier: material.supplier
    });
  }
  
  return material;
}

// ═══════════════════════════════════════════════════════════════
// 4. SEND NOTIFICATIONS FROM YOUR CODE
// ═══════════════════════════════════════════════════════════════

import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

async function sendNotification(userId: string, data: {
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  category: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type: data.type,
    category: data.category,
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    isRead: false,
    isPinned: false,
    createdAt: new Date().toISOString()
  });
}

// Usage examples:
await sendNotification('user123', {
  type: 'success',
  category: 'approval',
  title: 'PO Approved',
  message: 'Your purchase order PO-2026-001 has been approved by MD',
  actionUrl: '/purchase',
  actionLabel: 'View PO'
});

await sendNotification('user123', {
  type: 'warning',
  category: 'stock',
  title: 'Low Stock Alert',
  message: 'Material "Steel Plate 10mm" is running low (Current: 5, Min: 10)',
  actionUrl: '/store',
  actionLabel: 'Check Inventory'
});

// ═══════════════════════════════════════════════════════════════
// 5. USE ADVANCED ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════

// Replace your existing analytics page with the new dashboard
// In src/app/(dashboard)/md/analytics/page.tsx
import AdvancedAnalyticsDashboard from '@/components/dashboard/AdvancedAnalyticsDashboard';

export default function AnalyticsPage() {
  return <AdvancedAnalyticsDashboard />;
}

// Or embed as a component in any page:
function MyDashboard() {
  return (
    <div>
      <h1>My Custom Dashboard</h1>
      <AdvancedAnalyticsDashboard />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6. CREATE CUSTOM WORKFLOWS
// ═══════════════════════════════════════════════════════════════

import { addDoc, collection } from 'firebase/firestore';
import { WorkflowAutomation } from '@/types/module';

async function createCustomWorkflow() {
  const workflow: Partial<WorkflowAutomation> = {
    name: 'Notify MD on High-Value PO',
    description: 'Send notification when PO exceeds ₹1,00,000',
    moduleId: 'purchase_advanced',
    isActive: true,
    
    trigger: {
      type: 'event',
      event: 'po_created',
      conditions: [
        {
          field: 'totalAmount',
          operator: 'gt',
          value: 100000
        }
      ]
    },
    
    actions: [
      {
        id: '1',
        type: 'notification',
        config: {
          userId: 'md_user_id',
          type: 'alert',
          category: 'approval',
          title: 'High-Value PO Created',
          message: 'PO {{poNumber}} worth ₹{{totalAmount}} requires your approval'
        },
        order: 1,
        continueOnError: false
      },
      {
        id: '2',
        type: 'email',
        config: {
          to: 'md@company.com',
          subject: 'High-Value PO Approval Required',
          body: 'A purchase order worth ₹{{totalAmount}} has been created and requires your approval.'
        },
        order: 2,
        continueOnError: true
      }
    ],
    
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    runCount: 0,
    successCount: 0,
    errorCount: 0
  };
  
  await addDoc(collection(db, 'workflow_automations'), workflow);
}

// ═══════════════════════════════════════════════════════════════
// 7. ACCESS MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════

import {
  MODULE_REGISTRY,
  getModuleById,
  getModulesByCategory,
  getActiveModules,
  getModulesForRole
} from '@/config/modules';

// Get all modules
const allModules = MODULE_REGISTRY;

// Get specific module
const purchaseModule = getModuleById('purchase_advanced');

// Get modules by category
const manufacturingModules = getModulesByCategory('manufacturing');

// Get active modules only
const activeModules = getActiveModules();

// Get modules for current user role
const userModules = getModulesForRole('purchase');

// ═══════════════════════════════════════════════════════════════
// 8. INTEGRATE WITH EXISTING APPROVAL WORKFLOWS
// ═══════════════════════════════════════════════════════════════

// In your PO approval function
async function approvePurchaseOrder(poId: string, approvedBy: string) {
  // Update PO status
  await updateDoc(doc(db, 'purchase_orders', poId), {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString()
  });
  
  // Send notification to requester
  const po = await getDoc(doc(db, 'purchase_orders', poId));
  const poData = po.data();
  
  await sendNotification(poData.createdBy, {
    type: 'success',
    category: 'approval',
    title: 'PO Approved',
    message: `Your purchase order ${poData.poNumber} has been approved`,
    actionUrl: `/purchase`,
    actionLabel: 'View PO'
  });
  
  // Trigger post-approval workflows
  await triggerWorkflow('po_approved', {
    id: poId,
    poNumber: poData.poNumber,
    totalAmount: poData.totalAmount,
    approvedBy
  });
}

// ═══════════════════════════════════════════════════════════════
// 9. ADD MODULE LINKS TO NAVIGATION
// ═══════════════════════════════════════════════════════════════

import { getModulesForRole } from '@/config/modules';

function DynamicNavigation() {
  const { user } = useAuthStore();
  const userModules = getModulesForRole(user?.role || '');
  
  return (
    <nav>
      {userModules.map(module => (
        <Link
          key={module.id}
          href={module.routes.main}
          className="nav-item"
        >
          {module.name}
        </Link>
      ))}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// 10. QUICK SETUP CHECKLIST
// ═══════════════════════════════════════════════════════════════

/*
  ✅ Step 1: Add NotificationBell to Sidebar
  ✅ Step 2: Initialize workflow engine in layout
  ✅ Step 3: Add workflow triggers to PO creation
  ✅ Step 4: Add workflow triggers to stock updates
  ✅ Step 5: Replace analytics page with AdvancedAnalyticsDashboard
  ✅ Step 6: Create default workflows in Firestore
  ✅ Step 7: Test notifications
  ✅ Step 8: Test workflows
  ✅ Step 9: Access /admin/modules page
  ✅ Step 10: Deploy to production
*/

// ═══════════════════════════════════════════════════════════════
// FIRESTORE COLLECTIONS TO CREATE
// ═══════════════════════════════════════════════════════════════

/*
  1. notifications
    - userId: string
    - type: 'info' | 'success' | 'warning' | 'error' | 'alert'
    - category: string
    - title: string
    - message: string
    - isRead: boolean
    - isPinned: boolean
    - createdAt: string

  2. workflow_automations
    - name: string
    - description: string
    - moduleId: string
    - isActive: boolean
    - trigger: object
    - actions: array
    - createdBy: string
    - createdAt: string
    - runCount: number
    - successCount: number
    - errorCount: number

  3. dashboards
    - name: string
    - userId: string
    - widgets: array
    - isDefault: boolean
    - createdAt: string
    - updatedAt: string
*/

export {};
