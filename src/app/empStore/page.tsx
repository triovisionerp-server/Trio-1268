'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus, X, Download, Edit2, Trash2, Package,
  Building2, BarChart3, AlertTriangle, DollarSign, Search,
  History, Clock, CheckCircle2, RefreshCw, FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';

// Firebase Collection Names (shared with Purchase/Store pages)
const FB_MATERIALS = 'inventory_materials';
const FB_SUPPLIERS = 'inventory_suppliers';

// --- Types ---
type Category = 'Raw Material' | 'Consumable' | 'Tool' | 'Safety Equipment';

interface Project {
  id: string;
  name: string;
}

interface StockItem {
  id: string;
  code: string;
  materialName: string; // Used in Stock Updates
  name?: string;        // Used in Materials Tab (normalized to materialName in logic)
  category?: Category;
  supplierName: string; // Used in Stock Updates
  supplier?: string;    // Used in Materials Tab
  rate: number;         // Used in Stock Updates
  purchasePrice?: number; // Used in Materials Tab
  uom: string;
  openingStock: number;
  inword: number;
  currentStock?: number; // Calculated
  minStock?: number;
  projects: Record<string, number>;
  rdUsage: number;
  internalUsage: number;
  newFactoryUsage: number;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  gst: string;
  address: string;
  city: string;
  phone: string;
}

// Audit Trail Interface
interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ISSUE' | 'PURCHASE';
  entityType: 'Material' | 'Supplier' | 'Project' | 'Stock';
  entityName: string;
  details: string;
  user: string;
}

// Animation variants for smooth transitions
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

const tableRowVariant = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const modalVariant = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

// ==========================================
// SAMPLE DATA FOR COMPOSITES MANUFACTURING
// ==========================================
const SAMPLE_SUPPLIERS: Supplier[] = [
  { id: 'sup1', name: 'Sivaa Enterprises', contact: 'Rajesh Kumar', email: 'sivaa@email.com', gst: '33AABCS1234A1Z5', address: 'Industrial Area', city: 'Chennai', phone: '9876543210' },
  { id: 'sup2', name: 'M/S SS.Enterprises', contact: 'Suresh Singh', email: 'ssenterprise@email.com', gst: '33AABCM5678B2Y6', address: 'MIDC Pune', city: 'Pune', phone: '9876543211' },
  { id: 'sup3', name: 'Windinso Engineering Private Limited', contact: 'Priya Sharma', email: 'windinso@email.com', gst: '33AABCW9012C3X7', address: 'Tech Park', city: 'Bangalore', phone: '9876543212' },
  { id: 'sup4', name: 'Huntsman Chemicals', contact: 'Amit Patel', email: 'huntsman@email.com', gst: '33AABCH3456D4W8', address: 'Chemical Zone', city: 'Mumbai', phone: '9876543213' },
  { id: 'sup5', name: 'Owens Corning India', contact: 'Deepak Verma', email: 'owens@email.com', gst: '33AABCO7890E5V9', address: 'Industrial Hub', city: 'Ahmedabad', phone: '9876543214' },
];

const SAMPLE_PROJECTS: Project[] = [
  { id: 'proj1', name: 'Project A' },
  { id: 'proj2', name: 'Project B' },
  { id: 'proj3', name: 'Project C' },
  { id: 'proj4', name: 'Project D' },
];

