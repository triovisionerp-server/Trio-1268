// BOM Generation & Management Service
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/client';
import {
  BOM,
  BOMComponent,
  BOMStatus,
  CustomerRequirement,
  BOMSuggestion,
  BOMTemplate,
  ComponentCategory,
  StockAvailabilityReport,
  BOMPurchaseOrder,
  BOMRevision
} from '@/types/bom';

// ==================== BOM Generation ====================

/**
 * AI-Powered BOM Generation from Customer Requirements
 * This uses pattern matching and historical data analysis
 */
export async function generateBOMFromRequirements(
  requirement: CustomerRequirement
): Promise<{ bom: Partial<BOM>; suggestion: BOMSuggestion }> {
  try {
    // Step 1: Extract key parameters from requirements
    const params = extractRequirementParameters(requirement);
    
    // Step 2: Find matching templates
    const templates = await findMatchingTemplates(params);
    
    // Step 3: Analyze historical BOMs
    const historicalData = await analyzeHistoricalBOMs(params);
    
    // Step 4: Generate component list
    const components = await generateComponents(params, templates, historicalData);
    
    // Step 5: Calculate pricing
    const pricing = calculatePricing(components);
    
    // Step 6: Generate BOM number
    const bomNumber = await generateBOMNumber();
    
    const bom: Partial<BOM> = {
      bomNumber,
      version: 1,
      status: BOMStatus.DRAFT,
      requirementId: requirement.id,
      customerId: requirement.customerId,
      customerName: requirement.customerName,
      projectName: requirement.projectName,
      components,
      pricing,
      workflow: {
        createdAt: new Date(),
        createdBy: 'system',
        createdByName: 'Auto-Generated',
      },
      revisions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const suggestion: BOMSuggestion = {
      confidence: calculateConfidence(templates, historicalData),
      suggestedComponents: components,
      estimatedCost: pricing.totalCost,
      estimatedTime: estimateProductionTime(components),
      reasoning: generateReasoning(templates, historicalData),
      matchedPatterns: templates.map(t => t.templateName),
      historicalReference: historicalData.map(h => h.bomNumber || h.id),
    };
    
    return { bom, suggestion };
  } catch (error) {
    console.error('Error generating BOM:', error);
    throw new Error('Failed to generate BOM from requirements');
  }
}

/**
 * Extract structured parameters from customer requirements
 */
function extractRequirementParameters(requirement: CustomerRequirement): any {
  const { specifications, productType, quantity } = requirement;
  
  // Extract key parameters
  const params: any = {
    productType: productType?.toLowerCase(),
    quantity,
    dimensions: specifications.dimensions || {},
    material: specifications.material?.toLowerCase(),
    finish: specifications.finish?.toLowerCase(),
    color: specifications.color?.toLowerCase(),
    weight: specifications.weight,
    customSpecs: specifications.customSpecs || {},
  };
  
  // Parse raw text for additional insights (simple keyword extraction)
  if (requirement.rawText) {
    params.keywords = extractKeywords(requirement.rawText);
  }
  
  return params;
}

/**
 * Simple keyword extraction from text
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const materialKeywords = ['steel', 'aluminum', 'plastic', 'composite', 'fiber', 'resin', 'metal'];
  const processKeywords = ['machining', 'welding', 'molding', 'casting', 'lamination', 'finishing'];
  
  const lowerText = text.toLowerCase();
  
  materialKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) keywords.push(keyword);
  });
  
  processKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) keywords.push(keyword);
  });
  
  return keywords;
}

/**
 * Find matching BOM templates
 */
async function findMatchingTemplates(params: any): Promise<BOMTemplate[]> {
  try {
    const templatesRef = collection(db, 'bom_templates');
    const q = query(templatesRef, orderBy('usageCount', 'desc'));
    const snapshot = await getDocs(q);
    
    const allTemplates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BOMTemplate[];
    
    // Filter templates by similarity
    const matchedTemplates = allTemplates.filter(template => {
      const productMatch = template.productType?.toLowerCase() === params.productType;
      const categoryMatch = params.keywords?.some((kw: string) =>
        template.category?.toLowerCase().includes(kw)
      );
      return productMatch || categoryMatch;
    });
    
    return matchedTemplates.slice(0, 3); // Top 3 matches
  } catch (error) {
    console.error('Error finding templates:', error);
    return [];
  }
}

/**
 * Analyze historical BOMs for patterns
 */
async function analyzeHistoricalBOMs(params: any): Promise<Partial<BOM>[]> {
  try {
    const bomsRef = collection(db, 'boms');
    const q = query(
      bomsRef,
      where('status', '==', BOMStatus.COMPLETED),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const historicalBOMs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Partial<BOM>[];
    
    // Filter similar BOMs
    const similarBOMs = historicalBOMs.filter(bom => {
      return bom.projectName?.toLowerCase().includes(params.productType);
    });
    
    return similarBOMs.slice(0, 5); // Top 5 similar projects
  } catch (error) {
    console.error('Error analyzing historical BOMs:', error);
    return [];
  }
}

/**
 * Generate component list based on templates and historical data
 */
async function generateComponents(
  params: any,
  templates: BOMTemplate[],
  historicalData: Partial<BOM>[]
): Promise<BOMComponent[]> {
  const components: BOMComponent[] = [];
  
  // Start with template components if available
  if (templates.length > 0) {
    const baseComponents = templates[0].baseComponents;
    baseComponents.forEach(comp => {
      components.push({
        ...comp,
        id: generateComponentId(),
        quantity: Math.ceil(comp.quantity * (params.quantity / 1)), // Scale by order quantity
        availableStock: 0, // Will be updated later
        requiredStock: 0,
        stockStatus: 'unavailable',
      });
    });
  }
  
  // Enrich with frequently used components from historical data
  const frequentComponents = extractFrequentComponents(historicalData, params);
  frequentComponents.forEach(comp => {
    // Avoid duplicates
    if (!components.some(c => c.itemCode === comp.itemCode)) {
      components.push(comp);
    }
  });
  
  // Add standard consumables and safety items
  components.push(...getStandardConsumables(params.quantity));
  
  return components;
}

/**
 * Extract frequently used components from historical BOMs
 */
function extractFrequentComponents(historicalData: Partial<BOM>[], params: any): BOMComponent[] {
  const componentFrequency: Map<string, { component: BOMComponent; count: number }> = new Map();
  
  historicalData.forEach(bom => {
    bom.components?.forEach(comp => {
      const key = comp.itemCode;
      if (componentFrequency.has(key)) {
        const entry = componentFrequency.get(key)!;
        entry.count += 1;
      } else {
        componentFrequency.set(key, { component: comp, count: 1 });
      }
    });
  });
  
  // Get top 10 most frequent components
  const sortedComponents = Array.from(componentFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(entry => ({
      ...entry.component,
      id: generateComponentId(),
      availableStock: 0,
      requiredStock: 0,
      stockStatus: 'unavailable' as const,
    }));
  
  return sortedComponents;
}

/**
 * Get standard consumables for any project
 */
function getStandardConsumables(quantity: number): BOMComponent[] {
  return [
    {
      id: generateComponentId(),
      itemCode: 'CONS-001',
      itemName: 'Safety Gloves',
      description: 'Standard safety gloves for handling',
      category: ComponentCategory.CONSUMABLE,
      specification: 'Industrial Grade',
      quantity: Math.ceil(quantity / 10),
      unit: 'Pairs',
      unitPrice: 50,
      totalPrice: 0,
      availableStock: 0,
      requiredStock: 0,
      stockStatus: 'unavailable',
      isOptional: false,
    },
    {
      id: generateComponentId(),
      itemCode: 'CONS-002',
      itemName: 'Cleaning Agent',
      description: 'Surface cleaning solution',
      category: ComponentCategory.CHEMICAL,
      specification: 'Non-toxic',
      quantity: 1,
      unit: 'Liters',
      unitPrice: 200,
      totalPrice: 0,
      availableStock: 0,
      requiredStock: 0,
      stockStatus: 'unavailable',
      isOptional: true,
    },
  ];
}

/**
 * Calculate pricing for BOM
 */
function calculatePricing(components: BOMComponent[]): BOM['pricing'] {
  const totalMaterialCost = components.reduce((sum, comp) => {
    comp.totalPrice = comp.quantity * comp.unitPrice;
    return sum + comp.totalPrice;
  }, 0);
  
  const laborCost = totalMaterialCost * 0.3; // 30% of material cost
  const overheadCost = totalMaterialCost * 0.15; // 15% overhead
  const toolingCost = totalMaterialCost * 0.1; // 10% tooling
  
  const totalCost = totalMaterialCost + laborCost + overheadCost + toolingCost;
  
  const profitMargin = 25; // 25% profit margin
  const profitAmount = totalCost * (profitMargin / 100);
  const sellingPrice = totalCost + profitAmount;
  
  const gst = sellingPrice * 0.18; // 18% GST
  const finalPrice = sellingPrice + gst;
  
  return {
    totalMaterialCost,
    laborCost,
    overheadCost,
    toolingCost,
    totalCost,
    sellingPrice,
    profitAmount,
    profitMargin,
    gst,
    finalPrice,
  };
}

/**
 * Generate unique BOM number
 */
async function generateBOMNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const bomsRef = collection(db, 'boms');
  const q = query(bomsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  const count = snapshot.size + 1;
  return `BOM-${year}-${String(count).padStart(4, '0')}`;
}

function generateComponentId(): string {
  return `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateConfidence(templates: BOMTemplate[], historicalData: Partial<BOM>[]): number {
  let confidence = 0.5; // Base confidence
  
  if (templates.length > 0) confidence += 0.2;
  if (historicalData.length > 2) confidence += 0.15;
  if (historicalData.length > 5) confidence += 0.15;
  
  return Math.min(confidence, 1.0);
}

function estimateProductionTime(components: BOMComponent[]): number {
  // Estimate 1 day per 10 components + lead times
  const baseTime = Math.ceil(components.length / 10);
  const maxLeadTime = Math.max(...components.map(c => c.leadTime || 0));
  return baseTime + maxLeadTime;
}

function generateReasoning(templates: BOMTemplate[], historicalData: Partial<BOM>[]): string {
  const parts: string[] = [];
  
  if (templates.length > 0) {
    parts.push(`Based on ${templates.length} matching template(s)`);
  }
  if (historicalData.length > 0) {
    parts.push(`analyzed ${historicalData.length} similar past project(s)`);
  }
  
  return parts.join(', ') || 'Generated from system defaults';
}

// ==================== BOM CRUD Operations ====================

export async function saveBOM(bom: Partial<BOM>): Promise<string> {
  try {
    const bomData = {
      ...bom,
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'boms'), bomData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving BOM:', error);
    throw error;
  }
}

export async function updateBOM(bomId: string, updates: Partial<BOM>): Promise<void> {
  try {
    const bomRef = doc(db, 'boms', bomId);
    await updateDoc(bomRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating BOM:', error);
    throw error;
  }
}

export async function getBOMById(bomId: string): Promise<BOM | null> {
  try {
    const bomRef = doc(db, 'boms', bomId);
    const bomDoc = await getDoc(bomRef);
    
    if (!bomDoc.exists()) return null;
    
    return { id: bomDoc.id, ...bomDoc.data() } as BOM;
  } catch (error) {
    console.error('Error fetching BOM:', error);
    return null;
  }
}

export async function getAllBOMs(): Promise<BOM[]> {
  try {
    const bomsRef = collection(db, 'boms');
    const q = query(bomsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BOM[];
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    return [];
  }
}

export async function getBOMsByStatus(status: BOMStatus): Promise<BOM[]> {
  try {
    const bomsRef = collection(db, 'boms');
    const q = query(bomsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BOM[];
  } catch (error) {
    console.error('Error fetching BOMs by status:', error);
    return [];
  }
}

export function subscribeToBOMs(callback: (boms: BOM[]) => void) {
  const bomsRef = collection(db, 'boms');
  const q = query(bomsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const boms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BOM[];
    callback(boms);
  });
}

// ==================== BOM Revision ====================

export async function createBOMRevision(
  bomId: string,
  changes: string,
  reason: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const bom = await getBOMById(bomId);
    if (!bom) throw new Error('BOM not found');
    
    const revision: BOMRevision = {
      revisionNumber: bom.version + 1,
      revisedBy: userId,
      revisedByName: userName,
      revisedAt: new Date(),
      changes,
      reason,
      previousData: { ...bom },
    };
    
    await updateBOM(bomId, {
      version: bom.version + 1,
      revisions: [...(bom.revisions || []), revision],
    });
  } catch (error) {
    console.error('Error creating BOM revision:', error);
    throw error;
  }
}

// ==================== Stock Availability ====================

export async function checkStockAvailability(bomId: string): Promise<StockAvailabilityReport> {
  try {
    const bom = await getBOMById(bomId);
    if (!bom) throw new Error('BOM not found');
    
    // Fetch current stock levels
    const materialsRef = collection(db, 'materials');
    const materialsSnapshot = await getDocs(materialsRef);
    const stockMap = new Map();
    
    materialsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      stockMap.set(data.code, data.currentStock || 0);
    });
    
    // Check each component
    const items = bom.components.map(component => {
      const currentStock = stockMap.get(component.itemCode) || 0;
      const requiredQuantity = component.quantity;
      const shortfall = Math.max(0, requiredQuantity - currentStock);
      
      return {
        component,
        currentStock,
        requiredQuantity,
        shortfall,
        estimatedCost: shortfall * component.unitPrice,
        suggestedSupplier: component.supplier,
        estimatedDelivery: component.leadTime,
      };
    });
    
    const summary = {
      totalItems: items.length,
      availableItems: items.filter(i => i.shortfall === 0).length,
      partialItems: items.filter(i => i.shortfall > 0 && i.currentStock > 0).length,
      unavailableItems: items.filter(i => i.currentStock === 0).length,
      readyForProduction: items.every(i => i.shortfall === 0),
    };
    
    return {
      bomId,
      bomNumber: bom.bomNumber,
      generatedAt: new Date(),
      generatedBy: 'system',
      summary,
      items,
    };
  } catch (error) {
    console.error('Error checking stock availability:', error);
    throw error;
  }
}

// ==================== Approval Workflow ====================

export async function submitForPMReview(bomId: string): Promise<void> {
  await updateBOM(bomId, { status: BOMStatus.PM_REVIEW });
}

export async function pmApproveBOM(
  bomId: string,
  userId: string,
  userName: string,
  comments?: string
): Promise<void> {
  await updateBOM(bomId, {
    status: BOMStatus.PM_APPROVED,
    workflow: {
      pmReviewedAt: new Date(),
      pmReviewedBy: userId,
      pmReviewedByName: userName,
      pmComments: comments,
    } as any,
  });
}

export async function submitForMDApproval(bomId: string): Promise<void> {
  await updateBOM(bomId, { status: BOMStatus.MD_REVIEW });
}

export async function mdApproveBOM(
  bomId: string,
  userId: string,
  userName: string,
  comments?: string
): Promise<void> {
  await updateBOM(bomId, {
    status: BOMStatus.MD_APPROVED,
    workflow: {
      mdReviewedAt: new Date(),
      mdReviewedBy: userId,
      mdReviewedByName: userName,
      mdComments: comments,
      mdApprovalDate: new Date(),
    } as any,
  });
}

export async function rejectBOM(
  bomId: string,
  userId: string,
  userName: string,
  reason: string
): Promise<void> {
  await updateBOM(bomId, {
    status: BOMStatus.REJECTED,
    workflow: {
      rejectedAt: new Date(),
      rejectedBy: userId,
      rejectionReason: reason,
    } as any,
  });
}
