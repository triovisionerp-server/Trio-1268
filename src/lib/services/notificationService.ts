/**
 * WhatsApp & SMS Notification Service
 * Integrates with Twilio API for critical alerts
 */

export interface NotificationMessage {
  to: string; // Phone number with country code: +91XXXXXXXXXX
  message: string;
  type: 'whatsapp' | 'sms';
  priority?: 'urgent' | 'high' | 'normal';
  metadata?: {
    category?: string;
    referenceId?: string;
    userId?: string;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms';
  template: string; // Template with {{variables}}
  trigger: string;
}

// Pre-defined notification templates
export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'low_stock_alert',
    name: 'Low Stock Alert',
    type: 'whatsapp',
    template: '🚨 *Low Stock Alert*\n\nMaterial: {{materialName}}\nCurrent Stock: {{currentStock}} {{unit}}\nMin Stock: {{minStock}} {{unit}}\n\nAction Required: Place purchase order immediately\n\n- Triovision ERP',
    trigger: 'stock_below_min'
  },
  {
    id: 'po_approval_pending',
    name: 'PO Approval Pending',
    type: 'sms',
    template: 'Purchase Order {{poNumber}} awaiting your approval. Amount: ₹{{totalAmount}}. Login to approve: https://erp.triovision.com',
    trigger: 'po_awaiting_approval'
  },
  {
    id: 'delivery_delayed',
    name: 'Delivery Delayed',
    type: 'whatsapp',
    template: '⚠️ *Delivery Delay Alert*\n\nPO: {{poNumber}}\nSupplier: {{supplierName}}\nExpected: {{expectedDate}}\nStatus: Overdue by {{daysLate}} days\n\nAction: Contact supplier immediately',
    trigger: 'delivery_overdue'
  },
  {
    id: 'work_order_deadline',
    name: 'Work Order Deadline',
    type: 'whatsapp',
    template: '⏰ *Deadline Reminder*\n\nWork Order: {{woNumber}}\nProject: {{projectName}}\nDeadline: {{deadline}}\nCurrent Progress: {{progress}}%\n\nPlease update status on ERP dashboard',
    trigger: 'deadline_approaching'
  },
  {
    id: 'quality_issue',
    name: 'Quality Issue Alert',
    type: 'whatsapp',
    template: '🔴 *URGENT: Quality Issue*\n\nBatch: {{batchNumber}}\nIssue: {{issueDescription}}\nReported By: {{reporterName}}\n\nImmediate action required. Check dashboard for details.',
    trigger: 'quality_rejection'
  },
  {
    id: 'production_milestone',
    name: 'Production Milestone',
    type: 'sms',
    template: '✅ Milestone Achieved! Project {{projectName}} reached {{milestone}}. Great work team!',
    trigger: 'milestone_completed'
  },
  {
    id: 'supplier_payment_due',
    name: 'Supplier Payment Due',
    type: 'whatsapp',
    template: '💰 *Payment Due Reminder*\n\nSupplier: {{supplierName}}\nInvoice: {{invoiceNumber}}\nAmount: ₹{{amount}}\nDue Date: {{dueDate}}\n\nPlease process payment to avoid delays',
    trigger: 'payment_due'
  },
  {
    id: 'new_user_welcome',
    name: 'New User Welcome',
    type: 'sms',
    template: 'Welcome to Triovision ERP! Your account has been created. Username: {{username}}. Login at https://erp.triovision.com',
    trigger: 'user_created'
  }
];

/**
 * WhatsApp & SMS Notification Service
 */
export class NotificationService {
  private twilioAccountSid: string = '';
  private twilioAuthToken: string = '';
  private twilioPhoneNumber: string = '';
  private twilioWhatsAppNumber: string = 'whatsapp:+14155238886'; // Twilio Sandbox
  private isConfigured: boolean = false;

