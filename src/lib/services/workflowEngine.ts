/**
 * Workflow Automation Service
 * Trigger-based automation system for business processes
 */

import { db } from '@/lib/firebase/client';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { WorkflowAutomation, WorkflowTrigger, WorkflowAction, WorkflowCondition } from '@/types/module';

export class WorkflowEngine {
  private activeWorkflows: Map<string, WorkflowAutomation> = new Map();

  /**
   * Initialize workflow engine and subscribe to active workflows
   */
  async initialize() {
    const q = query(
      collection(db, 'workflow_automations'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((doc) => {
        const workflow = { id: doc.id, ...doc.data() } as WorkflowAutomation;
        this.activeWorkflows.set(workflow.id, workflow);
      });
    });

    return unsubscribe;
  }

  /**
   * Trigger workflows based on an event
   */
  async triggerEvent(eventName: string, eventData: Record<string, any>) {
    const matchingWorkflows = Array.from(this.activeWorkflows.values()).filter(
      w => w.trigger.type === 'event' && w.trigger.event === eventName
    );

    for (const workflow of matchingWorkflows) {
      if (this.evaluateConditions(workflow.trigger.conditions || [], eventData)) {
        await this.executeWorkflow(workflow, eventData);
      }
    }
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(conditions: WorkflowCondition[], data: Record<string, any>): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);

      if (condition.logicalOperator === 'OR' && conditionMet) {
        return true;
      } else if (!conditionMet && condition.logicalOperator !== 'OR') {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: any, operator: string, value: any): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'lt':
        return fieldValue < value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Execute a workflow's actions
   */
  private async executeWorkflow(workflow: WorkflowAutomation, eventData: Record<string, any>) {
    console.log(`Executing workflow: ${workflow.name}`, eventData);

    // Sort actions by order
    const sortedActions = workflow.actions.sort((a, b) => a.order - b.order);

    for (const action of sortedActions) {
      try {
        await this.executeAction(action, eventData, workflow);
        
        // Update success count
        await this.updateWorkflowStats(workflow.id, true);
      } catch (error) {
        console.error(`Error executing action ${action.id}:`, error);
        
        // Update error count
        await this.updateWorkflowStats(workflow.id, false);

        if (!action.continueOnError) {
          break;
        }
      }
    }
  }

  /**
   * Execute a single workflow action
   */
  private async executeAction(action: WorkflowAction, eventData: Record<string, any>, workflow: WorkflowAutomation) {
    switch (action.type) {
      case 'notification':
        await this.sendNotification(action.config, eventData);
        break;
      
      case 'email':
        await this.sendEmail(action.config, eventData);
        break;
      
      case 'webhook':
        await this.callWebhook(action.config, eventData);
        break;
      
      case 'update':
        await this.updateDocument(action.config, eventData);
        break;
      
      case 'create':
        await this.createDocument(action.config, eventData);
        break;
      
      case 'approve':
        await this.autoApprove(action.config, eventData);
        break;
      
      case 'assign':
        await this.assignTask(action.config, eventData);
        break;
      
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(config: Record<string, any>, eventData: Record<string, any>) {
    const notificationData = {
      userId: this.interpolate(config.userId, eventData),
      type: config.type || 'info',
      category: config.category || 'workflow',
      title: this.interpolate(config.title, eventData),
      message: this.interpolate(config.message, eventData),
      actionUrl: config.actionUrl ? this.interpolate(config.actionUrl, eventData) : undefined,
      actionLabel: config.actionLabel,
      isRead: false,
      isPinned: false,
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'notifications'), notificationData);
  }

  /**
   * Send email (placeholder for email integration)
   */
  private async sendEmail(config: Record<string, any>, eventData: Record<string, any>) {
    console.log('Sending email:', {
      to: this.interpolate(config.to, eventData),
      subject: this.interpolate(config.subject, eventData),
      body: this.interpolate(config.body, eventData)
    });
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  }

  /**
   * Call webhook
   */
  private async callWebhook(config: Record<string, any>, eventData: Record<string, any>) {
    const url = this.interpolate(config.url, eventData);
    const method = config.method || 'POST';
    const headers = config.headers || { 'Content-Type': 'application/json' };
    const body = config.body ? this.interpolate(JSON.stringify(config.body), eventData) : JSON.stringify(eventData);

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Update document in Firestore
   */
  private async updateDocument(config: Record<string, any>, eventData: Record<string, any>) {
    const collectionName = config.collection;
    const documentId = this.interpolate(config.documentId, eventData);
    const updates = this.interpolateObject(config.updates, eventData);

    await updateDoc(doc(db, collectionName, documentId), updates);
  }

  /**
   * Create document in Firestore
   */
  private async createDocument(config: Record<string, any>, eventData: Record<string, any>) {
    const collectionName = config.collection;
    const data = this.interpolateObject(config.data, eventData);

    await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Auto-approve a document
   */
  private async autoApprove(config: Record<string, any>, eventData: Record<string, any>) {
    const collectionName = config.collection;
    const documentId = this.interpolate(config.documentId, eventData);

    await updateDoc(doc(db, collectionName, documentId), {
      status: 'approved',
      approvedBy: 'system_automation',
      approvedAt: new Date().toISOString(),
      autoApproved: true
    });
  }

  /**
   * Assign task to user
   */
  private async assignTask(config: Record<string, any>, eventData: Record<string, any>) {
    const collectionName = config.collection;
    const documentId = this.interpolate(config.documentId, eventData);
    const userId = this.interpolate(config.userId, eventData);

    await updateDoc(doc(db, collectionName, documentId), {
      assignedTo: userId,
      assignedAt: new Date().toISOString()
    });
  }

  /**
   * Interpolate variables in a string (e.g., "Hello {{name}}")
   */
  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return String(this.getNestedValue(data, path) || match);
    });
  }

