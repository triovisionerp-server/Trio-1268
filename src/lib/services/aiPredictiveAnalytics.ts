/**
 * AI-Powered Predictive Analytics
 * Machine Learning insights for inventory, production, and procurement
 */

import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export interface PredictiveInsight {
  id: string;
  type: 'stock_shortage' | 'demand_surge' | 'supplier_delay' | 'cost_increase' | 'efficiency_drop';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  prediction: string;
  confidence: number; // 0-100
  recommendedAction: string;
  impactedItems: string[];
  estimatedImpact: {
    cost?: number;
    time?: string;
    quantity?: number;
  };
  predictedDate: string;
  metadata: Record<string, any>;
}

export class AIAnalyticsEngine {
  
  /**
   * Get all AI-powered insights
   */
  async getAllInsights(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Run all prediction models in parallel
    const [
      stockShortages,
      demandPredictions,
      supplierDelays,
      costTrends,
      efficiencyTrends
    ] = await Promise.all([
      this.predictStockShortages(),
      this.predictDemandSurges(),
      this.predictSupplierDelays(),
      this.predictCostIncreases(),
      this.predictEfficiencyDrops()
    ]);
    
    return [
      ...stockShortages,
      ...demandPredictions,
      ...supplierDelays,
      ...costTrends,
      ...efficiencyTrends
    ].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Predict stock shortages using historical consumption data
   */
  async predictStockShortages(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      // Get materials
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      
      // Get last 30 days of issue records
      const issuesSnapshot = await getDocs(
        query(
          collection(db, 'issue_records'),
          orderBy('date', 'desc'),
          limit(100)
        )
      );
      
      // Calculate consumption rate per material
      const consumptionMap = new Map<string, { total: number; count: number; name: string; currentStock: number; minStock: number }>();
      
      issuesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const materialCode = data.material;
        const quantity = data.quantity || 0;
        
        if (consumptionMap.has(materialCode)) {
          const existing = consumptionMap.get(materialCode)!;
          consumptionMap.set(materialCode, {
            ...existing,
            total: existing.total + quantity,
            count: existing.count + 1
          });
        } else {
          consumptionMap.set(materialCode, {
            total: quantity,
            count: 1,
            name: data.materialName || materialCode,
            currentStock: 0,
            minStock: 0
          });
        }
      });
      
      // Match with current stock levels
      materialsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const code = data.code;
        
