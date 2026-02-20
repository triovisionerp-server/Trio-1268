// BOM to Purchase Order Integration Service
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { BOM, StockAvailabilityReport } from '@/types/bom';
import { PurchaseOrder, POItem, VendorDetails } from '@/types/purchase';

// ==================== BOM to PO Generation ====================

/**
 * Generate Purchase Orders from BOM with stock shortfall
 * Groups items by supplier and creates separate POs
 */
export async function generatePOsFromBOM(
  bomId: string,
  stockReport: StockAvailabilityReport,
  createdBy: string,
  createdByName: string
): Promise<{ pos: PurchaseOrder[]; summary: any }> {
  try {
    // Get BOM details
    const bomRef = doc(db, 'boms', bomId);
    const bomDoc = await getDoc(bomRef);
    
    if (!bomDoc.exists()) {
      throw new Error('BOM not found');
    }
    
    const bom = { id: bomDoc.id, ...bomDoc.data() } as BOM;

    // Group items by supplier
    const itemsBySupplier = new Map<string, typeof stockReport.items>();
    
    stockReport.items.forEach(item => {
      if (item.shortfall > 0 && item.suggestedSupplier) {
        const supplierId = item.suggestedSupplier;
        if (!itemsBySupplier.has(supplierId)) {
          itemsBySupplier.set(supplierId, []);
        }
        itemsBySupplier.get(supplierId)!.push(item);
      }
    });

    // Fetch supplier details
    const suppliersRef = collection(db, 'suppliers');
    const suppliersSnapshot = await getDocs(suppliersRef);
    const suppliersMap = new Map();
    
    suppliersSnapshot.docs.forEach(doc => {
      suppliersMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Generate PO for each supplier
    const generatedPOs: PurchaseOrder[] = [];
    const poIds: string[] = [];

    for (const [supplierId, items] of itemsBySupplier.entries()) {
      const supplierData = suppliersMap.get(supplierId);
      
      if (!supplierData) {
        console.warn(`Supplier ${supplierId} not found, skipping...`);
        continue;
      }

      // Create vendor details
      const vendorDetails: VendorDetails = {
        id: supplierData.id,
        name: supplierData.name,
        contact: supplierData.contact || supplierData.contactPerson,
        phone: supplierData.phone || supplierData.contact,
        email: supplierData.email || '',
        gstin: supplierData.gst || supplierData.gstin || '',
        address: supplierData.address || '',
        city: supplierData.city || '',
        state: supplierData.state || '',
        pincode: supplierData.pincode || '',
        materialsSupplied: supplierData.materials_supplied || [],
      };

      // Create PO items
      const poItems: POItem[] = items.map(item => {
        const unitPrice = item.component.unitPrice || item.estimatedCost / item.shortfall;
        const gstPercent = 18; // Standard GST
        const totalPrice = item.shortfall * unitPrice;
        const gstAmount = totalPrice * (gstPercent / 100);

        return {
          itemID: item.component.itemCode,
          itemName: item.component.itemName,
          itemCode: item.component.itemCode,
          quantity: item.shortfall,
          unit: item.component.unit,
          unitPrice,
          totalPrice,
          gstPercent,
          gstAmount,
        };
      });

      // Calculate totals
      const subtotal = poItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const gstAmount = poItems.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
      const totalAmount = subtotal + gstAmount;

      // Generate PO number
      const poNumber = await generatePONumber();

      // Create PO
      const purchaseOrder: Omit<PurchaseOrder, 'id'> = {
        poNumber,
        bomId: bom.id!,
        bomNumber: bom.bomNumber,
        projectId: bom.projectId || '',
        projectName: bom.projectName,
        vendorDetails,
        items: poItems,
        subtotal,
        gstAmount,
        totalAmount,
        status: totalAmount > 100000 ? 'pending_md_approval' : 'draft',
        requiresMDApproval: totalAmount > 100000,
        approvalSteps: totalAmount > 100000 ? [
          {
            step: 1,
            approverRole: 'Managing Director',
            status: 'pending',
          }
        ] : [],
        currentApprovalStep: totalAmount > 100000 ? 1 : 0,
        createdBy,
        createdByName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentTerms: '30 days',
        deliveryTerms: 'FOB',
        expectedDelivery: calculateExpectedDelivery(items),
      };

      // Save to Firestore
      const poRef = await addDoc(collection(db, 'purchase_orders'), purchaseOrder);
      poIds.push(poRef.id);

      generatedPOs.push({
        id: poRef.id,
        ...purchaseOrder,
      } as PurchaseOrder);
    }

    // Update BOM with linked POs
    await updateDoc(bomRef, {
      linkedPurchaseOrders: poIds,
      status: 'po_generated',
      updatedAt: Timestamp.now(),
    });

    const summary = {
      totalPOs: generatedPOs.length,
      totalAmount: generatedPOs.reduce((sum, po) => sum + po.totalAmount, 0),
      totalItems: generatedPOs.reduce((sum, po) => sum + po.items.length, 0),
      mdApprovalRequired: generatedPOs.some(po => po.requiresMDApproval),
    };

    return { pos: generatedPOs, summary };

  } catch (error) {
    console.error('Error generating POs from BOM:', error);
    throw error;
  }
}

/**
 * Generate unique PO number
 */
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const posRef = collection(db, 'purchase_orders');
  const snapshot = await getDocs(posRef);
  
  const count = snapshot.size + 1;
  return `PO-${year}-${String(count).padStart(5, '0')}`;
}

/**
 * Calculate expected delivery date based on lead times
 */
function calculateExpectedDelivery(items: any[]): string {
  const maxLeadTime = Math.max(...items.map(item => item.estimatedDelivery || 7));
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + maxLeadTime);
  return deliveryDate.toISOString().split('T')[0];
}

