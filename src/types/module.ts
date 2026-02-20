/**
 * Module System Types
 * Enterprise-grade modular architecture for competing with Odoo
 */

export type ModuleCategory = 
  | 'manufacturing'
  | 'inventory'
  | 'purchase'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'quality'
  | 'maintenance'
  | 'analytics'
  | 'integration';

export type ModuleStatus = 'active' | 'inactive' | 'disabled' | 'beta';

export interface ModulePermission {
  role: string[];
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface ModuleDependency {
  moduleId: string;
  version?: string;
  required: boolean;
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ModuleCategory;
  icon: string;
  status: ModuleStatus;
  
  // Features
  features: string[];
  
  // Access Control
  permissions: ModulePermission[];
  
  // Dependencies
  dependencies: ModuleDependency[];
  
  // Routes
  routes: {
    main: string;
    admin?: string;
    reports?: string;
  };
  
  // Database Collections
  collections?: string[];
  
  // API Endpoints
  apiEndpoints?: string[];
  
  // Widgets (for dashboard)
  widgets?: ModuleWidget[];
  
  // Metadata
  author: string;
  license: string;
  price?: number;
  installDate?: string;
  lastUpdate?: string;
}

export interface ModuleWidget {
  id: string;
  name: string;
  type: 'chart' | 'kpi' | 'table' | 'list' | 'calendar' | 'kanban';
  defaultSize: { w: number; h: number };
  configurable: boolean;
  dataSource?: string;
}

// Analytics & Reporting Types
export interface AnalyticsWidget {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'metric' | 'table' | 'funnel';
  dataSource: string;
  filters?: AnalyticsFilter[];
  config: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number; // seconds
}

export interface AnalyticsFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
  label?: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  userId: string;
  widgets: AnalyticsWidget[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Notification System Types
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  category: 'system' | 'workflow' | 'approval' | 'deadline' | 'stock' | 'quality' | 'custom';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  isPinned: boolean;
  createdAt: string;
  expiresAt?: string;
}

// Workflow Automation Types
export interface WorkflowTrigger {
  id: string;
  type: 'event' | 'schedule' | 'manual' | 'webhook';
  event?: string; // e.g., 'po_created', 'stock_low', 'approval_pending'
  schedule?: {
    cron: string;
    timezone: string;
  };
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id: string;
  type: 'email' | 'notification' | 'webhook' | 'update' | 'create' | 'approve' | 'reject' | 'assign';
  config: Record<string, any>;
  order: number;
  continueOnError: boolean;
}

export interface WorkflowAutomation {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  runCount: number;
  successCount: number;
  errorCount: number;
}

// Report Builder Types
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  type: 'tabular' | 'pivot' | 'chart' | 'custom';
  dataSource: string;
  fields: ReportField[];
  filters?: AnalyticsFilter[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  chartConfig?: {
    type: string;
    xAxis: string;
    yAxis: string[];
  };
  exportFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  schedule?: {
    enabled: boolean;
    cron: string;
    recipients: string[];
  };
  createdBy: string;
  createdAt: string;
}

export interface ReportField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  format?: string;
  visible: boolean;
}

// Integration Types
export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'database' | 'file' | 'email' | 'sms';
  provider: string;
  isActive: boolean;
  credentials: Record<string, any>;
  endpoints?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
  }[];
  syncConfig?: {
    direction: 'import' | 'export' | 'bidirectional';
    frequency: string;
    lastSync?: string;
  };
}

// System Configuration
export interface SystemConfig {
  companyName: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStart: string;
  multiCompany: boolean;
  enableModules: string[];
  features: {
    workflows: boolean;
    analytics: boolean;
    api: boolean;
    mobileApp: boolean;
    ai: boolean;
  };
}