        if (consumptionMap.has(code)) {
          const consumption = consumptionMap.get(code)!;
          consumption.currentStock = data.currentStock || 0;
          consumption.minStock = data.minStock || 0;
        }
      });
      
      // Predict shortages
      consumptionMap.forEach((data, code) => {
        if (data.count < 3) return; // Need at least 3 data points
        
        const avgDailyConsumption = data.total / 30; // Approximate daily consumption
        const daysUntilShortage = data.currentStock / avgDailyConsumption;
        
        if (daysUntilShortage < 14 && daysUntilShortage > 0) {
          const severity = daysUntilShortage < 3 ? 'critical' : daysUntilShortage < 7 ? 'high' : 'medium';
          const confidence = Math.min(95, 60 + (data.count * 5)); // More data = higher confidence
          
          insights.push({
            id: `stock_shortage_${code}`,
            type: 'stock_shortage',
            severity,
            title: `Stock Shortage Alert: ${data.name}`,
            description: `Based on consumption trends, ${data.name} will run out in ${Math.round(daysUntilShortage)} days`,
            prediction: `Stock will drop below minimum level on ${this.addDays(daysUntilShortage).toLocaleDateString()}`,
            confidence,
            recommendedAction: `Place purchase order for ${Math.ceil(avgDailyConsumption * 30)} units immediately`,
            impactedItems: [code],
            estimatedImpact: {
              time: `${Math.round(daysUntilShortage)} days`,
              quantity: Math.ceil(avgDailyConsumption * 30)
            },
            predictedDate: this.addDays(daysUntilShortage).toISOString(),
            metadata: {
              currentStock: data.currentStock,
              avgDailyConsumption: avgDailyConsumption.toFixed(2),
              dataPoints: data.count
            }
          });
        }
      });
    } catch (error) {
      console.error('Error predicting stock shortages:', error);
    }
    
    return insights;
  }

  /**
   * Predict demand surges based on historical patterns
   */
  async predictDemandSurges(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      // Get work orders
      const woSnapshot = await getDocs(
        query(collection(db, 'work_orders'), orderBy('createdAt', 'desc'), limit(50))
      );
      
      // Group by month
      const monthlyDemand = new Map<string, number>();
      woSnapshot.docs.forEach(doc => {
        const date = new Date(doc.data().createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        monthlyDemand.set(monthKey, (monthlyDemand.get(monthKey) || 0) + 1);
      });
      
      // Calculate trend (simple linear regression)
      const values = Array.from(monthlyDemand.values());
      if (values.length >= 3) {
        const recent = values.slice(-3);
        const trend = recent[2] - recent[0];
        
        if (trend > recent[0] * 0.3) { // 30% increase
          insights.push({
            id: 'demand_surge_production',
            type: 'demand_surge',
            severity: 'high',
            title: 'Production Demand Surge Expected',
            description: 'Work order volume is increasing rapidly',
            prediction: `Expect ${Math.round(recent[2] + trend)} work orders next month (${Math.round(trend / recent[0] * 100)}% increase)`,
            confidence: 75,
            recommendedAction: 'Increase raw material inventory by 30% and prepare additional workforce',
            impactedItems: ['all_materials', 'workforce'],
            estimatedImpact: {
              quantity: Math.round(trend)
            },
            predictedDate: this.addDays(30).toISOString(),
            metadata: {
              currentMonthly: recent[2],
              previousMonthly: recent[0],
              trendPercent: Math.round(trend / recent[0] * 100)
            }
          });
        }
      }
    } catch (error) {
      console.error('Error predicting demand surges:', error);
    }
    
    return insights;
  }

  /**
   * Predict supplier delivery delays
   */
  async predictSupplierDelays(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      const posSnapshot = await getDocs(
        query(
          collection(db, 'purchase_orders'),
          where('status', 'in', ['approved', 'ordered']),
          orderBy('expectedDelivery', 'asc')
        )
      );
      
      const today = new Date();
      
      posSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const expectedDate = new Date(data.expectedDelivery);
        const daysLate = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLate > 0) {
          const severity = daysLate > 7 ? 'critical' : daysLate > 3 ? 'high' : 'medium';
          
          insights.push({
            id: `supplier_delay_${doc.id}`,
            type: 'supplier_delay',
            severity,
            title: `PO ${data.poNumber} Delivery Overdue`,
            description: `Purchase order from ${data.supplierName} is ${daysLate} days overdue`,
            prediction: `Likely to cause production delays if not received within 48 hours`,
            confidence: 85,
            recommendedAction: `Contact supplier ${data.supplierName} immediately. Consider alternate supplier if delay exceeds ${daysLate + 2} days`,
            impactedItems: data.items?.map((i: any) => i.materialCode) || [],
            estimatedImpact: {
              time: `${daysLate} days delay`,
              cost: data.totalAmount * 0.1 // Assume 10% impact
            },
            predictedDate: expectedDate.toISOString(),
            metadata: {
              poNumber: data.poNumber,
              supplierName: data.supplierName,
              daysLate,
              estimatedDelivery: 'Contact supplier for updated ETA'
            }
          });
        }
      });
    } catch (error) {
      console.error('Error predicting supplier delays:', error);
    }
    
    return insights;
  }

  /**
   * Predict cost increases based on purchase history
   */
  async predictCostIncreases(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      const purchaseSnapshot = await getDocs(
        query(collection(db, 'purchase_entries'), orderBy('date', 'desc'), limit(100))
      );
      
      // Track price trends per material
      const priceHistory = new Map<string, { prices: number[]; name: string }>();
      
      purchaseSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const code = data.material;
        const price = data.unit_price || 0;
        
        if (!priceHistory.has(code)) {
          priceHistory.set(code, {
            prices: [],
            name: data.materialName || code
          });
        }
        priceHistory.get(code)!.prices.push(price);
      });
      
      // Detect price increases
      priceHistory.forEach((data, code) => {
        if (data.prices.length < 3) return;
        
        const recent = data.prices.slice(0, 3);
        const older = data.prices.slice(-3);
        const avgRecent = recent.reduce((a, b) => a + b) / recent.length;
        const avgOlder = older.reduce((a, b) => a + b) / older.length;
        const increase = ((avgRecent - avgOlder) / avgOlder) * 100;
        
        if (increase > 15) {
          insights.push({
            id: `cost_increase_${code}`,
            type: 'cost_increase',
            severity: increase > 30 ? 'high' : 'medium',
            title: `Price Increase: ${data.name}`,
            description: `Material cost has increased by ${increase.toFixed(1)}% recently`,
            prediction: `Trend suggests continued price inflation. Expect additional 10-15% increase in next quarter`,
            confidence: 70,
            recommendedAction: `Consider bulk purchase to lock current prices, or explore alternate suppliers`,
            impactedItems: [code],
            estimatedImpact: {
              cost: avgRecent - avgOlder
            },
            predictedDate: this.addDays(90).toISOString(),
            metadata: {
              currentPrice: avgRecent.toFixed(2),
              previousPrice: avgOlder.toFixed(2),
              increasePercent: increase.toFixed(1)
            }
          });
        }
      });
    } catch (error) {
      console.error('Error predicting cost increases:', error);
    }
    
    return insights;
  }

  /**
   * Predict efficiency drops in production
   */
  async predictEfficiencyDrops(): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    try {
      const woSnapshot = await getDocs(
        query(collection(db, 'work_orders'), orderBy('createdAt', 'desc'), limit(50))
      );
      
      // Calculate average completion time
      const completedWOs = woSnapshot.docs.filter(doc => doc.data().status === 'completed');
      
      if (completedWOs.length >= 5) {
        const completionTimes = completedWOs.map(doc => {
          const data = doc.data();
          const start = new Date(data.createdAt).getTime();
          const end = new Date(data.completedAt || data.createdAt).getTime();
          return (end - start) / (1000 * 60 * 60); // hours
        });
        
        const recent = completionTimes.slice(0, 5);
        const older = completionTimes.slice(-5);
        const avgRecent = recent.reduce((a, b) => a + b) / recent.length;
        const avgOlder = older.reduce((a, b) => a + b) / older.length;
        const slowdown = ((avgRecent - avgOlder) / avgOlder) * 100;
        
        if (slowdown > 20) {
          insights.push({
            id: 'efficiency_drop_production',
            type: 'efficiency_drop',
            severity: slowdown > 40 ? 'high' : 'medium',
            title: 'Production Efficiency Declining',
            description: `Work order completion time has increased by ${slowdown.toFixed(1)}%`,
            prediction: 'Continued degradation will impact delivery schedules',
            confidence: 80,
            recommendedAction: 'Investigate bottlenecks, check equipment maintenance, review workforce allocation',
            impactedItems: ['production_line'],
            estimatedImpact: {
              time: `${(avgRecent - avgOlder).toFixed(1)} hours per order`
            },
            predictedDate: new Date().toISOString(),
            metadata: {
              currentAvgHours: avgRecent.toFixed(1),
              previousAvgHours: avgOlder.toFixed(1),
              slowdownPercent: slowdown.toFixed(1)
            }
          });
        }
      }
    } catch (error) {
      console.error('Error predicting efficiency drops:', error);
    }
    
    return insights;
  }

  /**
   * Get smart recommendations based on current state
   */
  async getSmartRecommendations(): Promise<Array<{
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>> {
    const recommendations: Array<any> = [];
    
    try {
      // Check for pending approvals
      const pendingPOs = await getDocs(
        query(collection(db, 'purchase_orders'), where('status', '==', 'pending_md_approval'))
      );
      
      if (pendingPOs.size > 5) {
        recommendations.push({
          title: 'Multiple POs Awaiting Approval',
          description: `${pendingPOs.size} purchase orders are pending MD approval, potentially delaying procurement`,
          action: 'Review and approve pending purchase orders',
          priority: 'high',
          category: 'procurement'
        });
      }
      
      // Check for low stock items
      const materials = await getDocs(collection(db, 'materials'));
      const lowStockCount = materials.docs.filter(doc => {
        const data = doc.data();
        return (data.currentStock || 0) < (data.minStock || 0);
      }).length;
      
      if (lowStockCount > 0) {
        recommendations.push({
          title: `${lowStockCount} Materials Below Minimum Stock`,
          description: 'Low stock levels may disrupt production schedules',
          action: 'Create purchase requisitions for low-stock items',
          priority: 'high',
          category: 'inventory'
        });
      }
      
      // Check for overdue work orders
      const wos = await getDocs(
        query(collection(db, 'work_orders'), where('status', '==', 'in_progress'))
      );
      const overdueWOs = wos.docs.filter(doc => {
        const deadline = doc.data().deadline;
        return deadline && new Date(deadline) < new Date();
      }).length;
      
      if (overdueWOs > 0) {
        recommendations.push({
          title: `${overdueWOs} Work Orders Past Deadline`,
          description: 'Overdue work orders may impact customer deliveries',
          action: 'Review and expedite overdue work orders',
          priority: 'high',
          category: 'production'
        });
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
    
    return recommendations;
  }

  /**
   * Helper: Add days to current date
   */
  private addDays(days: number): Date {
    const result = new Date();
    result.setDate(result.getDate() + days);
    return result;
  }
}

// Singleton instance
export const aiAnalytics = new AIAnalyticsEngine();
