
'use server';

import { openDb } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types'; // Assuming PurchaseOrderFormValues is defined elsewhere or coming soon
import { format } from 'date-fns';
import type { Database as SqliteDatabaseType } from 'sqlite';

export async function generatePurchaseOrderId(db: SqliteDatabaseType): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `PO-${today}-`;
  const result = await db.get<{ id?: string } | undefined>(
    `SELECT id FROM purchase_orders WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
    `${prefix}%`
  );

  let nextSequence = 1;
  if (result && result.id) {
    const lastId = result.id;
    const numericPart = lastId.substring(prefix.length);
    const lastSequence = parseInt(numericPart, 10);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }
  const formattedSequence = String(nextSequence).padStart(3, '0');
  return prefix + formattedSequence;
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const db = await openDb();
  const poData = await db.all<Omit<PurchaseOrder, 'items' | 'supplierName' | 'totalAmount' | 'itemCount'>[] & { supplierName: string, itemCount: number }>(`
    SELECT 
      po.id, 
      po.supplierId,
      s.name as supplierName,
      po.orderDate, 
      po.expectedDeliveryDate,
      po.status,
      po.notes,
      po.lastUpdated,
      (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) as itemCount,
      (SELECT SUM(poi.quantityOrdered * poi.unitCost) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) as totalAmount
    FROM purchase_orders po
    JOIN suppliers s ON po.supplierId = s.id
    ORDER BY po.orderDate DESC, po.id DESC
  `);
  
  return poData.map(po => ({
    ...po,
    status: po.status as PurchaseOrderStatus, // Ensure status is correctly typed
    totalAmount: po.totalAmount || 0,
  }));
}

export async function deletePurchaseOrderAction(poId: string): Promise<{ success: boolean; message: string }> {
    if (!poId) {
        return { success: false, message: "Purchase Order ID is required for deletion." };
    }
    // Basic placeholder - actual deletion logic would be more complex (check status, etc.)
    console.log(`Placeholder: Attempting to delete PO ${poId}`);
    // revalidatePath("/purchase-orders"); 
    return { success: true, message: `Purchase Order "${poId}" (placeholder) deleted.` };
}

export async function updatePurchaseOrderStatusAction(poId: string, newStatus: PurchaseOrderStatus): Promise<{ success: boolean; message: string }> {
     if (!poId || !newStatus) {
        return { success: false, message: "PO ID and new status are required." };
    }
    console.log(`Placeholder: Attempting to update PO ${poId} to status ${newStatus}`);
    // revalidatePath(`/purchase-orders/${poId}`);
    // revalidatePath("/purchase-orders");
    return { success: true, message: `Purchase Order "${poId}" status updated to ${newStatus} (placeholder).` };
}


// More actions (create, update, getById) will be added in subsequent steps.
