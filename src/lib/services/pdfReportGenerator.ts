/**
 * Advanced PDF Report Generator
 * Generate professional PDF reports for POs, Invoices, Deliveries, Analytics
 */

export interface ReportTemplate {
  type: 'purchase_order' | 'invoice' | 'delivery_challan' | 'work_order' | 'inventory_report' | 'analytics';
  title: string;
  data: any;
  options?: {
    includeCompanyLogo?: boolean;
    includeSignature?: boolean;
    includeTerms?: boolean;
    watermark?: string;
    headerColor?: string;
  };
}

export class PDFReportGenerator {
  private companyInfo = {
    name: 'Triovision Manufacturing Pvt. Ltd.',
    address: 'Industrial Area, Phase-II, Chandigarh',
    phone: '+91-172-XXXXXXX',
    email: 'info@triovision.com',
    gst: '07XXXXX1234X1ZX',
    website: 'www.triovision.com'
  };

  /**
   * Generate PDF report (returns HTML for now - integrate with jsPDF/pdfmake later)
   */
  async generateReport(template: ReportTemplate): Promise<string> {
    switch (template.type) {
      case 'purchase_order':
        return this.generatePOReport(template.data, template.options);
      case 'invoice':
        return this.generateInvoiceReport(template.data, template.options);
      case 'delivery_challan':
        return this.generateDCReport(template.data, template.options);
      case 'work_order':
        return this.generateWOReport(template.data, template.options);
      case 'inventory_report':
        return this.generateInventoryReport(template.data, template.options);
      case 'analytics':
        return this.generateAnalyticsReport(template.data, template.options);
      default:
        throw new Error(`Unknown report type: ${template.type}`);
    }
  }

