// app/actions/productionActions.ts

'use server'; // 👈 Must be at the top
import { db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

// Define the exact data structure being logged
interface ProductionTaskInput {
    projectId: string;
    partType: string;
    partName: string;
    manufacturingProcess: string;
    quantity: number;
    startTime: string;
    endTime: string;
    standardTime: number;
    operatorName: string;
    machineId: string;
    materials: {
        resin: { type: string; quantity: number };
        fiber: { type: string; quantity: number };
        gelcoat: { color: string; quantity: number };
    };
    tei: number;
}

// Data structure returned from Firestore (includes ID and timestamps)
export interface ProductionTask extends ProductionTaskInput {
    id: string;
    timestamp: number; // Storing as milliseconds for client use
    date: string;
    time: string;
}

/**
 * 1. Saves a new production task record to the Firestore database.
 */
export async function recordProductionTask(taskData: ProductionTaskInput): Promise<string> {
    try {
        const docRef = await db.collection('production_logs').add({
            ...taskData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(), // Official server time
        });
        return docRef.id;
    } catch (error) {
        console.error('SERVER ACTION ERROR: Failed to record production task:', error);
        throw new Error('Production data save failed.');
    }
}

/**
 * 2. Fetches the last 50 production tasks for the supervisor or MD dashboard.
 */
export async function getRecentProductionTasks(): Promise<ProductionTask[]> {
    try {
        const snapshot = await db.collection('production_logs')
            .orderBy('createdAt', 'desc')
            .limit(50) // Limit the data size
            .get();

        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to client-friendly fields
            const timestamp = data.createdAt ? data.createdAt.toMillis() : Date.now();
            const dateObj = new Date(timestamp);

            return {
                id: doc.id,
                projectId: data.projectId || 'N/A',
                partType: data.partType || 'N/A',
                partName: data.partName || 'N/A',
                manufacturingProcess: data.manufacturingProcess || 'N/A',
                quantity: data.quantity || 0,
                startTime: data.startTime || '00:00',
                endTime: data.endTime || '00:00',
                standardTime: data.standardTime || 0,
                operatorName: data.operatorName || 'Unknown',
                machineId: data.machineId || 'N/A',
                materials: data.materials || {},
                tei: data.tei || 0,
                timestamp: timestamp,
                date: dateObj.toLocaleDateString(),
                time: dateObj.toLocaleTimeString(),
            } as ProductionTask;
        });

        return tasks;
    } catch (error) {
        console.error('SERVER ACTION ERROR: Failed to fetch tasks:', error);
        return [];
    }
}