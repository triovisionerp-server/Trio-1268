/**
 * Module Registry
 * Central registry of all ERP modules available in the system
 */

import { ModuleConfig } from '@/types/module';

export const MODULE_REGISTRY: ModuleConfig[] = [
  // Manufacturing Modules
  {
    id: 'manufacturing_core',
    name: 'Manufacturing Core',
    description: 'Core manufacturing operations including work orders, BOMs, and production planning',
    version: '2.0.0',
    category: 'manufacturing',
    icon: 'Factory',
    status: 'active',
    features: [
      'Bill of Materials (BOM)',
      'Work Order Management',
      'Production Planning',
      'Multi-level BOM',
      'Material Requirements Planning (MRP)',
      'Production Analytics'
    ],
    permissions: [
      { role: ['admin', 'md', 'pm', 'production'], action: 'write' },
      { role: ['supervisor', 'employee'], action: 'read' }
    ],
    dependencies: [
      { moduleId: 'inventory_core', required: true }
    ],
    routes: {
      main: '/production',
      admin: '/pm/bom',
      reports: '/pm/analytics'
    },
    collections: ['projects', 'work_orders', 'boms', 'production_logs'],
    widgets: [
      { id: 'production_kpi', name: 'Production KPIs', type: 'kpi', defaultSize: { w: 4, h: 2 }, configurable: true },
      { id: 'wip_status', name: 'Work in Progress', type: 'kanban', defaultSize: { w: 6, h: 4 }, configurable: false }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },
  
  // Inventory Modules
  {
    id: 'inventory_core',
    name: 'Inventory Management',
    description: 'Complete inventory management with stock tracking, warehousing, and material movements',
    version: '2.0.0',
    category: 'inventory',
    icon: 'Package',
    status: 'active',
    features: [
      'Multi-location Inventory',
      'Stock Adjustments',
      'Material Issue/Return',
      'Min/Max Stock Alerts',
      'Barcode Scanning',
      'Batch & Serial Tracking',
      'Stock Valuation (FIFO/LIFO/Average)'
    ],
    permissions: [
      { role: ['admin', 'md', 'purchase', 'store'], action: 'write' },
      { role: ['supervisor', 'employee'], action: 'read' }
    ],
    dependencies: [],
    routes: {
      main: '/store',
      admin: '/empStore',
      reports: '/store/reports'
    },
    collections: ['materials', 'issue_records', 'purchase_entries', 'stock_adjustments'],
    widgets: [
      { id: 'stock_levels', name: 'Stock Levels', type: 'chart', defaultSize: { w: 6, h: 3 }, configurable: true },
      { id: 'low_stock_alerts', name: 'Low Stock Items', type: 'list', defaultSize: { w: 4, h: 3 }, configurable: false }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },

  // Purchase Management
  {
    id: 'purchase_advanced',
    name: 'Purchase Management Pro',
    description: 'Advanced procurement with RFQ, vendor management, and automated workflows',
    version: '2.5.0',
    category: 'purchase',
    icon: 'ShoppingCart',
    status: 'active',
    features: [
      'Material Request Management',
      'RFQ & Quotation Comparison',
      'Purchase Orders with Approval',
      'Supplier Management & Rating',
      'GRN (Goods Receipt Note)',
      'Purchase Analytics',
      'Automated Reordering',
      'Multi-currency Support'
    ],
    permissions: [
      { role: ['admin', 'md', 'purchase'], action: 'write' },
      { role: ['pm', 'supervisor'], action: 'read' }
    ],
    dependencies: [
      { moduleId: 'inventory_core', required: true }
    ],
    routes: {
      main: '/purchase',
      admin: '/purchase/setup',
      reports: '/purchase/reports'
    },
    collections: ['material_requests', 'purchase_requests', 'enquiries', 'purchase_orders', 'grn', 'suppliers'],
    apiEndpoints: ['/api/purchase/create-po', '/api/purchase/approve', '/api/purchase/grn'],
    widgets: [
      { id: 'purchase_pipeline', name: 'Purchase Pipeline', type: 'kanban', defaultSize: { w: 8, h: 4 }, configurable: false },
      { id: 'supplier_performance', name: 'Supplier Performance', type: 'chart', defaultSize: { w: 4, h: 3 }, configurable: true }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },

  // Quality Management
  {
    id: 'quality_management',
    name: 'Quality Control',
    description: 'Quality inspection, non-conformance tracking, and CAPA management',
    version: '1.5.0',
    category: 'quality',
    icon: 'CheckCircle',
    status: 'active',
    features: [
      'Inspection Plans',
      'Quality Checks (IQC/IPQC/FQC)',
      'Non-Conformance Reports (NCR)',
      'CAPA Management',
      'Quality Analytics',
      'Supplier Quality Rating'
    ],
    permissions: [
      { role: ['admin', 'md', 'quality'], action: 'write' },
      { role: ['supervisor', 'employee'], action: 'read' }
    ],
    dependencies: [
      { moduleId: 'inventory_core', required: true },
      { moduleId: 'manufacturing_core', required: false }
    ],
    routes: {
      main: '/quality',
      admin: '/quality/setup',
      reports: '/quality/reports'
    },
    collections: ['inspection_plans', 'quality_checks', 'ncr', 'capa'],
    widgets: [
      { id: 'quality_metrics', name: 'Quality Metrics', type: 'kpi', defaultSize: { w: 4, h: 2 }, configurable: false },
      { id: 'defect_pareto', name: 'Defect Analysis', type: 'chart', defaultSize: { w: 6, h: 3 }, configurable: true }
    ],
    author: 'Triovision',
    license: 'Proprietary',
    status: 'beta'
  },

  // Sales & CRM
  {
    id: 'sales_crm',
    name: 'Sales & CRM',
    description: 'Customer management, quotations, sales orders, and delivery management',
    version: '1.8.0',
    category: 'sales',
    icon: 'TrendingUp',
    status: 'active',
    features: [
      'Customer Management',
      'Lead & Opportunity Tracking',
      'Quotation Management',
      'Sales Order Processing',
      'Delivery Challan',
      'Invoicing',
      'Payment Tracking',
      'Sales Analytics'
    ],
    permissions: [
      { role: ['admin', 'md', 'sales'], action: 'write' },
      { role: ['customer'], action: 'read' }
    ],
    dependencies: [
      { moduleId: 'inventory_core', required: true }
    ],
    routes: {
      main: '/customer',
      admin: '/dispatch',
      reports: '/sales/reports'
    },
    collections: ['customers', 'leads', 'quotations', 'sales_orders', 'delivery_challans', 'invoices'],
    widgets: [
      { id: 'sales_funnel', name: 'Sales Funnel', type: 'funnel', defaultSize: { w: 4, h: 4 }, configurable: false },
      { id: 'revenue_chart', name: 'Revenue Trends', type: 'chart', defaultSize: { w: 6, h: 3 }, configurable: true }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },

  // HR Management
  {
    id: 'hr_management',
    name: 'Human Resources',
    description: 'Employee management, attendance, leave, payroll, and performance tracking',
    version: '1.6.0',
    category: 'hr',
    icon: 'Users',
    status: 'active',
    features: [
      'Employee Database',
      'Attendance Tracking',
      'Leave Management',
      'Payroll Processing',
      'Performance Reviews',
      'Training Management',
      'Recruitment'
    ],
    permissions: [
      { role: ['admin', 'hr'], action: 'write' },
      { role: ['md', 'manager'], action: 'read' }
    ],
    dependencies: [],
    routes: {
      main: '/hr',
      admin: '/employees',
      reports: '/hr/reports'
    },
    collections: ['employees', 'attendance', 'leaves', 'payroll', 'performance_reviews'],
    widgets: [
      { id: 'headcount', name: 'Headcount Overview', type: 'kpi', defaultSize: { w: 3, h: 2 }, configurable: false },
      { id: 'attendance_chart', name: 'Attendance Trends', type: 'chart', defaultSize: { w: 5, h: 3 }, configurable: true }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },

  // Finance & Accounting
  {
    id: 'finance_accounting',
    name: 'Finance & Accounting',
    description: 'Complete accounting with general ledger, accounts payable/receivable, and financial reports',
    version: '1.0.0',
    category: 'finance',
    icon: 'DollarSign',
    status: 'beta',
    features: [
      'General Ledger',
      'Accounts Payable',
      'Accounts Receivable',
      'Bank Reconciliation',
      'Financial Statements',
      'Budgeting',
      'Tax Management',
      'Multi-currency'
    ],
    permissions: [
      { role: ['admin', 'finance', 'md'], action: 'write' },
      { role: ['manager'], action: 'read' }
    ],
    dependencies: [],
    routes: {
      main: '/finance',
      admin: '/finance/setup',
      reports: '/finance/reports'
    },
    collections: ['accounts', 'journal_entries', 'invoices', 'payments', 'budgets'],
    widgets: [
      { id: 'cash_flow', name: 'Cash Flow', type: 'chart', defaultSize: { w: 6, h: 3 }, configurable: true },
      { id: 'profit_loss', name: 'P&L Summary', type: 'kpi', defaultSize: { w: 4, h: 2 }, configurable: false }
    ],
    author: 'Triovision',
    license: 'Proprietary',
    status: 'beta'
  },

  // Maintenance Management
  {
    id: 'maintenance_management',
    name: 'Maintenance Management',
    description: 'Equipment maintenance, preventive maintenance scheduling, and breakdown tracking',
    version: '1.3.0',
    category: 'maintenance',
    icon: 'Wrench',
    status: 'active',
    features: [
      'Equipment Registry',
      'Preventive Maintenance',
      'Work Order Management',
      'Spare Parts Management',
      'Maintenance History',
      'Downtime Analytics'
    ],
    permissions: [
      { role: ['admin', 'md', 'maintenance'], action: 'write' },
      { role: ['supervisor'], action: 'read' }
    ],
    dependencies: [
      { moduleId: 'inventory_core', required: true }
    ],
    routes: {
      main: '/maintenance',
      admin: '/maintenance/setup',
      reports: '/maintenance/reports'
    },
    collections: ['equipment', 'maintenance_plans', 'maintenance_orders', 'breakdowns'],
    widgets: [
      { id: 'equipment_status', name: 'Equipment Status', type: 'kpi', defaultSize: { w: 4, h: 2 }, configurable: false },
      { id: 'mttr_mtbf', name: 'MTTR & MTBF', type: 'chart', defaultSize: { w: 6, h: 3 }, configurable: true }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },

  // Analytics & BI
  {
    id: 'analytics_bi',
    name: 'Analytics & Business Intelligence',
    description: 'Advanced analytics, custom dashboards, and AI-powered insights',
    version: '2.0.0',
    category: 'analytics',
    icon: 'BarChart3',
    status: 'active',
    features: [
      'Custom Dashboards',
      'Drag & Drop Widgets',
      'Real-time Analytics',
      'Predictive Analytics (AI)',
      'Custom Report Builder',
      'Scheduled Reports',
      'Export to PDF/Excel'
    ],
    permissions: [
      { role: ['admin', 'md', 'manager'], action: 'write' },
      { role: ['*'], action: 'read' }
    ],
    dependencies: [],
    routes: {
      main: '/md/analytics',
      admin: '/analytics/setup',
      reports: '/analytics/custom'
    },
    collections: ['dashboards', 'reports', 'analytics_cache'],
    widgets: [
      { id: 'custom_metric', name: 'Custom Metric', type: 'kpi', defaultSize: { w: 3, h: 2 }, configurable: true },
      { id: 'custom_chart', name: 'Custom Chart', type: 'chart', defaultSize: { w: 6, h: 4 }, configurable: true }
    ],
    author: 'Triovision',
    license: 'Proprietary'
  },

  // Integration Hub
  {
    id: 'integration_hub',
    name: 'Integration Hub',
    description: 'Connect with third-party systems via APIs, webhooks, and file imports',
    version: '1.5.0',
    category: 'integration',
    icon: 'Link',
    status: 'active',
    features: [
      'REST API',
      'Webhook Management',
      'n8n Workflows',
      'File Import/Export',
      'Email Integration',
      'SMS Notifications',
      'Third-party Connectors'
    ],
    permissions: [
      { role: ['admin'], action: 'admin' }
    ],
    dependencies: [],
    routes: {
      main: '/integrations',
      admin: '/integrations/setup'
    },
    apiEndpoints: ['/api/*'],
    collections: ['integrations', 'webhooks', 'api_keys'],
    author: 'Triovision',
    license: 'Proprietary'
  }
];

// Helper Functions
export const getModuleById = (id: string): ModuleConfig | undefined => {
  return MODULE_REGISTRY.find(m => m.id === id);
};

export const getModulesByCategory = (category: string): ModuleConfig[] => {
  return MODULE_REGISTRY.filter(m => m.category === category);
};

export const getActiveModules = (): ModuleConfig[] => {
  return MODULE_REGISTRY.filter(m => m.status === 'active');
};

export const getModulesForRole = (role: string): ModuleConfig[] => {
  return MODULE_REGISTRY.filter(module => 
    module.permissions.some(p => 
      p.role.includes(role) || p.role.includes('*')
    )
  );
};

export const MODULE_CATEGORIES = {
  manufacturing: { label: 'Manufacturing', icon: 'Factory', color: 'blue' },
  inventory: { label: 'Inventory', icon: 'Package', color: 'green' },
  purchase: { label: 'Purchase', icon: 'ShoppingCart', color: 'purple' },
  sales: { label: 'Sales', icon: 'TrendingUp', color: 'orange' },
  hr: { label: 'HR', icon: 'Users', color: 'pink' },
  finance: { label: 'Finance', icon: 'DollarSign', color: 'yellow' },
  quality: { label: 'Quality', icon: 'CheckCircle', color: 'teal' },
  maintenance: { label: 'Maintenance', icon: 'Wrench', color: 'red' },
  analytics: { label: 'Analytics', icon: 'BarChart3', color: 'indigo' },
  integration: { label: 'Integration', icon: 'Link', color: 'gray' }
};
