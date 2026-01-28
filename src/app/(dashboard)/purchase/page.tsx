'use client';

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import MDPurchaseOverview from './MDpurchase';
import PurchaseWorkflow from './PurchaseWorkflow';

// ==========================================
// MAIN PAGE WRAPPER - Routes based on role
// ==========================================

// Helper to get user role synchronously
function getUserRoleFromStorage(): string {
  if (typeof window === 'undefined') return 'purchase';
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user.role?.toLowerCase()?.trim() || 'purchase';
    } catch {
      return 'purchase';
    }
  }
  return 'purchase';
}

export default function PurchasePageWrapper() {
  // Use useMemo to compute role once without setState in effect
  const userRole = useMemo(() => getUserRoleFromStorage(), []);

  // ONLY MD sees the MD Purchase Dashboard (read-only analytics)
  if (userRole === 'md') {
    return <MDPurchaseOverview />;
  }

  // Purchase team sees the complete Purchase Workflow Management
  return <PurchaseWorkflow />;
}

// Keep Loader2 for potential future use
export { Loader2 };