const SAMPLE_MATERIALS: StockItem[] = [
  // RESINS & CHEMICALS
  { id: '1', code: 'RES-001', materialName: 'Epoxy Resin LY556', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 450, uom: 'Kg', openingStock: 500, inword: 0, minStock: 100, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '2', code: 'RES-002', materialName: 'Polyester Resin', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 280, uom: 'Kg', openingStock: 800, inword: 0, minStock: 150, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '3', code: 'RES-003', materialName: 'Vinyl Ester Resin', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 520, uom: 'Kg', openingStock: 300, inword: 0, minStock: 80, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '4', code: 'HRD-001', materialName: 'Hardener HY951', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 380, uom: 'Kg', openingStock: 200, inword: 0, minStock: 50, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '5', code: 'CAT-001', materialName: 'MEKP Catalyst', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 420, uom: 'Liters', openingStock: 100, inword: 0, minStock: 25, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '6', code: 'GEL-001', materialName: 'Gelcoat White', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 350, uom: 'Kg', openingStock: 400, inword: 0, minStock: 100, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '7', code: 'GEL-002', materialName: 'Gelcoat Clear', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 380, uom: 'Kg', openingStock: 250, inword: 0, minStock: 60, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  
  // FIBER & MATS
  { id: '8', code: 'FIB-001', materialName: 'E-Glass Fiber Mat 300gsm', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 180, uom: 'Kg', openingStock: 1000, inword: 0, minStock: 200, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '9', code: 'FIB-002', materialName: 'E-Glass Fiber Mat 450gsm', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 195, uom: 'Kg', openingStock: 800, inword: 0, minStock: 150, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '10', code: 'FIB-003', materialName: 'Carbon Fiber 3K Twill', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 2800, uom: 'Meters', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '11', code: 'FIB-004', materialName: 'Woven Roving 600gsm', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 220, uom: 'Kg', openingStock: 600, inword: 0, minStock: 120, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '12', code: 'FIB-005', materialName: 'Chopped Strand Mat', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 160, uom: 'Kg', openingStock: 500, inword: 0, minStock: 100, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  
  // CORE MATERIALS
  { id: '13', code: 'COR-001', materialName: 'PVC Foam Core 10mm', category: 'Raw Material', supplierName: 'Windinso Engineering Private Limited', rate: 850, uom: 'Pieces', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '14', code: 'COR-002', materialName: 'Balsa Wood Core', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 1200, uom: 'Pieces', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '15', code: 'COR-003', materialName: 'Honeycomb Core Aluminium', category: 'Raw Material', supplierName: 'Windinso Engineering Private Limited', rate: 1800, uom: 'Pieces', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  
  // RELEASE AGENTS & CONSUMABLES
  { id: '16', code: 'REL-001', materialName: 'Mold Release Wax', category: 'Consumable', supplierName: 'Sivaa Enterprises', rate: 650, uom: 'Kg', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '17', code: 'REL-002', materialName: 'PVA Release Film', category: 'Consumable', supplierName: 'Sivaa Enterprises', rate: 280, uom: 'Liters', openingStock: 80, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '18', code: 'CON-001', materialName: 'Acetone (Cleaning)', category: 'Consumable', supplierName: 'Sivaa Enterprises', rate: 120, uom: 'Liters', openingStock: 200, inword: 0, minStock: 50, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '19', code: 'CON-002', materialName: 'Styrene Monomer', category: 'Consumable', supplierName: 'Huntsman Chemicals', rate: 180, uom: 'Liters', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  
  // TOOLS & EQUIPMENT
  { id: '20', code: 'TL-001', materialName: 'Roller Brush 4"', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 85, uom: 'Pieces', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '21', code: 'TL-002', materialName: 'Cutting Wheels 4"', category: 'Tool', supplierName: 'Sivaa Enterprises', rate: 45, uom: 'Pieces', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '22', code: 'TL-003', materialName: 'Grinding Wheel 4"', category: 'Tool', supplierName: 'Sivaa Enterprises', rate: 65, uom: 'Pieces', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '23', code: 'TL-004', materialName: 'Mixing Buckets 20L', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 120, uom: 'Pieces', openingStock: 30, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  
  // SAFETY EQUIPMENT
  { id: '24', code: 'SAF-001', materialName: 'Nitrile Gloves (Box)', category: 'Safety Equipment', supplierName: 'Sivaa Enterprises', rate: 450, uom: 'Boxes', openingStock: 20, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '25', code: 'SAF-002', materialName: 'Respirator Mask N95', category: 'Safety Equipment', supplierName: 'M/S SS.Enterprises', rate: 85, uom: 'Pieces', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '26', code: 'SAF-003', materialName: 'Safety Goggles', category: 'Safety Equipment', supplierName: 'M/S SS.Enterprises', rate: 150, uom: 'Pieces', openingStock: 40, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '27', code: 'SAF-004', materialName: 'Disposable Coverall', category: 'Safety Equipment', supplierName: 'Sivaa Enterprises', rate: 180, uom: 'Pieces', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  
  // ADHESIVES & FILLERS
  { id: '28', code: 'ADH-001', materialName: 'Structural Adhesive', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 780, uom: 'Kg', openingStock: 60, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '29', code: 'FIL-001', materialName: 'Microballoon Filler', category: 'Raw Material', supplierName: 'Windinso Engineering Private Limited', rate: 320, uom: 'Kg', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '30', code: 'FIL-002', materialName: 'Talcum Powder', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 45, uom: 'Kg', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // EPOXY HARDENERS & RESINS
  { id: '31', code: 'HRD-002', materialName: 'ARADUR HY 951-30KG PACK', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 850, uom: 'Kg', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '32', code: 'RES-004', materialName: 'ARALDITE CY 230-1 IN 110 KG Q2', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 920, uom: 'Kg', openingStock: 220, inword: 0, minStock: 50, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '33', code: 'CHM-001', materialName: 'AEROSIL', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 450, uom: 'Kg', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // THERMOCOLE BLOCKS
  { id: '34', code: 'THR-001', materialName: 'THERMOCOLE BLOCK HD40 kg :2000 x1000 x500MM', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 1200, uom: 'Pieces', openingStock: 30, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '35', code: 'THR-002', materialName: 'THERMOCOLE BLOCK HD40 kg :2000 x1000 x600MM', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 1400, uom: 'Pieces', openingStock: 25, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // CASTER WHEELS
  { id: '36', code: 'CST-001', materialName: 'Caster Wheels(Swivel) 8x2 (150kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 350, uom: 'Pieces', openingStock: 40, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '37', code: 'CST-002', materialName: 'Caster Wheels(Swivel with lock) 8x2 (150kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 420, uom: 'Pieces', openingStock: 40, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '38', code: 'CST-003', materialName: 'Caster Wheels(Swivel) 6x2 (500kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 580, uom: 'Pieces', openingStock: 30, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '39', code: 'CST-004', materialName: 'Caster Wheels(Swivel with lock) 6x2 (500kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 650, uom: 'Pieces', openingStock: 30, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '40', code: 'CST-005', materialName: 'Caster Wheels(Swivel) 6x2 (200g)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 280, uom: 'Pieces', openingStock: 50, inword: 0, minStock: 12, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '41', code: 'CST-006', materialName: 'Caster Wheels(Swivel with lock) 6x2 (200kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 350, uom: 'Pieces', openingStock: 50, inword: 0, minStock: 12, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '42', code: 'CST-007', materialName: 'Caster Wheels(Swivel) 4x2 (150kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 220, uom: 'Pieces', openingStock: 60, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '43', code: 'CST-008', materialName: 'Caster Wheels(Swivel lock 4x2 (150kg)', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 280, uom: 'Pieces', openingStock: 60, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '44', code: 'CST-009', materialName: '8x2 SW Nylon Pu Castor-200Kg Cap', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 480, uom: 'Pieces', openingStock: 35, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '45', code: 'CST-010', materialName: '8x2 SWBK Nylon Pu Castor - 200Kg Cap', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 550, uom: 'Pieces', openingStock: 35, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '46', code: 'CST-011', materialName: '8x2 SW CIPU Castor - 500kg Cap', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 720, uom: 'Pieces', openingStock: 25, inword: 0, minStock: 6, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '47', code: 'CST-012', materialName: '8x2 SWBK CIPU Castor -500Kg Cap', category: 'Tool', supplierName: 'M/S SS.Enterprises', rate: 820, uom: 'Pieces', openingStock: 25, inword: 0, minStock: 6, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // PACKAGING & SEALING
  { id: '48', code: 'PKG-001', materialName: 'Stretch film', category: 'Consumable', supplierName: 'Sivaa Enterprises', rate: 180, uom: 'Pieces', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '49', code: 'PKG-002', materialName: 'VACUUM FILM-75MIC-4368MM W X58 MTR L', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 2500, uom: 'Pieces', openingStock: 15, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '50', code: 'SEL-001', materialName: 'SEALENT TAPE-ANABOND-12MMX3MMX15MTR', category: 'Consumable', supplierName: 'Sivaa Enterprises', rate: 320, uom: 'Pieces', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // PIGMENTS & COLORS (RAL)
  { id: '51', code: 'PIG-001', materialName: 'DEEP ORANGE HL 2011', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 650, uom: 'Kg', openingStock: 20, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '52', code: 'PIG-002', materialName: 'SKY BLUE HL RAL-5015', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 680, uom: 'Kg', openingStock: 20, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '53', code: 'PIG-003', materialName: '9010 PURE WHITE HL / 9003', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 580, uom: 'Kg', openingStock: 30, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '54', code: 'PIG-004', materialName: 'pigment yellow(RAL-1018)', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 620, uom: 'Kg', openingStock: 18, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '55', code: 'PIG-005', materialName: 'RAL-6018 YELLOW GREEN', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 650, uom: 'Kg', openingStock: 15, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '56', code: 'PIG-006', materialName: 'RAL-9005 HL', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 600, uom: 'Kg', openingStock: 25, inword: 0, minStock: 6, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '57', code: 'PIG-007', materialName: 'RAL-5002 HL', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 680, uom: 'Kg', openingStock: 18, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '58', code: 'PIG-008', materialName: 'LIGT GERY 7035', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 590, uom: 'Kg', openingStock: 22, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '59', code: 'PIG-009', materialName: 'LIGHT IVORY RAL 1015', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 610, uom: 'Kg', openingStock: 20, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '60', code: 'PIG-010', materialName: 'RAL-7001 SILVER GREY', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 640, uom: 'Kg', openingStock: 18, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '61', code: 'PIG-011', materialName: 'RAL-3020 HL RED', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 700, uom: 'Kg', openingStock: 15, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '62', code: 'PIG-012', materialName: 'SURLPHUR YELLOW HLRAL-1016', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 630, uom: 'Kg', openingStock: 16, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '63', code: 'PIG-013', materialName: 'RAL-8017 P (CHOCOLATE BROWN HL', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 660, uom: 'Kg', openingStock: 14, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // SEALS & ADAPTERS
  { id: '64', code: 'SLS-001', materialName: '6319-Universal injection adapter- 10 mm', category: 'Tool', supplierName: 'Windinso Engineering Private Limited', rate: 450, uom: 'Pieces', openingStock: 30, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '65', code: 'SLS-002', materialName: '6316-Universal Insert With Clip', category: 'Tool', supplierName: 'Windinso Engineering Private Limited', rate: 380, uom: 'Pieces', openingStock: 40, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '66', code: 'SLS-003', materialName: 'Wing Seal Dummy', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 220, uom: 'Meters', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '67', code: 'SLS-004', materialName: 'Dynamic Seal Dummy', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 250, uom: 'Meters', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '68', code: 'SLS-005', materialName: 'Resin Channel', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 180, uom: 'Meters', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '69', code: 'SLS-006', materialName: 'Wing Seal', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 280, uom: 'Meters', openingStock: 120, inword: 0, minStock: 25, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '70', code: 'SLS-007', materialName: 'Dynamic Seal', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 320, uom: 'Meters', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '71', code: 'SLS-008', materialName: 'Round Cord Seal 10mm', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 150, uom: 'Meters', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '72', code: 'SLS-009', materialName: 'Cord Dummy Seal 10mm', category: 'Consumable', supplierName: 'Windinso Engineering Private Limited', rate: 130, uom: 'Meters', openingStock: 180, inword: 0, minStock: 35, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // FILLERS & CHEMICALS
  { id: '73', code: 'CHM-002', materialName: 'Aluminum Trihydrate (ATH)', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 85, uom: 'Kg', openingStock: 500, inword: 0, minStock: 100, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // GELCOATS & RESINS (NORPOL/REICHHOLD)
  { id: '74', code: 'GEL-003', materialName: 'Norpol GM 60014 S E', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 520, uom: 'Kg', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '75', code: 'GEL-004', materialName: 'Vinylester Tooling Gelcoat(Reichhold)-RED', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 680, uom: 'Kg', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '76', code: 'RES-005', materialName: 'Dion Impact 9100-700', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 750, uom: 'Kg', openingStock: 120, inword: 0, minStock: 25, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '77', code: 'RES-006', materialName: 'Norpol® NGA 101 S; 0030Carboy', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 480, uom: 'Kg', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '78', code: 'RES-007', materialName: 'Polylite® PI-5720; 0035Carboy', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 420, uom: 'Kg', openingStock: 130, inword: 0, minStock: 25, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // CSM & FIBER MATS
  { id: '79', code: 'FIB-006', materialName: 'CSM450', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 210, uom: 'Kg', openingStock: 400, inword: 0, minStock: 80, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '80', code: 'FIB-007', materialName: 'CSM 225', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 180, uom: 'Kg', openingStock: 350, inword: 0, minStock: 70, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '81', code: 'FIB-008', materialName: 'Surface mat', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 250, uom: 'Kg', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '82', code: 'FIB-009', materialName: 'WOVEN ROVING-610(1-MTR)', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 230, uom: 'Kg', openingStock: 300, inword: 0, minStock: 60, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '83', code: 'FIB-010', materialName: 'CSM M130 450 104 2ST Powder Banded Mat', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 240, uom: 'Kg', openingStock: 250, inword: 0, minStock: 50, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // COBALT ACCELERATORS
  { id: '84', code: 'CAT-002', materialName: '6% Cobalt', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 380, uom: 'Kg', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '85', code: 'CAT-003', materialName: '2% Cobalt', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 320, uom: 'Kg', openingStock: 60, inword: 0, minStock: 12, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // TOOLING & SPECIALTY RESINS
  { id: '86', code: 'RES-008', materialName: 'Zeroshink Tooling resin -1 ( 1301 Resin )', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 620, uom: 'Kg', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '87', code: 'RES-009', materialName: 'AYPOLS 9111', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 450, uom: 'Kg', openingStock: 120, inword: 0, minStock: 25, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '88', code: 'GEL-005', materialName: 'Vinyl Ester Resin Gelcoat-9110 ( 9111 Grade )', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 580, uom: 'Kg', openingStock: 90, inword: 0, minStock: 18, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '89', code: 'RES-010', materialName: 'Aypols 7111', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 420, uom: 'Kg', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '90', code: 'GEL-006', materialName: 'Aypols 7111 GC SP', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 480, uom: 'Kg', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '91', code: 'RES-011', materialName: 'UNSATURATED POLYESTER RESIN 9103', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 380, uom: 'Kg', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '92', code: 'RES-012', materialName: 'UNSATURATED POLYESTER RESINS9024 (primer)', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 350, uom: 'Kg', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '93', code: 'RES-013', materialName: 'UNSATURATED POLYESTER RESINS 9017)', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 360, uom: 'Kg', openingStock: 180, inword: 0, minStock: 35, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '94', code: 'CAT-004', materialName: 'MEKP(CATALYST)', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 420, uom: 'Liters', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // MS PIPES & STEEL TUBES
  { id: '95', code: 'STL-001', materialName: 'MS Pipes 100x100x2.9mm', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 180, uom: 'Meters', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '96', code: 'STL-002', materialName: 'steel Square Tube(1.5.x1.5)2.5MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 120, uom: 'Meters', openingStock: 300, inword: 0, minStock: 60, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '97', code: 'STL-003', materialName: 'steel Square Tube(2.x2. ) 2.5MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 150, uom: 'Meters', openingStock: 250, inword: 0, minStock: 50, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '98', code: 'STL-004', materialName: 'steel Square Tube(1.5.x2.5. ) 2.5MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 140, uom: 'Meters', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '99', code: 'STL-005', materialName: 'steel Square Tube(4x2. ) 2.5MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 220, uom: 'Meters', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '100', code: 'STL-006', materialName: 'steel Square Tube(75x75 )2.5MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 200, uom: 'Meters', openingStock: 180, inword: 0, minStock: 35, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '101', code: 'STL-007', materialName: 'steel Square Tube(1x1. )2.5MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 100, uom: 'Meters', openingStock: 350, inword: 0, minStock: 70, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '102', code: 'STL-008', materialName: 'MS Tube 70x70x3mm', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 190, uom: 'Meters', openingStock: 160, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '103', code: 'STL-009', materialName: 'Steel Flat Plate(6mm thick;100mm width)', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 85, uom: 'Kg', openingStock: 400, inword: 0, minStock: 80, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // MDF & PLYWOOD
  { id: '104', code: 'WD-001', materialName: 'MDF 17MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 65, uom: 'Pieces', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '105', code: 'WD-002', materialName: 'MDF 12MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 55, uom: 'Pieces', openingStock: 120, inword: 0, minStock: 25, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '106', code: 'WD-003', materialName: 'MDF 6MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 40, uom: 'Pieces', openingStock: 150, inword: 0, minStock: 30, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '107', code: 'WD-004', materialName: 'MDF 4MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 35, uom: 'Pieces', openingStock: 180, inword: 0, minStock: 35, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '108', code: 'WD-005', materialName: 'Plywood 18MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 85, uom: 'Pieces', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '109', code: 'WD-006', materialName: 'Plywood 18MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 85, uom: 'Pieces', openingStock: 80, inword: 0, minStock: 15, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '110', code: 'WD-007', materialName: 'Plywood 12MM', category: 'Raw Material', supplierName: 'M/S SS.Enterprises', rate: 70, uom: 'Pieces', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // EPOXY SYSTEMS (NOVOGEL/EPORUN/EPOCUR)
  { id: '111', code: 'EPX-001', materialName: 'NOVOGEL 200 PART A - EPOXY RESIN', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 780, uom: 'Kg', openingStock: 60, inword: 0, minStock: 12, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '112', code: 'EPX-002', materialName: 'NOVOGEL 200 PART B - EPOXY HARDNER', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 650, uom: 'Kg', openingStock: 40, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '113', code: 'EPX-003', materialName: 'EPORUN 2803', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 720, uom: 'Kg', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '114', code: 'EPX-004', materialName: 'EPOCUR 2201', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 680, uom: 'Kg', openingStock: 45, inword: 0, minStock: 9, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '115', code: 'FIB-011', materialName: 'STITCH BONDED GLASS FIBER FABERICS', category: 'Raw Material', supplierName: 'Owens Corning India', rate: 320, uom: 'Kg', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '116', code: 'PIG-014', materialName: 'GCVN RED X30000 VM13 IHBE', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 720, uom: 'Kg', openingStock: 12, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '117', code: 'EPX-005', materialName: 'NOVOGEL 200 PART A - EPOXY RESIN', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 780, uom: 'Kg', openingStock: 60, inword: 0, minStock: 12, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '118', code: 'EPX-006', materialName: 'NOVOGEL 200 PART B - EPOXY HARDNER', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 650, uom: 'Kg', openingStock: 40, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '119', code: 'EPX-007', materialName: 'EPORUN 2838LV', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 750, uom: 'Kg', openingStock: 55, inword: 0, minStock: 11, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '120', code: 'EPX-008', materialName: 'EPOCUR 2201', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 680, uom: 'Kg', openingStock: 45, inword: 0, minStock: 9, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '121', code: 'EPX-009', materialName: 'Eporun 2840', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 730, uom: 'Kg', openingStock: 50, inword: 0, minStock: 10, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '122', code: 'EPX-010', materialName: 'Epocur 2036', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 620, uom: 'Kg', openingStock: 40, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // CHEMICALS & ADDITIVES
  { id: '123', code: 'CHM-003', materialName: 'Boric Acid', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 120, uom: 'Kg', openingStock: 100, inword: 0, minStock: 20, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '124', code: 'CHM-004', materialName: 'Styrene', category: 'Raw Material', supplierName: 'Huntsman Chemicals', rate: 180, uom: 'Liters', openingStock: 200, inword: 0, minStock: 40, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '125', code: 'CON-003', materialName: 'Sticker Papers', category: 'Consumable', supplierName: 'Sivaa Enterprises', rate: 25, uom: 'Pieces', openingStock: 500, inword: 0, minStock: 100, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },

  // POLYESTER PIGMENTS (FT SERIES)
  { id: '126', code: 'PPG-001', materialName: 'FT01PY Bright White Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 520, uom: 'Kg', openingStock: 25, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '127', code: 'PPG-002', materialName: 'FT02PY Dense Black Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 550, uom: 'Kg', openingStock: 20, inword: 0, minStock: 5, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '128', code: 'PPG-003', materialName: 'FT04PY Inorganic Oxide Yellow Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 580, uom: 'Kg', openingStock: 18, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '129', code: 'PPG-004', materialName: 'FT05PY Inorganic Oxide Red Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 600, uom: 'Kg', openingStock: 15, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '130', code: 'PPG-005', materialName: 'FT06PY Inorganic Oxide Green Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 620, uom: 'Kg', openingStock: 14, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '131', code: 'PPG-006', materialName: 'FT07PY Inorganic Blue Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 640, uom: 'Kg', openingStock: 16, inword: 0, minStock: 4, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '132', code: 'PPG-007', materialName: 'FT08PY Organic Green Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 680, uom: 'Kg', openingStock: 12, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '133', code: 'PPG-008', materialName: 'FT09PY Organic Green Shade Blue Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 700, uom: 'Kg', openingStock: 10, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '134', code: 'PPG-009', materialName: 'FT11PY Organic Violet Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 720, uom: 'Kg', openingStock: 10, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '135', code: 'PPG-010', materialName: 'FT12PY Organic Green Shade Yellow Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 690, uom: 'Kg', openingStock: 12, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '136', code: 'PPG-011', materialName: 'FT13PY Organic Red Shade Yellow Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 710, uom: 'Kg', openingStock: 11, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '137', code: 'PPG-012', materialName: 'FT14PY Organic Orange Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 680, uom: 'Kg', openingStock: 13, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '138', code: 'PPG-013', materialName: 'FT15PY Organic Yellow Shade Red Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 700, uom: 'Kg', openingStock: 10, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '139', code: 'PPG-014', materialName: 'FT17PY Organic Magenta Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 750, uom: 'Kg', openingStock: 8, inword: 0, minStock: 2, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '140', code: 'PPG-015', materialName: 'FT18PY Organic Red Violet Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 740, uom: 'Kg', openingStock: 9, inword: 0, minStock: 2, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '141', code: 'PPG-016', materialName: 'FT19PY Organic Pink Polyester Pigment', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 720, uom: 'Kg', openingStock: 10, inword: 0, minStock: 3, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
  { id: '142', code: 'PPG-017', materialName: 'FT99PY Extender Polyester Paste', category: 'Raw Material', supplierName: 'Sivaa Enterprises', rate: 380, uom: 'Kg', openingStock: 30, inword: 0, minStock: 8, projects: {}, rdUsage: 0, internalUsage: 0, newFactoryUsage: 0, createdAt: new Date().toISOString() },
];

const EmployeeStore = () => {
  // --- State ---
  const isDarkMode = true; // Always dark theme
  const [activeTab, setActiveTab] = useState<'stock-updates' | 'materials' | 'suppliers' | 'analytics' | 'audit'>('stock-updates');
  
  // Data State
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Loading & Export State
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  
  // Form/Editing State
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StockItem> | Partial<Supplier>>({});
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'stock'>('name');

  // UI Feedback
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const initialized = React.useRef(false);

  // --- Audit Trail Function ---
  const logAudit = useCallback((action: AuditLog['action'], entityType: AuditLog['entityType'], entityName: string, details: string) => {
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityName,
      details,
      user: 'Store Manager' // In production, get from auth
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 500)); // Keep last 500 logs
  }, []);

  // --- Effects (Data Persistence) ---
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setIsLoading(true);
      try {
        const storedItems = localStorage.getItem('empStoreStockItems');
        const storedProjects = localStorage.getItem('empStoreProjects');
        const storedSuppliers = localStorage.getItem('empStoreSuppliers');
        const storedAuditLogs = localStorage.getItem('empStoreAuditLogs');
        
        // Load existing data or use sample data for composites manufacturing
        if (storedItems && JSON.parse(storedItems).length > 0) {
          setStockItems(JSON.parse(storedItems));
        } else {
          setStockItems(SAMPLE_MATERIALS);
        }
        
        if (storedProjects && JSON.parse(storedProjects).length > 0) {
          setProjects(JSON.parse(storedProjects));
        } else {
          setProjects(SAMPLE_PROJECTS);
        }
        
        if (storedSuppliers && JSON.parse(storedSuppliers).length > 0) {
          setSuppliers(JSON.parse(storedSuppliers));
        } else {
          setSuppliers(SAMPLE_SUPPLIERS);
        }
        
        if (storedAuditLogs) setAuditLogs(JSON.parse(storedAuditLogs));
      } catch (e) {
        console.error('Error loading data:', e);
        // On error, load sample data
        setStockItems(SAMPLE_MATERIALS);
        setProjects(SAMPLE_PROJECTS);
        setSuppliers(SAMPLE_SUPPLIERS);
      } finally {
        setTimeout(() => setIsLoading(false), 300); // Smooth transition
      }
    }
  }, []);

  useEffect(() => localStorage.setItem('empStoreStockItems', JSON.stringify(stockItems)), [stockItems]);
  useEffect(() => localStorage.setItem('empStoreProjects', JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem('empStoreSuppliers', JSON.stringify(suppliers)), [suppliers]);
  useEffect(() => localStorage.setItem('empStoreAuditLogs', JSON.stringify(auditLogs)), [auditLogs]);

  // --- Calculations (moved up for Firebase sync) ---
  const calculateClosingStock = useCallback((item: StockItem): number => {
    let total = item.openingStock + (item.inword || 0);
    if (item.projects) Object.values(item.projects).forEach(val => total -= (val || 0));
    total -= (item.rdUsage || 0);
    total -= (item.internalUsage || 0);
    total -= (item.newFactoryUsage || 0);
    return Math.max(0, total);
  }, []);

  // --- Sync to Firebase (for Purchase/Store pages) ---
  const syncToFirebase = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      
      // Sync Materials to Firebase
      for (const item of stockItems) {
        const materialRef = doc(db, FB_MATERIALS, item.id);
        batch.set(materialRef, {
          code: item.code,
          name: item.materialName || item.name || '',
          category: item.category || 'Raw Material',
          supplier_id: suppliers.find(s => s.name === item.supplierName)?.id || null,
          supplier_name: item.supplierName,
          current_stock: calculateClosingStock(item),
          min_stock: item.minStock || 0,
          purchase_price: item.rate || item.purchasePrice || 0,
          unit: item.uom,
          created_at: item.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      // Sync Suppliers to Firebase
      for (const supplier of suppliers) {
        const supplierRef = doc(db, FB_SUPPLIERS, supplier.id);
        batch.set(supplierRef, {
          name: supplier.name,
          contact_person: supplier.contact,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          gst: supplier.gst,
          created_at: new Date().toISOString()
        });
      }
      
      await batch.commit();
      console.log('✓ Synced to Firebase successfully');
      return true;
    } catch (error) {
      console.error('Firebase sync error:', error);
      return false;
    }
  }, [stockItems, suppliers, calculateClosingStock]);

  // Auto-sync to Firebase when data changes (debounced)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (stockItems.length > 0 && suppliers.length > 0 && !isLoading) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncToFirebase();
      }, 2000); // Debounce 2 seconds
    }
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [stockItems, suppliers, isLoading, syncToFirebase]);

  // --- Excel Export Functions ---
  const exportToExcel = useCallback((type: 'materials' | 'suppliers' | 'stock' | 'audit') => {
    setIsExporting(true);
    try {
      let data: any[] = [];
      let filename = '';
      
      switch (type) {
        case 'materials':
          data = stockItems.map(item => ({
            'Code': item.code,
            'Material Name': item.materialName,
            'Category': item.category,
            'Supplier': item.supplierName,
            'Unit': item.uom,
            'Opening Stock': item.openingStock,
            'Current Stock': calculateClosingStock(item),
            'Min Stock': item.minStock,
            'Rate (₹)': item.rate,
            'Value (₹)': item.rate * calculateClosingStock(item)
          }));
          filename = `Materials_${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'suppliers':
          data = suppliers.map(s => ({
            'Company Name': s.name,
            'Contact Person': s.contact,
            'Phone': s.phone,
            'Email': s.email,
            'GST': s.gst,
            'City': s.city,
            'Address': s.address
          }));
          filename = `Suppliers_${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'stock':
          data = stockItems.map(item => {
            const row: any = {
              'Material': item.materialName,
              'Opening': item.openingStock,
              'Inward': item.inword
            };
            projects.forEach(p => { row[p.name] = item.projects[p.id] || 0; });
            row['R&D Usage'] = item.rdUsage;
            row['Internal Usage'] = item.internalUsage;
            row['New Factory'] = item.newFactoryUsage;
            row['Closing Stock'] = calculateClosingStock(item);
            return row;
          });
          filename = `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'audit':
          data = auditLogs.map(log => ({
            'Timestamp': new Date(log.timestamp).toLocaleString(),
            'Action': log.action,
            'Type': log.entityType,
            'Entity': log.entityName,
            'Details': log.details,
            'User': log.user
          }));
          filename = `Audit_Trail_${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
      }
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
      XLSX.writeFile(wb, filename);
      showToast(`Exported ${data.length} records to Excel`, 'success');
      logAudit('UPDATE', 'Stock', type, `Exported ${data.length} ${type} records to Excel`);
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [stockItems, suppliers, projects, auditLogs, logAudit, calculateClosingStock]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // --- Handlers: Projects ---
  const addProject = () => {
    if (!newProjectName.trim()) return showToast('Enter project name', 'error');
    
    if (editingProjectId) {
      // Edit existing project
      setProjects(projects.map(p => 
        p.id === editingProjectId ? { ...p, name: newProjectName } : p
      ));
      logAudit('UPDATE', 'Project', newProjectName, `Updated project name to: ${newProjectName}`);
      showToast('Project updated');
    } else {
      // Add new project
      const newProject = { id: crypto.randomUUID(), name: newProjectName };
      setProjects([...projects, newProject]);
      logAudit('CREATE', 'Project', newProjectName, `Created new project: ${newProjectName}`);
      showToast('Project added');
    }
    
    setNewProjectName('');
    setEditingProjectId(null);
    setShowProjectModal(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setNewProjectName(project.name);
    setShowProjectModal(true);
  };

  const deleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (confirm('Delete project? Usage data will be lost.')) {
      setStockItems(stockItems.map(item => {
        const { [id]: _, ...rest } = item.projects;
        return { ...item, projects: rest };
      }));
      setProjects(projects.filter(p => p.id !== id));
      logAudit('DELETE', 'Project', project?.name || id, `Deleted project: ${project?.name}`);
      showToast('Project deleted');
    }
  };

  // --- Handlers: Materials ---
  const handleNewMaterial = () => {
    setEditingId(null);
    setFormData({});
    setShowMaterialModal(true);
  };

  const handleEditMaterial = (item: StockItem) => {
    setEditingId(item.id);
    // Normalize data for the form
    setFormData({
      ...item,
      name: item.materialName,
      supplier: item.supplierName,
      purchasePrice: item.rate,
      currentStock: calculateClosingStock(item)
    });
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = (id: string) => {
    const material = stockItems.find(i => i.id === id);
    if (confirm('Delete this material?')) {
      setStockItems(stockItems.filter(i => i.id !== id));
      logAudit('DELETE', 'Material', material?.materialName || id, `Deleted material: ${material?.materialName} (${material?.code})`);
      showToast('Material deleted');
    }
  };

  const handleSaveMaterial = () => {
    const data = formData as Partial<StockItem>;
    // Normalize fields
    const newItem: StockItem = {
      id: editingId || crypto.randomUUID(),
      code: data.code || '',
      materialName: data.name || data.materialName || '',
      supplierName: data.supplier || data.supplierName || '',
      rate: data.purchasePrice || data.rate || 0,
      uom: data.uom || 'Kg',
      openingStock: Number(data.openingStock) || 0,
      minStock: Number(data.minStock) || 0,
      category: data.category || 'Raw Material',
      inword: data.inword || 0,
      projects: data.projects || {},
      rdUsage: data.rdUsage || 0,
      internalUsage: data.internalUsage || 0,
      newFactoryUsage: data.newFactoryUsage || 0,
      createdAt: editingId ? (stockItems.find(i => i.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editingId) {
      setStockItems(stockItems.map(i => i.id === editingId ? newItem : i));
      logAudit('UPDATE', 'Material', newItem.materialName, `Updated material: ${newItem.materialName} (${newItem.code})`);
      showToast('Material updated');
    } else {
      setStockItems([...stockItems, newItem]);
      logAudit('CREATE', 'Material', newItem.materialName, `Added new material: ${newItem.materialName} (${newItem.code}), Stock: ${newItem.openingStock} ${newItem.uom}`);
      showToast('Material added');
    }
    setShowMaterialModal(false);
  };

  const updateStockItem = (id: string, updates: Partial<StockItem>) => {
    setStockItems(stockItems.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  // --- Handlers: Suppliers ---
  const handleNewSupplier = () => {
    setEditingId(null);
    setFormData({});
    setShowSupplierModal(true);
    setSelectedSupplier(null); // Ensure we aren't in view mode
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData(supplier);
    setShowSupplierModal(true);
    setSelectedSupplier(null);
  };

  const handleSaveSupplier = () => {
    const data = formData as Supplier;
    if (!data.name) return showToast('Name required', 'error');
    
    if (editingId) {
      setSuppliers(suppliers.map(s => s.id === editingId ? { ...data, id: editingId } : s));
      logAudit('UPDATE', 'Supplier', data.name, `Updated supplier: ${data.name}`);
      showToast('Supplier updated');
    } else {
      setSuppliers([...suppliers, { ...data, id: crypto.randomUUID() }]);
      logAudit('CREATE', 'Supplier', data.name, `Added new supplier: ${data.name}, GST: ${data.gst}`);
      showToast('Supplier added');
    }
    setShowSupplierModal(false);
  };

  const handleDeleteSupplier = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (confirm('Delete supplier?')) {
      setSuppliers(suppliers.filter(s => s.id !== id));
      logAudit('DELETE', 'Supplier', supplier?.name || id, `Deleted supplier: ${supplier?.name}`);
      showToast('Supplier deleted');
    }
  };

  // --- Filtering & Stats ---
  const filteredMaterials = useMemo(() => {
    let result = stockItems;
    // Map properties for searching (handle legacy naming)
    result = result.map(item => ({
      ...item,
      name: item.materialName,
      supplier: item.supplierName,
      purchasePrice: item.rate,
      currentStock: calculateClosingStock(item)
    }));

    if (filterCategory !== 'All') {
      result = result.filter(i => i.category === filterCategory);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => 
        (i.materialName || '').toLowerCase().includes(lower) || 
        (i.code || '').toLowerCase().includes(lower) ||
        (i.supplierName || '').toLowerCase().includes(lower)
      );
    }
    return result.sort((a, b) => {
      if (sortBy === 'name') return (a.materialName || '').localeCompare(b.materialName || '');
      if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
      return (b.currentStock || 0) - (a.currentStock || 0);
    });
  }, [stockItems, filterCategory, searchTerm, sortBy]);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    return suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [suppliers, searchTerm]);

  const stats = useMemo(() => {
    const total = stockItems.length;
    const currentStocks = stockItems.map(i => calculateClosingStock(i));
    const lowStock = stockItems.filter((i, idx) => currentStocks[idx] > 0 && currentStocks[idx] <= (i.minStock || 10)).length;
    const outOfStock = currentStocks.filter(s => s === 0).length;
    const totalValue = stockItems.reduce((sum, item, idx) => sum + (item.rate * currentStocks[idx]), 0);
    return { total, lowStock, outOfStock, totalValue, supplierCount: suppliers.length };
  }, [stockItems, suppliers]);

  const resetForm = () => {
    setFormData({});
    setShowMaterialModal(false);
    setShowSupplierModal(false);
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-sm font-medium">Loading Composite ERP...</p>
          <p className="text-zinc-500 text-xs mt-1">Preparing inventory data</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      
      {/* Background Grid - Same as Login */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0" />
      
      {/* --- Navigation --- */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 bg-zinc-900/95 border-zinc-800 border-b backdrop-blur-xl"
      >
        <div className="max-w-full px-4 h-14 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600"
                style={{ boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.35)' }}>
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="absolute inset-0 w-9 h-9 rounded-xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
            </div>
            
            {/* Title */}
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                Composite Store
              </h1>
              <p className="text-[10px] text-zinc-500">
                Inventory Management
              </p>
            </div>
          </div>
          
          {/* Right: Search */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
              <Search className="w-4 h-4 text-zinc-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-32 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* --- Tabs --- */}
      <div className="sticky top-14 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-full px-4 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {[
            { id: 'stock-updates', label: 'Stock', icon: Package },
            { id: 'materials', label: 'Materials', icon: Package },
            { id: 'suppliers', label: 'Suppliers', icon: Building2 },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'audit', label: 'Audit', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors duration-150 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'text-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'audit' && auditLogs.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/20 text-indigo-400">
                  {auditLogs.length}
                </span>
              )}
              {/* Active indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="max-w-full px-4 py-5 relative z-10">
        
        {/* --- Tab: Stock Updates (Excel-Style Grid) --- */}
        {activeTab === 'stock-updates' && (
          <>
            {/* Toolbar - Premium Style */}
            <div className={`${isDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-gray-200'} backdrop-blur-sm border rounded-xl p-2.5 flex items-center justify-between shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className={`pl-8 pr-3 py-1.5 border rounded-lg text-xs w-48 outline-none transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-indigo-500' : 'bg-white border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100'}`}
                  />
                </div>
                <span className={`text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                  {filteredMaterials.length} items • {projects.length} projects
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    if (confirm('Load demo data for Composites Manufacturing? This will replace current data.')) {
                      setStockItems(SAMPLE_MATERIALS);
                      setProjects(SAMPLE_PROJECTS);
                      setSuppliers(SAMPLE_SUPPLIERS);
                      showToast('Demo data loaded successfully!', 'success');
                      logAudit('UPDATE', 'Stock', 'System', 'Loaded composites manufacturing demo data');
                    }
                  }} 
                  className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-md text-[10px] font-medium flex items-center gap-1 hover:from-violet-600 hover:to-purple-600 shadow-sm shadow-purple-500/20 transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> Demo
                </button>
                <button onClick={() => exportToExcel('stock')} className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-md text-[10px] font-medium flex items-center gap-1 hover:from-emerald-600 hover:to-green-600 shadow-sm shadow-emerald-500/20 transition-all">
                  <Download className="w-3 h-3" /> Excel
                </button>
                <button onClick={() => setShowProjectModal(true)} className="px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md text-[10px] font-medium flex items-center gap-1 hover:from-blue-600 hover:to-indigo-600 shadow-sm shadow-blue-500/20 transition-all">
                  <Plus className="w-3 h-3" /> Project
                </button>
                <button onClick={handleNewMaterial} className="px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-md text-[10px] font-medium flex items-center gap-1 hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/20 transition-all">
                  <Plus className="w-3 h-3" /> Material
                </button>
              </div>
            </div>

            {/* Excel-Style Table */}
            <div className={`border rounded-xl overflow-hidden ${isDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-gray-200'} mt-2 shadow-lg`}>
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '1400px' }}>
                  {/* Header Row 1 - Category Headers */}
                  <thead className="sticky top-0 z-10">
                    <tr className={isDarkMode ? 'bg-zinc-800' : 'bg-gradient-to-r from-slate-100 to-gray-100'}>
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-gray-200 bg-slate-100 text-slate-600'}`} rowSpan={2}>S.No</th>
                      <th className={`border px-2 py-1.5 font-bold text-left min-w-[180px] text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-gray-200 bg-slate-100 text-slate-800'}`} rowSpan={2}>Material Name</th>
                      <th className={`border px-2 py-1.5 font-semibold min-w-[120px] text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-gray-200 bg-slate-100 text-slate-600'}`} rowSpan={2}>Supplier</th>
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-gray-200 bg-slate-100 text-slate-600'}`} rowSpan={2}>Rate</th>
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-gray-200 bg-slate-100 text-slate-600'}`} rowSpan={2}>UOM</th>
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-emerald-400' : 'border-gray-200 bg-emerald-50 text-emerald-700'}`} rowSpan={2}>IN</th>
                      {/* Project Columns */}
                      {projects.length > 0 && (
                        <th 
                          className={`border px-2 py-1 font-bold text-center text-[10px] uppercase tracking-wider ${isDarkMode ? 'border-zinc-700 bg-gradient-to-r from-amber-900/50 to-orange-900/50 text-amber-400' : 'border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800'}`}
                          colSpan={projects.length}
                        >
                          Projects
                        </th>
                      )}
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-purple-900/30 text-purple-400' : 'border-gray-200 bg-purple-50 text-purple-700'}`} rowSpan={2}>R&D</th>
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-gray-200 bg-slate-100 text-slate-600'}`} rowSpan={2}>Int.</th>
                      <th className={`border px-2 py-1.5 font-semibold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-gray-200 bg-slate-100 text-slate-600'}`} rowSpan={2}>New</th>
                      <th className={`border px-2 py-1.5 font-bold text-[10px] ${isDarkMode ? 'border-zinc-700 bg-indigo-900/40 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`} rowSpan={2}>Stock</th>
                    </tr>
                    {/* Header Row 2 - Project Names */}
                    {projects.length > 0 && (
                      <tr>
                        {projects.map(p => (
                          <th key={p.id} className={`border px-1 py-1 font-medium text-center min-w-[70px] text-[9px] ${isDarkMode ? 'border-zinc-700 bg-amber-900/30 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                            <div className="flex items-center justify-center gap-0.5">
                              <span className="truncate max-w-[40px]" title={p.name}>{p.name}</span>
                              <Edit2 
                                className="w-2.5 h-2.5 text-cyan-400 cursor-pointer hover:text-cyan-300 flex-shrink-0 opacity-50 hover:opacity-100" 
                                onClick={() => handleEditProject(p)} 
                              />
                              <X 
                                className="w-2.5 h-2.5 text-red-400 cursor-pointer hover:text-red-500 flex-shrink-0 opacity-50 hover:opacity-100" 
                                onClick={() => deleteProject(p.id)} 
                              />
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {filteredMaterials.map((item, index) => {
                      const closing = calculateClosingStock(item);
                      const isLowStock = closing <= (item.minStock || 0);
                      return (
                        <tr 
                          key={item.id} 
                          className={`transition-colors ${isDarkMode 
                            ? `hover:bg-zinc-800/50 ${index % 2 === 0 ? 'bg-zinc-900/50' : 'bg-zinc-900/30'}` 
                            : `hover:bg-indigo-50/30 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}`}
                        >
                          {/* S.No */}
                          <td className={`border px-2 py-1 text-center font-medium text-[10px] ${isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-gray-100 text-gray-400'}`}>
                            {index + 1}
                          </td>
                          {/* Material Name */}
                          <td className={`border px-2 py-1 font-medium text-[11px] ${isDarkMode ? 'border-zinc-800 text-white' : 'border-gray-100 text-gray-800'}`}>
                            {item.materialName}
                          </td>
                          {/* Supplier */}
                          <td className={`border px-2 py-1 text-[10px] ${isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-gray-100 text-gray-500'}`}>
                            {item.supplierName || '-'}
                          </td>
                          {/* Rate */}
                          <td className={`border px-2 py-1 text-center text-[10px] ${isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-gray-100 text-gray-600'}`}>
                            {item.rate > 0 ? `₹${item.rate}` : '-'}
                          </td>
                          {/* UOM */}
                          <td className={`border px-2 py-1 text-center text-[10px] ${isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-gray-100 text-gray-500'}`}>
                            {item.uom}
                          </td>
                          {/* INWORD */}
                          <td className={`border px-0.5 py-0.5 text-center ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                            <input 
                              type="number" 
                              value={item.inword || ''} 
                              onChange={e => updateStockItem(item.id, { inword: Number(e.target.value) || 0 })}
                              className={`w-12 text-center border rounded px-1 py-0.5 text-[10px] outline-none transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-emerald-400 focus:border-emerald-500' : 'bg-emerald-50/50 border-emerald-200 text-emerald-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100'}`}
                              placeholder="0"
                            />
                          </td>
                          {/* Project Usage Columns */}
                          {projects.map(p => (
                            <td key={p.id} className={`border px-0.5 py-0.5 text-center ${isDarkMode ? 'border-zinc-800 bg-amber-900/10' : 'border-gray-100 bg-amber-50/20'}`}>
                              <input 
                                type="number" 
                                value={item.projects[p.id] || ''} 
                                onChange={e => updateStockItem(item.id, { projects: { ...item.projects, [p.id]: Number(e.target.value) || 0 } })}
                                className={`w-10 text-center border rounded px-0.5 py-0.5 text-[10px] outline-none transition-all ${isDarkMode ? 'bg-zinc-800 border-amber-800/50 text-amber-400 focus:border-amber-500' : 'bg-white border-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100'}`}
                                placeholder="0"
                              />
                            </td>
                          ))}
                          {/* R&D */}
                          <td className={`border px-0.5 py-0.5 text-center ${isDarkMode ? 'border-zinc-800 bg-purple-900/10' : 'border-gray-100 bg-purple-50/20'}`}>
                            <input 
                              type="number" 
                              value={item.rdUsage || ''} 
                              onChange={e => updateStockItem(item.id, { rdUsage: Number(e.target.value) || 0 })}
                              className={`w-10 text-center border rounded px-0.5 py-0.5 text-[10px] outline-none transition-all ${isDarkMode ? 'bg-zinc-800 border-purple-800/50 text-purple-400 focus:border-purple-500' : 'bg-white border-purple-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-100'}`}
                              placeholder="0"
                            />
                          </td>
                          {/* Internal */}
                          <td className={`border px-0.5 py-0.5 text-center ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                            <input 
                              type="number" 
                              value={item.internalUsage || ''} 
                              onChange={e => updateStockItem(item.id, { internalUsage: Number(e.target.value) || 0 })}
                              className={`w-10 text-center border rounded px-0.5 py-0.5 text-[10px] outline-none transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300 focus:border-indigo-500' : 'bg-white border-gray-200 focus:border-indigo-400'}`}
                              placeholder="0"
                            />
                          </td>
                          {/* New Factory */}
                          <td className={`border px-0.5 py-0.5 text-center ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                            <input 
                              type="number" 
                              value={item.newFactoryUsage || ''} 
                              onChange={e => updateStockItem(item.id, { newFactoryUsage: Number(e.target.value) || 0 })}
                              className={`w-10 text-center border rounded px-0.5 py-0.5 text-[10px] outline-none transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300 focus:border-indigo-500' : 'bg-white border-gray-200 focus:border-indigo-400'}`}
                              placeholder="0"
                            />
                          </td>
                          {/* Closing Stock */}
                          <td className={`border px-2 py-1 text-center font-bold text-xs ${
                            isLowStock 
                              ? (isDarkMode ? 'border-red-900/50 bg-red-900/30 text-red-400' : 'border-red-200 bg-red-50 text-red-600') 
                              : (isDarkMode ? 'border-indigo-900/50 bg-indigo-900/30 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-600')
                          }`}>
                            {closing}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Empty state */}
                    {filteredMaterials.length === 0 && (
                      <tr>
                        <td colSpan={11 + projects.length} className={`text-center py-12 ${isDarkMode ? 'text-zinc-600' : 'text-gray-400'}`}>
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="font-medium text-sm">No materials found</p>
                          <p className="text-xs">Add your first material to get started</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Stats - Premium Style */}
            <div className={`${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gradient-to-r from-slate-50 to-gray-50 border-gray-200'} border rounded-b-xl mt-0 px-4 py-2 flex items-center justify-between text-[10px]`}>
              <div className="flex items-center gap-3">
                <span className={isDarkMode ? 'text-zinc-500' : 'text-gray-500'}>Items: <strong className={isDarkMode ? 'text-white' : 'text-gray-900'}>{stockItems.length}</strong></span>
                <span className={isDarkMode ? 'text-zinc-700' : 'text-gray-300'}>•</span>
                <span className={isDarkMode ? 'text-zinc-500' : 'text-gray-500'}>Value: <strong className="text-emerald-500">₹{stats.totalValue.toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-500">Low: <strong>{stats.lowStock}</strong></span>
                <span className="text-red-500">Out: <strong>{stats.outOfStock}</strong></span>
              </div>
            </div>
          </>
        )}

        {/* --- Tab: Materials (Master List) --- */}
        {activeTab === 'materials' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <div className="relative">
                  <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                  <input 
                    type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className={`pl-8 pr-3 py-1.5 border rounded-lg text-xs w-48 outline-none ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-gray-200 focus:border-indigo-400'}`}
                  />
                </div>
                <select 
                  value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className={`px-3 py-1.5 border rounded-lg text-xs ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-200'}`}
                >
                  <option>All</option>
                  <option>Raw Material</option>
                  <option>Consumable</option>
                  <option>Tool</option>
                  <option>Safety Equipment</option>
                </select>
              </div>
              <button onClick={handleNewMaterial} className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm shadow-indigo-500/20">
                <Plus className="w-3.5 h-3.5" /> New Item
              </button>
            </div>

            <div className={`rounded-xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
              <table className="w-full text-xs text-left">
                <thead className={isDarkMode ? 'bg-zinc-800 border-b border-zinc-700' : 'bg-slate-50 border-b border-gray-100'}>
                  <tr>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Code</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Category</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-right ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Stock</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-right ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Price</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-center ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Action</th>
                  </tr>
                </thead>
                <tbody className={isDarkMode ? 'divide-y divide-zinc-800' : 'divide-y divide-gray-50'}>
                  {filteredMaterials.map(m => (
                    <tr key={m.id} className={isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50'}>
                      <td className={`px-4 py-2.5 font-mono text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>{m.code}</td>
                      <td className={`px-4 py-2.5 font-medium text-xs ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{m.materialName}</td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[9px] font-medium ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'}`}>{m.category}</span></td>
                      <td className={`px-4 py-2.5 text-right font-bold text-xs ${calculateClosingStock(m) <= (m.minStock || 0) ? 'text-red-500' : 'text-emerald-500'}`}>
                        {calculateClosingStock(m)} {m.uom}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>₹{m.rate}</td>
                      <td className="px-4 py-2.5 text-center flex justify-center gap-1">
                        <button onClick={() => handleEditMaterial(m)} className={`p-1 rounded ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}`}><Edit2 className="w-3.5 h-3.5"/></button>
                        <button onClick={() => handleDeleteMaterial(m.id)} className={`p-1 rounded ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}><Trash2 className="w-3.5 h-3.5"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- Tab: Suppliers --- */}
        {activeTab === 'suppliers' && (
          <>
            <div className="flex justify-between mb-4">
              <div className="relative">
                <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
                <input 
                  type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className={`pl-8 pr-3 py-1.5 border rounded-lg text-xs w-48 outline-none ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-gray-200 focus:border-indigo-400'}`}
                />
              </div>
              <button onClick={handleNewSupplier} className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm shadow-indigo-500/20">
                <Plus className="w-3.5 h-3.5" /> New Supplier
              </button>
            </div>
            <div className={`rounded-xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
              <table className="w-full text-xs text-left">
                <thead className={isDarkMode ? 'bg-zinc-800 border-b border-zinc-700' : 'bg-slate-50 border-b border-gray-100'}>
                  <tr>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Contact</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Phone</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>City</th>
                    <th className={`px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-center ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Action</th>
                  </tr>
                </thead>
                <tbody className={isDarkMode ? 'divide-y divide-zinc-800' : 'divide-y divide-gray-50'}>
                  {filteredSuppliers.map(s => (
                    <tr key={s.id} className={isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50'}>
                      <td className={`px-4 py-2.5 font-medium cursor-pointer hover:underline ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} 
                          onClick={() => { setSelectedSupplier(s); setShowSupplierModal(true); }}>
                        {s.name}
                      </td>
                      <td className={`px-4 py-2.5 text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>{s.contact}</td>
                      <td className={`px-4 py-2.5 text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>{s.phone}</td>
                      <td className={`px-4 py-2.5 text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>{s.city}</td>
                      <td className="px-4 py-2.5 text-center flex justify-center gap-1">
                        <button onClick={() => handleEditSupplier(s)} className={`p-1 rounded ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}`}><Edit2 className="w-3.5 h-3.5"/></button>
                        <button onClick={() => handleDeleteSupplier(s.id)} className={`p-1 rounded ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}><Trash2 className="w-3.5 h-3.5"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- Tab: Analytics --- */}
        {activeTab === 'analytics' && (
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {[
              { label: 'Total Value', value: `₹${(stats.totalValue / 100000).toFixed(2)}L`, color: 'text-emerald-600', icon: DollarSign },
              { label: 'Total Items', value: stats.total, color: 'text-blue-600', icon: Package },
              { label: 'Low Stock Items', value: stats.lowStock, color: 'text-amber-600', icon: AlertTriangle },
              { label: 'Suppliers', value: stats.supplierCount, color: 'text-purple-600', icon: Building2 }
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                variants={fadeInUp}
                whileHover={{ scale: 1.02, y: -2 }}
                className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} p-6 rounded-xl border shadow-sm cursor-pointer transition-shadow hover:shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} text-sm`}>{stat.label}</p>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* --- Tab: Audit Trail --- */}
        {activeTab === 'audit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Audit Trail</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Track all changes made to inventory data</p>
              </div>
              <button 
                onClick={() => exportToExcel('audit')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <Download className="w-4 h-4" /> Export Audit Log
              </button>
            </div>
            
            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm overflow-hidden`}>
              {auditLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <History className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No audit logs yet</p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Actions will be recorded here</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} sticky top-0`}>
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                        <th className="px-4 py-3 text-left font-semibold">Action</th>
                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Entity</th>
                        <th className="px-4 py-3 text-left font-semibold">Details</th>
                        <th className="px-4 py-3 text-left font-semibold">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {auditLogs.map((log, index) => (
                          <motion.tr 
                            key={log.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`border-b ${isDarkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{log.entityType}</span>
                            </td>
                            <td className="px-4 py-3 font-medium">{log.entityName}</td>
                            <td className="px-4 py-3 text-sm max-w-xs truncate" title={log.details}>{log.details}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs text-blue-600 font-medium">{log.user.charAt(0)}</span>
                                </div>
                                <span className="text-sm">{log.user}</span>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>

      {/* --- Modals --- */}
      
      {/* 1. Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border-zinc-700 border rounded-xl shadow-2xl shadow-purple-500/10 w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4" /> {editingProjectId ? 'Edit Project' : 'Add Project'}
              </h3>
            </div>
            <div className="p-4">
              <input 
                value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project Name" 
                className="w-full border rounded-lg px-3 py-2 text-sm bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowProjectModal(false); setEditingProjectId(null); setNewProjectName(''); }} className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:bg-zinc-800 transition">Cancel</button>
                <button onClick={addProject} className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-500/25">
                  {editingProjectId ? 'Update Project' : 'Add Project'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Material Modal (Add/Edit) */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl shadow-indigo-500/10 w-full max-w-md max-h-[90vh] overflow-hidden`}
          >
            <div className="p-4 flex justify-between items-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Package className="w-4 h-4" />
                {editingId ? 'Edit Material' : 'Add Material'}
              </h3>
              <button onClick={resetForm} className="text-white/80 hover:text-white transition"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <input value={(formData as Partial<StockItem>).name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Material Name" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
              <div className="grid grid-cols-2 gap-3">
                <input value={(formData as Partial<StockItem>).code || ''} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Code" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
                <input value={(formData as Partial<StockItem>).uom || ''} onChange={e => setFormData({...formData, uom: e.target.value})} placeholder="UOM" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={(formData as Partial<StockItem>).openingStock || ''} onChange={e => setFormData({...formData, openingStock: Number(e.target.value)})} placeholder="Opening Stock" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
                <input type="number" value={(formData as Partial<StockItem>).minStock || ''} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} placeholder="Min Stock" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={(formData as Partial<StockItem>).purchasePrice || ''} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} placeholder="Price (Rate)" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
                <input value={(formData as Partial<StockItem>).supplier || ''} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="Supplier" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`} />
              </div>
              <select value={(formData as Partial<StockItem>).category || 'Raw Material'} onChange={e => setFormData({...formData, category: e.target.value as any})} className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition`}>
                <option>Raw Material</option><option>Consumable</option><option>Tool</option><option>Safety Equipment</option>
              </select>
              <button onClick={handleSaveMaterial} className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-2 rounded-lg text-sm font-medium hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition shadow-lg shadow-purple-500/25">Save Material</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. Supplier Modal (Add/Edit/View) */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl shadow-blue-500/10 w-full max-w-lg overflow-hidden`}
          >
            <div className="p-4 flex justify-between items-center bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {selectedSupplier ? selectedSupplier.name : (editingId ? 'Edit Supplier' : 'Add Supplier')}
              </h3>
              <button onClick={resetForm} className="text-white/80 hover:text-white transition"><X className="w-4 h-4"/></button>
            </div>
            
            {selectedSupplier ? (
              // View Mode
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <span className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Contact:</span> 
                    <p className="font-medium mt-0.5">{selectedSupplier.contact}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <span className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Phone:</span> 
                    <p className="font-medium mt-0.5">{selectedSupplier.phone}</p>
                  </div>
                  <div className={`col-span-2 p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <span className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Email:</span> 
                    <p className="font-medium mt-0.5">{selectedSupplier.email}</p>
                  </div>
                  <div className={`col-span-2 p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <span className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Address:</span> 
                    <p className="font-medium mt-0.5">{selectedSupplier.address}, {selectedSupplier.city}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <span className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>GST:</span> 
                    <p className="font-mono mt-0.5">{selectedSupplier.gst}</p>
                  </div>
                </div>
                <div className={`pt-3 border-t ${isDarkMode ? 'border-zinc-700' : 'border-gray-200'}`}>
                  <h4 className="font-bold text-xs mb-2 flex items-center gap-2"><Package className="w-3 h-3"/> Supplied Items</h4>
                  <div className={`max-h-32 overflow-y-auto p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    {stockItems.filter(i => i.supplierName === selectedSupplier.name).map(i => (
                      <div key={i.id} className={`flex justify-between text-xs py-1.5 border-b last:border-0 ${isDarkMode ? 'border-zinc-700' : 'border-gray-200'}`}>
                        <span>{i.materialName}</span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-200'}`}>{i.code}</span>
                      </div>
                    ))}
                    {stockItems.filter(i => i.supplierName === selectedSupplier.name).length === 0 && <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>No items associated.</p>}
                  </div>
                </div>
              </div>
            ) : (
              // Edit/Add Mode
              <div className="p-4 space-y-3">
                <input value={(formData as Supplier).name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Company Name" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={(formData as Supplier).contact || ''} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="Contact Person" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                  <input value={(formData as Supplier).phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                </div>
                <input value={(formData as Supplier).email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                <input value={(formData as Supplier).gst || ''} onChange={e => setFormData({...formData, gst: e.target.value})} placeholder="GST Number" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={(formData as Supplier).city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                  <input value={(formData as Supplier).address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Address" className={`w-full border px-3 py-2 rounded-lg text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white placeholder-zinc-400' : 'bg-gray-50 border-gray-200'} focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition`} />
                </div>
                <button onClick={handleSaveSupplier} className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:via-cyan-600 hover:to-teal-600 transition shadow-lg shadow-blue-500/25">Save Supplier</button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* --- Toast --- */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 50 }}
            className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' 
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              : <AlertTriangle className="w-5 h-5 text-red-500" />
            }
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeStore;