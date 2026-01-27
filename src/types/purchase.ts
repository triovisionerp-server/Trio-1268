// ==========================================
// PURCHASE ORDER & INVENTORY TYPES
// ==========================================

// Inventory Item
export interface InventoryItem {
  id: string;
  itemID: string;
  name: string;
  code: string;
  category: 'Raw Material' | 'Consumable' | 'Tool' | 'Safety Equipment';
  currentStock: number;
  minLevel: number;
  unit: string;
  location: string;
  lastUpdated: string;
}

// Vendor/Supplier Details
export interface VendorDetails {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
}

// PO Line Item
export interface POItem {
  itemID: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

// Purchase Order Status
export type POStatus = 
  | 'draft' 
  | 'pending_md_approval' 
  | 'approved' 
  | 'rejected' 
  | 'partially_received'
  | 'received' 
  | 'cancelled';

// Purchase Order
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorDetails: VendorDetails;
  items: POItem[];
  totalAmount: number;
  status: POStatus;
  requiresMDApproval: boolean;
  mdApprovalLink?: string;
  mdApprovalSignature?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expectedDelivery?: string;
  notes?: string;
}

// Goods Receipt Note (GRN)
export interface GRNItem {
  itemID: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  remarks?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  poID: string;
  poNumber: string;
  vendorName: string;
  items: GRNItem[];
  totalReceivedValue: number;
  receivedBy: string;
  receivedAt: string;
  status: 'pending' | 'verified' | 'completed';
  invoiceNumber?: string;
  invoiceDate?: string;
  remarks?: string;
}

// Store Incoming Order (View for Store page)
export interface IncomingOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  items: POItem[];
  totalAmount: number;
  status: POStatus;
  expectedDelivery?: string;
  createdAt: string;
  canReceive: boolean; // true only if status === 'approved'
}

// MD Approval threshold
export const MD_APPROVAL_THRESHOLD = 50000; // ₹50,000

// Firebase Collection Names
export const COLLECTIONS = {
  INVENTORY: 'inventory',
  PURCHASE_ORDERS: 'purchase_orders',
  GOODS_RECEIPTS: 'goods_receipts',
  VENDORS: 'vendors',
} as const;
