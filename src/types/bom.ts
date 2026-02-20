// BOM (Bill of Materials) Type Definitions for Advanced Manufacturing System

export enum BOMStatus {
  DRAFT = 'draft',
  PM_REVIEW = 'pm_review',
  PM_APPROVED = 'pm_approved',
  MD_REVIEW = 'md_review',
  MD_APPROVED = 'md_approved',
  REJECTED = 'rejected',
  IN_PRODUCTION = 'in_production',
  COMPLETED = 'completed'
}

export enum ComponentCategory {
  RAW_MATERIAL = 'raw_material',
  CONSUMABLE = 'consumable',
  HARDWARE = 'hardware',
  ELECTRICAL = 'electrical',
  MECHANICAL = 'mechanical',
  CHEMICAL = 'chemical',
  TOOL = 'tool',
  PACKAGING = 'packaging'
}

export enum IndentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FULFILLED = 'fulfilled'
}

// Customer Requirement Interface
export interface CustomerRequirement {
  id: string;
  customerId: string;
  customerName: string;
  projectName: string;
  productType: string;
  specifications: {
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    };
    material?: string;
    finish?: string;
    color?: string;
    weight?: number;
    customSpecs?: Record<string, any>;
  };
  quantity: number;
  deadline?: Date;
  attachments?: string[];
  rawText?: string; // For AI parsing
  createdAt: Date;
  createdBy: string;
  status: 'pending' | 'processing' | 'bom_generated' | 'completed';
}

// BOM Component/Item
export interface BOMComponent {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  category: ComponentCategory;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
  supplierId?: string;
  leadTime?: number; // in days
  availableStock: number;
  requiredStock: number;
  stockStatus: 'available' | 'partial' | 'unavailable';
  alternativeItems?: string[]; // Alternative item codes
  isOptional: boolean;
  notes?: string;
}

// Main BOM Document
export interface BOM {
  id: string;
  bomNumber: string; // Auto-generated: BOM-2026-001
  version: number; // Revision tracking
  status: BOMStatus;
  
  // Customer & Project Info
  requirementId: string;
  customerId: string;
  customerName: string;
  projectName: string;
  projectId?: string;
  
  // Components
  components: BOMComponent[];
  
  // Pricing & Costing
  pricing: {
    totalMaterialCost: number;
    laborCost: number;
    overheadCost: number;
    toolingCost: number;
    totalCost: number;
    sellingPrice: number;
    profitAmount: number;
    profitMargin: number; // percentage
    gst: number;
    finalPrice: number;
  };
  
  // Workflow Tracking
  workflow: {
    createdAt: Date;
    createdBy: string;
    createdByName: string;
    
    pmReviewedAt?: Date;
    pmReviewedBy?: string;
    pmReviewedByName?: string;
    pmComments?: string;
    
    mdReviewedAt?: Date;
    mdReviewedBy?: string;
    mdReviewedByName?: string;
    mdComments?: string;
    mdApprovalDate?: Date;
    
    rejectionReason?: string;
    rejectedAt?: Date;
    rejectedBy?: string;
  };
  
  // Revision History
  revisions: BOMRevision[];
  
  // Production Planning
  estimatedProductionTime?: number; // in days
  departments?: string[];
  
  // Attachments
  attachments?: {
    drawings?: string[];
    specs?: string[];
    references?: string[];
  };
  
  // Purchase Order Integration
  linkedPurchaseOrders?: string[]; // PO IDs generated from this BOM
  purchaseOrdersGenerated?: boolean;
  purchaseOrderGeneratedAt?: Date;
  totalPurchaseValue?: number;
  
  // Project Tracking
  projectId?: string;
  materialsIssued?: boolean;
  materialsIssuedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// BOM Revision/Version History
export interface BOMRevision {
  revisionNumber: number;
  revisedBy: string;
  revisedByName: string;
  revisedAt: Date;
  changes: string;
  reason: string;
  previousData?: Partial<BOM>;
}

// Stock Availability Report
export interface StockAvailabilityReport {
  bomId: string;
  bomNumber: string;
  generatedAt: Date;
  generatedBy: string;
  