// ==================== Project-PO Linking ====================

/**
 * Link PO to project and track project purchases
 */
export async function linkPOToProject(
  poId: string,
  projectId: string,
  projectName: string
): Promise<void> {
  try {
    const poRef = doc(db, 'purchase_orders', poId);
    
    await updateDoc(poRef, {
      projectId,
      projectName,
      updatedAt: Timestamp.now(),
    });

    // Create project purchase tracking record
    await addDoc(collection(db, 'project_purchases'), {
      projectId,
      projectName,
      poId,
      linkedAt: Timestamp.now(),
      status: 'linked',
    });

  } catch (error) {
    console.error('Error linking PO to project:', error);
    throw error;
  }
}

/**
 * Get all POs linked to a project
 */
export async function getProjectPOs(projectId: string): Promise<PurchaseOrder[]> {
  try {
    const posRef = collection(db, 'purchase_orders');
    const q = query(posRef, where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];

  } catch (error) {
    console.error('Error fetching project POs:', error);
    return [];
  }
}

// ==================== Store Material Issuance ====================

/**
 * Issue materials from store based on PO receipt
 * This is called after goods are received against a PO
 */
export async function issueMaterialsFromPO(
  poId: string,
  projectId: string,
  issuedBy: string,
  issuedByName: string,
  itemsToIssue: {
    materialCode: string;
    materialName: string;
    quantity: number;
    unit: string;
  }[]
): Promise<{ success: boolean; issueId?: string }> {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get PO details
      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await transaction.get(poRef);
      
      if (!poDoc.exists()) {
        throw new Error('PO not found');
      }
      
      const po = poDoc.data() as PurchaseOrder;

      // Validate PO is received
      if (po.status !== 'received' && po.status !== 'partially_received') {
        throw new Error('Can only issue materials from received POs');
      }

      // Check stock availability and create issue records
      const issueRecords = [];
      
      for (const item of itemsToIssue) {
        // Get current stock
        const materialsRef = collection(db, 'materials');
        const q = query(materialsRef, where('code', '==', item.materialCode));
        const materialsSnapshot = await getDocs(q);
        
        if (materialsSnapshot.empty) {
          throw new Error(`Material ${item.materialCode} not found in inventory`);
        }
        
        const materialDoc = materialsSnapshot.docs[0];
        const materialData = materialDoc.data();
        const currentStock = materialData.currentStock || 0;
        
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.materialName}. Available: ${currentStock}, Required: ${item.quantity}`);
        }

        // Update stock
        const newStock = currentStock - item.quantity;
        transaction.update(materialDoc.ref, {
          currentStock: newStock,
          lastUpdated: Timestamp.now(),
        });

        // Create issue record
        issueRecords.push({
          material: item.materialName,
          materialCode: item.materialCode,
          quantity: item.quantity,
          unit: item.unit,
          team: po.projectName || 'Unknown Project',
          project: po.projectName || '',
          projectId: projectId,
          poId: poId,
          poNumber: po.poNumber,
          date: Timestamp.now(),
          entered_by: issuedByName,
          enteredById: issuedBy,
          previousStock: currentStock,
          newStock: newStock,
          issueType: 'project_issue',
        });
      }

      // Save all issue records
      for (const record of issueRecords) {
        const issueRef = collection(db, 'issue_records');
        await addDoc(issueRef, record);
      }

      // Update PO issue status
      transaction.update(poRef, {
        materialsIssued: true,
        issuedAt: Timestamp.now(),
        issuedBy,
        issuedToProject: projectId,
        updatedAt: Timestamp.now(),
      });

      return { success: true, issueId: issueRecords[0]?.material };
    });

  } catch (error) {
    console.error('Error issuing materials from PO:', error);
    throw error;
  }
}

/**
 * Get material issue history for a project
 */
export async function getProjectMaterialIssues(projectId: string): Promise<any[]> {
  try {
    const issuesRef = collection(db, 'issue_records');
    const q = query(issuesRef, where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(doc.data().date)
    }));

  } catch (error) {
    console.error('Error fetching project issues:', error);
    return [];
  }
}

/**
 * Check if materials can be issued from store for a PO
 */
export async function checkPOMaterialAvailability(poId: string): Promise<{
  canIssue: boolean;
  items: Array<{
    materialCode: string;
    materialName: string;
    requiredQty: number;
    availableStock: number;
    shortfall: number;
  }>;
}> {
  try {
    const poRef = doc(db, 'purchase_orders', poId);
    const poDoc = await getDoc(poRef);
    
    if (!poDoc.exists()) {
      throw new Error('PO not found');
    }
    
    const po = poDoc.data() as PurchaseOrder;
    
    const items = await Promise.all(
      po.items.map(async (poItem) => {
        // Get current stock
        const materialsRef = collection(db, 'materials');
        const q = query(materialsRef, where('code', '==', poItem.itemCode));
        const snapshot = await getDocs(q);
        
        const availableStock = snapshot.empty ? 0 : (snapshot.docs[0].data().currentStock || 0);
        const requiredQty = poItem.quantity;
        const shortfall = Math.max(0, requiredQty - availableStock);
        
        return {
          materialCode: poItem.itemCode,
          materialName: poItem.itemName,
          requiredQty,
          availableStock,
          shortfall,
        };
      })
    );
    
    const canIssue = items.every(item => item.shortfall === 0);
    
    return { canIssue, items };

  } catch (error) {
    console.error('Error checking PO material availability:', error);
    throw error;
  }
}

// ==================== Goods Receipt Integration ====================

/**
 * Receive goods against PO and update inventory
 */
export async function receiveGoodsFromPO(
  poId: string,
  receivedBy: string,
  receivedByName: string,
  itemsReceived: {
    itemCode: string;
    itemName: string;
    quantityReceived: number;
    unit: string;
    remarks?: string;
  }[]
): Promise<{ success: boolean; grnId?: string }> {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get PO
      const poRef = doc(db, 'purchase_orders', poId);
      const poDoc = await transaction.get(poRef);
      
      if (!poDoc.exists()) {
        throw new Error('PO not found');
      }
      
      const po = poDoc.data() as PurchaseOrder;

      // Generate GRN number
      const grnNumber = `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Update inventory for each item
      for (const item of itemsReceived) {
        const materialsRef = collection(db, 'materials');
        const q = query(materialsRef, where('code', '==', item.itemCode));
        const materialsSnapshot = await getDocs(q);
        
        if (!materialsSnapshot.empty) {
          const materialDoc = materialsSnapshot.docs[0];
          const currentStock = materialDoc.data().currentStock || 0;
          const newStock = currentStock + item.quantityReceived;
          
          transaction.update(materialDoc.ref, {
            currentStock: newStock,
            lastUpdated: Timestamp.now(),
            lastSupplier: po.vendorDetails.name,
            lastUnitPrice: po.items.find(i => i.itemCode === item.itemCode)?.unitPrice || 0,
          });
        }
      }

      // Create GRN record
      const grnData = {
        grnNumber,
        poId,
        poNumber: po.poNumber,
        vendorName: po.vendorDetails.name,
        receivedBy,
        receivedByName,
        receivedAt: Timestamp.now(),
        items: itemsReceived,
        status: 'received',
      };
      
      const grnRef = await addDoc(collection(db, 'goods_receipts'), grnData);

      // Update PO status
      const allItemsReceived = itemsReceived.length === po.items.length;
      transaction.update(poRef, {
        status: allItemsReceived ? 'received' : 'partially_received',
        grnNumber,
        grnId: grnRef.id,
        receivedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Create purchase entry for each item (for inventory tracking)
      for (const item of itemsReceived) {
        const poItem = po.items.find(i => i.itemCode === item.itemCode);
        if (poItem) {
          await addDoc(collection(db, 'purchase_entries'), {
            material: item.itemName,
            materialCode: item.itemCode,
            supplier: po.vendorDetails.name,
            quantity: item.quantityReceived,
            unit: item.unit,
            unit_price: poItem.unitPrice,
            total_price: poItem.unitPrice * item.quantityReceived,
            date: Timestamp.now(),
            entered_by: receivedByName,
            invoice_number: po.poNumber,
            grnNumber,
            poId,
            projectId: po.projectId,
            projectName: po.projectName,
          });
        }
      }

      return { success: true, grnId: grnRef.id };
    });

  } catch (error) {
    console.error('Error receiving goods from PO:', error);
    throw error;
  }
}

/**
 * Get complete project material flow
 * BOM → PO → GRN → Issues
 */
export async function getProjectMaterialFlow(projectId: string): Promise<{
  boms: BOM[];
  purchaseOrders: PurchaseOrder[];
  totalPurchaseValue: number;
  materialsIssued: any[];
  totalIssued: number;
}> {
  try {
    // Get BOMs for project
    const bomsRef = collection(db, 'boms');
    const bomsQuery = query(bomsRef, where('projectId', '==', projectId));
    const bomsSnapshot = await getDocs(bomsQuery);
    const boms = bomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BOM[];

    // Get POs for project
    const purchaseOrders = await getProjectPOs(projectId);
    const totalPurchaseValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);

    // Get issued materials
    const materialsIssued = await getProjectMaterialIssues(projectId);
    const totalIssued = materialsIssued.reduce((sum, issue) => sum + issue.quantity, 0);

    return {
      boms,
      purchaseOrders,
      totalPurchaseValue,
      materialsIssued,
      totalIssued,
    };

  } catch (error) {
    console.error('Error fetching project material flow:', error);
    throw error;
  }
}