  /**
   * Download report as PDF
   */
  async downloadAsPDF(html: string, filename: string) {
    // Create a temporary element with the HTML
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print(); window.close();" 
            style="position: fixed; top: 10px; right: 10px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print / Save as PDF
          </button>
          ${html}
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  /**
   * Purchase Order Report
   */
  private generatePOReport(po: any, options: any = {}): string {
    const items = po.items || [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const gst = subtotal * 0.18; // 18% GST
    const total = subtotal + gst;

    return `
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h1 style="margin: 0; color: #1e293b; font-size: 32px;">${this.companyInfo.name}</h1>
              <p style="margin: 5px 0; color: #64748b;">${this.companyInfo.address}</p>
              <p style="margin: 5px 0; color: #64748b;">Ph: ${this.companyInfo.phone} | Email: ${this.companyInfo.email}</p>
              <p style="margin: 5px 0; color: #64748b;">GSTIN: ${this.companyInfo.gst}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #3b82f6; font-size: 28px;">PURCHASE ORDER</h2>
              <p style="margin: 10px 0; font-size: 18px;"><strong>${po.poNumber}</strong></p>
              <p style="margin: 5px 0; color: #64748b;">Date: ${new Date(po.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <!-- Supplier Details -->
        <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b;">Supplier Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #64748b; width: 150px;">Name:</td>
              <td style="padding: 5px 0; color: #1e293b;"><strong>${po.supplierName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Contact:</td>
              <td style="padding: 5px 0; color: #1e293b;">${po.supplierContact || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">GST:</td>
              <td style="padding: 5px 0; color: #1e293b;">${po.supplierGST || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Expected Delivery:</td>
              <td style="padding: 5px 0; color: #1e293b;">${new Date(po.expectedDelivery).toLocaleDateString()}</td>
            </tr>
          </table>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">S.No</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Material Code</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Description</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Qty</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Unit</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Rate (₹)</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, index: number) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${index + 1}</td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.materialCode}</td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.materialName}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${item.quantity}</td>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.unit}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${item.unitPrice.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;"><strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="margin-left: auto; width: 350px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; text-align: right; color: #64748b;">Subtotal:</td>
              <td style="padding: 8px; text-align: right; font-size: 16px;">₹ ${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; text-align: right; color: #64748b;">GST (18%):</td>
              <td style="padding: 8px; text-align: right; font-size: 16px;">₹ ${gst.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #1e293b;">
              <td style="padding: 12px; text-align: right; font-size: 18px; font-weight: bold; color: #1e293b;">Total:</td>
              <td style="padding: 12px; text-align: right; font-size: 20px; font-weight: bold; color: #3b82f6;">₹ ${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Terms & Conditions -->
        ${options.includeTerms !== false ? `
          <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #1e293b;">Terms & Conditions:</h3>
            <ol style="margin: 0; padding-left: 20px; color: #64748b;">
              <li style="margin-bottom: 5px;">Delivery should be made as per the schedule mentioned above</li>
              <li style="margin-bottom: 5px;">Material should comply with specifications</li>
              <li style="margin-bottom: 5px;">Payment terms: 30 days from delivery</li>
              <li style="margin-bottom: 5px;">Please quote PO number on all correspondence</li>
              <li style="margin-bottom: 5px;">Quality certificate must be provided with delivery</li>
            </ol>
          </div>
        ` : ''}

        <!-- Signature -->
        ${options.includeSignature !== false ? `
          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 200px;">
              <div style="border-top: 2px solid #1e293b; padding-top: 10px; margin-top: 60px;">
                <p style="margin: 0; color: #64748b;">Authorized Signature</p>
              </div>
            </div>
            <div style="text-align: center; width: 200px;">
              <div style="border-top: 2px solid #1e293b; padding-top: 10px; margin-top: 60px;">
                <p style="margin: 0; color: #64748b;">Company Seal</p>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p>This is a computer generated document and does not require a signature</p>
          <p>${this.companyInfo.website} | ${this.companyInfo.email}</p>
        </div>
      </div>
    `;
  }

  /**
   * Invoice Report (similar structure to PO)
   */
  private generateInvoiceReport(invoice: any, options: any = {}): string {
    // Similar to PO but with invoice-specific fields
    return this.generatePOReport(invoice, options).replace('PURCHASE ORDER', 'TAX INVOICE');
  }

  /**
   * Delivery Challan Report
   */
  private generateDCReport(dc: any, options: any = {}): string {
    return `
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px;">
        <h1 style="color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 15px;">DELIVERY CHALLAN</h1>
        <p><strong>DC No:</strong> ${dc.dcNumber}</p>
        <p><strong>Date:</strong> ${new Date(dc.date).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${dc.customerName}</p>
        <p><strong>Vehicle No:</strong> ${dc.vehicleNo || 'N/A'}</p>
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 10px; border: 1px solid #ccc;">Item</th>
              <th style="padding: 10px; border: 1px solid #ccc;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${(dc.items || []).map((item: any) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ccc;">${item.name}</td>
                <td style="padding: 10px; border: 1px solid #ccc;">${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 60px;">
          <p><strong>Received By:</strong> _______________________</p>
          <p><strong>Signature:</strong> _______________________</p>
        </div>
      </div>
    `;
  }

  /**
   * Work Order Report
   */
  private generateWOReport(wo: any, options: any = {}): string {
    return `
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px;">
        <h1 style="color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 15px;">WORK ORDER</h1>
        <p><strong>WO No:</strong> ${wo.woNumber}</p>
        <p><strong>Project:</strong> ${wo.projectName}</p>
        <p><strong>Department:</strong> ${wo.department}</p>
        <p><strong>Assigned To:</strong> ${wo.assignedToName}</p>
        <p><strong>Deadline:</strong> ${new Date(wo.deadline).toLocaleDateString()}</p>
        <p><strong>Priority:</strong> ${wo.priority}</p>
        <div style="margin-top: 20px;">
          <h3>Description:</h3>
          <p>${wo.description}</p>
        </div>
        <div style="margin-top: 20px;">
          <h3>Materials Required:</h3>
          <ul>
            ${(wo.materials || []).map((m: any) => `<li>${m.name} - ${m.quantity} ${m.unit}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Inventory Report
   */
  private generateInventoryReport(data: any, options: any = {}): string {
    const materials = data.materials || [];
    return `
      <div style="max-width: 1000px; margin: 0 auto; background: white; padding: 40px;">
        <h1 style="color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 15px;">INVENTORY REPORT</h1>
        <p><strong>Generated On:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Items:</strong> ${materials.length}</p>
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 8px; border: 1px solid #ccc;">Code</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Name</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Current Stock</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Min Stock</th>
              <th style="padding: 8px; border: 1px solid #ccc;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map((m: any) => {
              const status = (m.currentStock || 0) < (m.minStock || 0) ? 'LOW' : 'OK';
              const statusColor = status === 'LOW' ? '#ef4444' : '#10b981';
              return `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ccc;">${m.code}</td>
                  <td style="padding: 8px; border: 1px solid #ccc;">${m.name}</td>
                  <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">${m.currentStock || 0}</td>
                  <td style="padding: 8px; border: 1px solid #ccc; text-align: right;">${m.minStock || 0}</td>
                  <td style="padding: 8px; border: 1px solid #ccc; text-align: center; color: ${statusColor}; font-weight: bold;">${status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Analytics Report
   */
  private generateAnalyticsReport(data: any, options: any = {}): string {
    return `
      <div style="max-width: 1000px; margin: 0 auto; background: white; padding: 40px;">
        <h1 style="color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 15px;">ANALYTICS DASHBOARD REPORT</h1>
        <p><strong>Period:</strong> ${data.period || 'Last 30 Days'}</p>
        <p><strong>Generated On:</strong> ${new Date().toLocaleDateString()}</p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 30px;">
          ${(data.metrics || []).map((metric: any) => `
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">${metric.title}</h3>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1e293b;">${metric.value}</p>
              <p style="margin: 10px 0 0 0; color: ${metric.trend === 'up' ? '#10b981' : '#ef4444'}; font-size: 14px;">
                ${metric.trend === 'up' ? '↑' : '↓'} ${metric.change}%
              </p>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 40px;">
          <h2 style="color: #1e293b;">Key Insights:</h2>
          <ul style="color: #64748b;">
            ${(data.insights || []).map((insight: string) => `<li>${insight}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }
}

// Singleton instance
export const pdfGenerator = new PDFReportGenerator();

// Quick usage functions
export const downloadPOAsPDF = async (po: any) => {
  const html = await pdfGenerator.generateReport({
    type: 'purchase_order',
    title: `PO_${po.poNumber}`,
    data: po
  });
  await pdfGenerator.downloadAsPDF(html, `PO_${po.poNumber}.pdf`);
};

export const downloadInventoryReport = async (materials: any[]) => {
  const html = await pdfGenerator.generateReport({
    type: 'inventory_report',
    title: 'Inventory_Report',
    data: { materials }
  });
  await pdfGenerator.downloadAsPDF(html, `Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