  /**
   * Configure Twilio credentials
   */
  configure(config: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    whatsappNumber?: string;
  }) {
    this.twilioAccountSid = config.accountSid;
    this.twilioAuthToken = config.authToken;
    this.twilioPhoneNumber = config.phoneNumber;
    if (config.whatsappNumber) {
      this.twilioWhatsAppNumber = config.whatsappNumber;
    }
    this.isConfigured = true;
    console.log('✅ Notification service configured');
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('⚠️ Notification service not configured. Set Twilio credentials first.');
      // In dev mode, log the message instead of sending
      console.log(`[WhatsApp to ${to}]: ${message}`);
      return true;
    }

    try {
      // Twilio API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('From', this.twilioWhatsAppNumber);
      formData.append('To', `whatsapp:${to}`);
      formData.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.twilioAccountSid}:${this.twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('WhatsApp send error:', error);
        return false;
      }

      const result = await response.json();
      console.log('✅ WhatsApp sent:', result.sid);
      return true;

    } catch (error) {
      console.error('WhatsApp error:', error);
      return false;
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('⚠️ Notification service not configured. Set Twilio credentials first.');
      // In dev mode, log the message instead of sending
      console.log(`[SMS to ${to}]: ${message}`);
      return true;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('From', this.twilioPhoneNumber);
      formData.append('To', to);
      formData.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.twilioAccountSid}:${this.twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('SMS send error:', error);
        return false;
      }

      const result = await response.json();
      console.log('✅ SMS sent:', result.sid);
      return true;

    } catch (error) {
      console.error('SMS error:', error);
      return false;
    }
  }

  /**
   * Send notification using template
   */
  async sendTemplateNotification(
    templateId: string, 
    to: string, 
    variables: Record<string, string>
  ): Promise<boolean> {
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      console.error(`Template ${templateId} not found`);
      return false;
    }

    // Replace variables in template
    let message = template.template;
    Object.keys(variables).forEach(key => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    });

    // Send via appropriate channel
    if (template.type === 'whatsapp') {
      return this.sendWhatsApp(to, message);
    } else {
      return this.sendSMS(to, message);
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(notifications: NotificationMessage[]): Promise<{
    success: number;
    failed: number;
    results: boolean[];
  }> {
    const results = await Promise.all(
      notifications.map(notification => {
        if (notification.type === 'whatsapp') {
          return this.sendWhatsApp(notification.to, notification.message);
        } else {
          return this.sendSMS(notification.to, notification.message);
        }
      })
    );

    return {
      success: results.filter(r => r).length,
      failed: results.filter(r => !r).length,
      results
    };
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
  }

  /**
   * List all templates
   */
  listTemplates(): NotificationTemplate[] {
    return NOTIFICATION_TEMPLATES;
  }
}

// Singleton instance
export const notificationService = new NotificationService();

/**
 * Quick notification functions
 */
export const sendLowStockAlert = async (materialName: string, currentStock: number, minStock: number, unit: string, managerPhone: string) => {
  return notificationService.sendTemplateNotification('low_stock_alert', managerPhone, {
    materialName,
    currentStock: String(currentStock),
    minStock: String(minStock),
    unit
  });
};

export const sendPOApprovalRequest = async (poNumber: string, totalAmount: number, approverPhone: string) => {
  return notificationService.sendTemplateNotification('po_approval_pending', approverPhone, {
    poNumber,
    totalAmount: totalAmount.toFixed(2)
  });
};

export const sendDeliveryDelayAlert = async (
  poNumber: string, 
  supplierName: string, 
  expectedDate: string, 
  daysLate: number, 
  managerPhone: string
) => {
  return notificationService.sendTemplateNotification('delivery_delayed', managerPhone, {
    poNumber,
    supplierName,
    expectedDate,
    daysLate: String(daysLate)
  });
};

export const sendWorkOrderDeadline = async (
  woNumber: string, 
  projectName: string, 
  deadline: string, 
  progress: number, 
  assigneePhone: string
) => {
  return notificationService.sendTemplateNotification('work_order_deadline', assigneePhone, {
    woNumber,
    projectName,
    deadline,
    progress: String(progress)
  });
};

/**
 * Emergency broadcast to management team
 */
export const sendEmergencyBroadcast = async (message: string, phoneNumbers: string[]) => {
  const notifications: NotificationMessage[] = phoneNumbers.map(phone => ({
    to: phone,
    message: `🚨 URGENT ALERT 🚨\n\n${message}\n\n- Triovision ERP`,
    type: 'whatsapp' as const,
    priority: 'urgent' as const
  }));

  return notificationService.sendBulk(notifications);
};

/**
 * Integration with workflow engine
 * Call this when workflow triggers need to send notifications
 */
export const handleWorkflowNotification = async (
  action: any, // Workflow action from workflowEngine
  context: any // Event context data
) => {
  const { recipient, template, variables } = action.config;

  // Get recipient phone number
  let phoneNumber = recipient;
  if (recipient.startsWith('user:')) {
    // Fetch user phone from Firebase
    const userId = recipient.split(':')[1];
    // TODO: Implement user phone lookup
    phoneNumber = '+919876543210'; // Placeholder
  }

  // Send notification
  if (template) {
    return notificationService.sendTemplateNotification(template, phoneNumber, variables);
  } else {
    return notificationService.sendWhatsApp(phoneNumber, action.config.message);
  }
};
