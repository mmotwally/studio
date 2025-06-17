
"use server";

import { openDb } from "@/lib/database";
import type { DashboardData } from "@/types";
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

export async function getDashboardData(): Promise<DashboardData> {
  const db = await openDb();
  const now = new Date();
  const currentMonthStart = formatISO(startOfMonth(now));
  const currentMonthEnd = formatISO(endOfMonth(now));

  try {
    const totalInventoryItems = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM inventory"
    );

    const lowStockItems = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM inventory WHERE quantity <= minStockLevel AND minStockLevel > 0"
    );

    const pendingRequisitions = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM requisitions WHERE status = 'PENDING_APPROVAL'"
    );

    const openPurchaseOrders = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('ORDERED', 'PARTIALLY_RECEIVED')"
    );
    
    // Approximate monthly expenditure: sum of totalAmount for POs marked as RECEIVED this month.
    // This assumes totalAmount is accurate at the time of becoming RECEIVED.
    // A more precise calculation might involve summing actual received item costs from stock movements.
    const monthlyExpenditureResult = await db.get<{ total: number | null }>(
      `SELECT SUM(po.totalAmount) as total 
       FROM purchase_orders po
       WHERE po.status = 'RECEIVED' 
       AND EXISTS (
           SELECT 1 FROM stock_movements sm
           WHERE sm.referenceId = po.id 
           AND sm.movementType = 'PO_RECEIPT'
           AND sm.movementDate >= ? 
           AND sm.movementDate <= ?
       )`,
       currentMonthStart,
       currentMonthEnd
    );
    const monthlyExpenditure = monthlyExpenditureResult?.total ?? 0;


    const totalInventoryValueResult = await db.get<{ total: number | null }>(
      "SELECT SUM(quantity * COALESCE(averageCost, unitCost, 0)) as total FROM inventory"
    );
    const totalInventoryValue = totalInventoryValueResult?.total ?? 0;

    return {
      totalInventoryItems: totalInventoryItems?.count ?? 0,
      lowStockItems: lowStockItems?.count ?? 0,
      pendingRequisitions: pendingRequisitions?.count ?? 0,
      openPurchaseOrders: openPurchaseOrders?.count ?? 0,
      monthlyExpenditure: monthlyExpenditure,
      totalInventoryValue: totalInventoryValue,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Return default/zero values in case of an error to prevent page crash
    return {
      totalInventoryItems: 0,
      lowStockItems: 0,
      pendingRequisitions: 0,
      openPurchaseOrders: 0,
      monthlyExpenditure: 0,
      totalInventoryValue: 0,
      error: (error instanceof Error) ? error.message : "An unknown error occurred",
    };
  }
}
