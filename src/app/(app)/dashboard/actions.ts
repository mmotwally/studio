
"use server";

import { openDb } from "@/lib/database";
import type { DashboardData, ActivityLogEntry, ActivityType } from "@/types";
import { startOfMonth, endOfMonth, formatISO, parseISO, formatDistanceToNow } from 'date-fns';

const ACTIVITY_LIMIT = 7; // Number of recent activities to fetch overall

export async function getDashboardData(): Promise<DashboardData> {
  const db = await openDb();
  const now = new Date();
  const currentMonthStart = formatISO(startOfMonth(now));
  const currentMonthEnd = formatISO(endOfMonth(now));

  let allActivities: ActivityLogEntry[] = [];

  try {
    // --- Standard Dashboard Stats ---
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
    
    const monthlyExpenditureResult = await db.get<{ total: number | null }>(
      `SELECT SUM(COALESCE(poi.quantityApproved, poi.quantityOrdered) * poi.unitCost) as total 
       FROM purchase_orders po
       JOIN purchase_order_items poi ON po.id = poi.purchaseOrderId
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

    // --- Recent Activities ---
    // 1. Recent Inventory Items Added
    const recentInventory = await db.all<{ id: string, name: string, lastUpdated: string }>(
        `SELECT id, name, lastUpdated FROM inventory ORDER BY lastUpdated DESC LIMIT ${ACTIVITY_LIMIT}`
    );
    allActivities.push(...recentInventory.map(item => ({
        id: item.id, // Use item id as activity id
        timestamp: item.lastUpdated,
        type: 'INVENTORY_NEW' as ActivityType,
        description: `Item "${item.name}" added.`,
        referenceId: item.id,
        linkHref: `/inventory/${item.id}/edit` // Link to item view/edit page
    })));

    // 2. Recent Requisitions Created
    const recentRequisitions = await db.all<{ id: string, dateCreated: string, departmentId: string, d_name: string | null }>(
        `SELECT r.id, r.dateCreated, r.departmentId, d.name as d_name 
         FROM requisitions r
         LEFT JOIN departments d ON r.departmentId = d.id 
         ORDER BY r.dateCreated DESC LIMIT ${ACTIVITY_LIMIT}`
    );
    allActivities.push(...recentRequisitions.map(req => ({
        id: req.id,
        timestamp: req.dateCreated,
        type: 'REQUISITION_NEW' as ActivityType,
        description: `Requisition ${req.id} created ${req.d_name ? `for ${req.d_name}` : ''}.`,
        referenceId: req.id,
        linkHref: `/requisitions/${req.id}`
    })));
    
    // 3. Recent Purchase Orders Created
    const recentPOs = await db.all<{ id: string, orderDate: string, supplierId: string, s_name: string | null }>(
        `SELECT po.id, po.orderDate, po.supplierId, s.name as s_name 
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplierId = s.id
         ORDER BY po.orderDate DESC LIMIT ${ACTIVITY_LIMIT}`
    );
    allActivities.push(...recentPOs.map(po => ({
        id: po.id,
        timestamp: po.orderDate,
        type: 'PO_NEW' as ActivityType,
        description: `PO ${po.id} created ${po.s_name ? `with ${po.s_name}` : ''}.`,
        referenceId: po.id,
        linkHref: `/purchase-orders/${po.id}`
    })));

    // 4. Recent Stock Movements
    const recentMovements = await db.all<{ id: string, movementDate: string, movementType: string, inventoryItemId: string, i_name: string, referenceId: string | null, quantityChanged: number }>(
        `SELECT sm.id, sm.movementDate, sm.movementType, sm.inventoryItemId, i.name as i_name, sm.referenceId, sm.quantityChanged
         FROM stock_movements sm
         JOIN inventory i ON sm.inventoryItemId = i.id
         ORDER BY sm.movementDate DESC LIMIT ${ACTIVITY_LIMIT}`
    );
    allActivities.push(...recentMovements.map(mov => {
        let desc = `Stock movement (${mov.movementType.replace(/_/g, ' ')}) for item "${mov.i_name}". Qty: ${mov.quantityChanged}.`;
        let type: ActivityType = 'STOCK_MOVEMENT_ADJUSTMENT';
        let link: string | undefined = `/inventory/${mov.inventoryItemId}/edit`;

        if (mov.movementType === 'PO_RECEIPT' && mov.referenceId) {
            desc = `Stock received for item "${mov.i_name}" via PO ${mov.referenceId}. Qty: ${mov.quantityChanged}.`;
            type = 'STOCK_MOVEMENT_PO_RECEIPT';
            link = `/purchase-orders/${mov.referenceId}`;
        } else if (mov.movementType === 'REQUISITION_ISSUE' && mov.referenceId) {
            desc = `Stock issued for item "${mov.i_name}" for Requisition ${mov.referenceId}. Qty: ${mov.quantityChanged}.`;
            type = 'STOCK_MOVEMENT_REQ_ISSUE';
            link = `/requisitions/${mov.referenceId}`;
        } else if (mov.movementType === 'REQUISITION_RETURN' && mov.referenceId) {
            desc = `Stock returned for item "${mov.i_name}" from Requisition ${mov.referenceId}. Qty: ${mov.quantityChanged}.`;
            type = 'STOCK_MOVEMENT_REQ_RETURN';
            link = `/requisitions/${mov.referenceId}`;
        } else if (mov.movementType === 'INITIAL_STOCK') {
            desc = `Initial stock for item "${mov.i_name}" set to ${mov.quantityChanged}.`;
            type = 'STOCK_MOVEMENT_INITIAL';
        }
        
        return {
            id: mov.id,
            timestamp: mov.movementDate,
            type: type,
            description: desc,
            referenceId: mov.referenceId || mov.inventoryItemId,
            linkHref: link
        };
    }));

    // Sort all activities by timestamp (descending) and take the top N
    const sortedActivities = allActivities
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
      .slice(0, ACTIVITY_LIMIT);

    return {
      totalInventoryItems: totalInventoryItems?.count ?? 0,
      lowStockItems: lowStockItems?.count ?? 0,
      pendingRequisitions: pendingRequisitions?.count ?? 0,
      openPurchaseOrders: openPurchaseOrders?.count ?? 0,
      monthlyExpenditure: monthlyExpenditure,
      totalInventoryValue: totalInventoryValue,
      recentActivities: sortedActivities,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return {
      totalInventoryItems: 0,
      lowStockItems: 0,
      pendingRequisitions: 0,
      openPurchaseOrders: 0,
      monthlyExpenditure: 0,
      totalInventoryValue: 0,
      recentActivities: [],
      error: (error instanceof Error) ? error.message : "An unknown error occurred",
    };
  }
}