  summary: {
    totalItems: number;
    availableItems: number;
    partialItems: number;
    unavailableItems: number;
    readyForProduction: boolean;
  };
  
  items: {
    component: BOMComponent;
    currentStock: number;
    requiredQuantity: number;
    shortfall: number;
    estimatedCost: number;
    suggestedSupplier?: string;
    estimatedDelivery?: number; // days
  }[];
}

// Purchase Order generated from BOM
export interface BOMPurchaseOrder {
  id: string;
  poNumber: string;
  bomId: string;
  bomNumber: string;
  supplierId: string;
  supplierName: string;
  
  items: {
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  
  totalAmount: number;
  gst: number;
  finalAmount: number;
  
  deliveryDate: Date;
  createdAt: Date;
  createdBy: string;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled';
}

// Indent Form (Request for additional materials)
export interface IndentForm {
  id: string;
  indentNumber: string; // IND-2026-001
  type: 'indent' | 'deviation';
  
  // Reference
  bomId?: string;
  bomNumber?: string;
  projectId?: string;
  projectName?: string;
  workOrderId?: string;
  
  // Requester Info
  requestedBy: string;
  requestedByName: string;
  department: string;
  requestDate: Date;
  
  // Items
  items: {
    itemCode: string;
    itemName: string;
    specification: string;
    quantity: number;
    unit: string;
    estimatedPrice?: number;
    reason: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }[];
  
  // Approval Chain
  approvals: {
    supervisorApproved?: boolean;
    supervisorApprovedBy?: string;
    supervisorApprovedAt?: Date;
    supervisorComments?: string;
    
    pmApproved?: boolean;
    pmApprovedBy?: string;
    pmApprovedAt?: Date;
    pmComments?: string;
    
    storeApproved?: boolean;
    storeApprovedBy?: string;
    storeApprovedAt?: Date;
    storeComments?: string;
  };
  
  status: IndentStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  justification: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Deviation Form (Changes to approved BOM)
export interface DeviationForm extends IndentForm {
  type: 'deviation';
  deviationType: 'material_substitute' | 'quantity_change' | 'new_item' | 'specification_change';
  originalComponent?: BOMComponent;
  proposedComponent?: BOMComponent;
  costImpact: number;
  scheduleImpact?: number; // days
  technicalJustification: string;
  mdApprovalRequired: boolean;
}

// AI Suggestion for BOM Generation
export interface BOMSuggestion {
  confidence: number; // 0-1
  suggestedComponents: BOMComponent[];
  alternativeOptions?: BOMComponent[][];
  estimatedCost: number;
  estimatedTime: number;
  reasoning?: string;
  matchedPatterns?: string[];
  historicalReference?: string[]; // Similar past projects
}

// BOM Template for common products
export interface BOMTemplate {
  id: string;
  templateName: string;
  productType: string;
  category: string;
  description: string;
  baseComponents: BOMComponent[];
  variableParameters?: {
    name: string;
    type: 'number' | 'string' | 'select';
    options?: string[];
    defaultValue?: any;
    affectsComponents?: string[]; // component IDs
  }[];
  createdAt: Date;
  createdBy: string;
  usageCount: number;
  averageCost: number;
}

// Analytics & Reports
export interface BOMAnalytics {
  totalBOMs: number;
  bomsByStatus: Record<BOMStatus, number>;
  averageApprovalTime: number; // days
  totalProjectValue: number;
  averageProfitMargin: number;
  topComponents: {
    itemCode: string;
    itemName: string;
    usageCount: number;
    totalCost: number;
  }[];
  supplierPerformance: {
    supplierId: string;
    supplierName: string;
    bomsSupplied: number;
    onTimeDelivery: number;
    averageLeadTime: number;
  }[];
}