  /**
   * Interpolate all values in an object
   */
  private interpolateObject(obj: Record<string, any>, data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolate(value, data);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Update workflow statistics
   */
  private async updateWorkflowStats(workflowId: string, success: boolean) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const updates: Record<string, any> = {
      lastRun: new Date().toISOString(),
      runCount: (workflow.runCount || 0) + 1
    };

    if (success) {
      updates.successCount = (workflow.successCount || 0) + 1;
    } else {
      updates.errorCount = (workflow.errorCount || 0) + 1;
    }

    await updateDoc(doc(db, 'workflow_automations', workflowId), updates);
  }
}

// Singleton instance
export const workflowEngine = new WorkflowEngine();

// Helper function to trigger workflows from anywhere in the app
export const triggerWorkflow = async (eventName: string, eventData: Record<string, any>) => {
  await workflowEngine.triggerEvent(eventName, eventData);
};

// Pre-defined workflow templates
export const WORKFLOW_TEMPLATES = [
  {
    name: 'Auto-approve low-value POs',
    description: 'Automatically approve purchase orders below ₹10,000',
    moduleId: 'purchase_advanced',
    trigger: {
      type: 'event' as const,
      event: 'po_created',
      conditions: [
        { field: 'totalAmount', operator: 'lt' as const, value: 10000 }
      ]
    },
    actions: [
      {
        id: '1',
        type: 'approve' as const,
        config: {
          collection: 'purchase_orders',
          documentId: '{{id}}'
        },
        order: 1,
        continueOnError: false
      },
      {
        id: '2',
        type: 'notification' as const,
        config: {
          userId: '{{createdBy}}',
          type: 'success',
          category: 'approval',
          title: 'PO Auto-Approved',
          message: 'Your purchase order {{poNumber}} has been automatically approved.'
        },
        order: 2,
        continueOnError: true
      }
    ]
  },
  {
    name: 'Low stock alert',
    description: 'Send notification when material stock falls below minimum',
    moduleId: 'inventory_core',
    trigger: {
      type: 'event' as const,
      event: 'stock_updated',
      conditions: [
        { field: 'currentStock', operator: 'lt' as const, value: '{{minStock}}' }
      ]
    },
    actions: [
      {
        id: '1',
        type: 'notification' as const,
        config: {
          userId: 'all_purchase_users',
          type: 'warning',
          category: 'stock',
          title: 'Low Stock Alert',
          message: 'Material {{materialName}} ({{materialCode}}) is running low. Current: {{currentStock}}, Min: {{minStock}}'
        },
        order: 1,
        continueOnError: false
      }
    ]
  },
  {
    name: 'Deadline reminder',
    description: 'Send reminder 1 day before work order deadline',
    moduleId: 'manufacturing_core',
    trigger: {
      type: 'schedule' as const,
      schedule: {
        cron: '0 9 * * *', // Daily at 9 AM
        timezone: 'Asia/Kolkata'
      }
    },
    actions: [
      {
        id: '1',
        type: 'notification' as const,
        config: {
          userId: '{{assignedTo}}',
          type: 'warning',
          category: 'deadline',
          title: 'Work Order Deadline Approaching',
          message: 'Work order {{woNumber}} is due tomorrow!'
        },
        order: 1,
        continueOnError: false
      }
    ]
  }
];
