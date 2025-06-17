
'use server';

import { openDb } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderFormValues, PurchaseOrderItem, SelectItem } from '@/types';
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

export async function createPurchaseOrderAction(values: PurchaseOrderFormValues) {
  let db;
  try {
    db = await openDb();
    await db.run('BEGIN TRANSACTION');

    const purchaseOrderId = await generatePurchaseOrderId(db);
    const currentDate = new Date().toISOString();

    await db.run(
      `INSERT INTO purchase_orders (id, supplierId, orderDate, expectedDeliveryDate, status, notes, shippingAddress, billingAddress, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      purchaseOrderId,
      values.supplierId,
      values.orderDate.toISOString(),
      values.expectedDeliveryDate ? values.expectedDeliveryDate.toISOString() : null,
      'DRAFT', // Initial status
      values.notes,
      values.shippingAddress,
      values.billingAddress,
      currentDate
    );

    for (const item of values.items) {
      const purchaseOrderItemId = crypto.randomUUID();
      await db.run(
        `INSERT INTO purchase_order_items (id, purchaseOrderId, inventoryItemId, description, quantityOrdered, unitCost, quantityApproved, quantityReceived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, // Added quantityApproved
        purchaseOrderItemId,
        purchaseOrderId,
        item.inventoryItemId,
        item.description,
        item.quantityOrdered,
        item.unitCost,
        null, // quantityApproved is null initially for DRAFT POs
        0 // Initially 0 received
      );
    }

    await db.run('COMMIT');
  } catch (error) {
    if (db) {
        try {
            await db.run('ROLLBACK');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction for PO creation:', rollbackError);
        }
    }
    console.error('Failed to create purchase order:', error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not create purchase order.');
  }

  revalidatePath('/purchase-orders');
  revalidatePath('/purchase-orders/new');
  // Fetch the newly created PO's ID to redirect to its detail page.
  // This is a bit indirect; if generatePurchaseOrderId was guaranteed unique for the session, we could use its output.
  // However, to be safe, fetch the latest PO for this supplier created today.
  // A more robust way might be to have createPurchaseOrderAction return the ID.
  const dbForRedirect = await openDb();
  const newPo = await dbForRedirect.get(
      'SELECT id FROM purchase_orders WHERE supplierId = ? AND date(orderDate) = date(?) ORDER BY id DESC LIMIT 1',
      values.supplierId,
      values.orderDate.toISOString().split('T')[0]
  );
  redirect(`/purchase-orders/${newPo?.id || ''}`); 
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const db = await openDb();
  const poData = await db.all<Omit<PurchaseOrder, 'items' | 'supplierName' | 'totalAmount' | 'itemCount'>[] & { supplierName: string, itemCount: number, totalAmount: number }>(`
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
    LEFT JOIN suppliers s ON po.supplierId = s.id
    ORDER BY po.orderDate DESC, po.id DESC
  `);
  
  return poData.map(po => ({
    ...po,
    status: po.status as PurchaseOrderStatus, // Ensure status is correctly typed
    totalAmount: po.totalAmount || 0,
    itemCount: po.itemCount || 0,
  }));
}

export async function getPurchaseOrderById(poId: string): Promise<PurchaseOrder | null> {
  const db = await openDb();
  const poData = await db.get<Omit<PurchaseOrder, 'items' | 'supplierName' | 'totalAmount' | 'itemCount' | 'status'> & { supplierName: string, status: string }>(`
    SELECT 
      po.id, 
      po.supplierId,
      s.name as supplierName,
      po.orderDate, 
      po.expectedDeliveryDate,
      po.status,
      po.notes,
      po.shippingAddress,
      po.billingAddress,
      po.lastUpdated,
      po.createdById
      -- Add createdByName if users table is joined
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplierId = s.id
    WHERE po.id = ?
  `, poId);

  if (!poData) {
    return null;
  }

  const itemsData = await db.all<Omit<PurchaseOrderItem, 'inventoryItemName' | 'totalCost'> & {inventoryItemName: string}>(`
    SELECT
      poi.id,
      poi.purchaseOrderId,
      poi.inventoryItemId,
      i.name as inventoryItemName,
      poi.description,
      poi.quantityOrdered,
      poi.unitCost,
      poi.quantityApproved,
      poi.quantityReceived,
      poi.notes
    FROM purchase_order_items poi
    JOIN inventory i ON poi.inventoryItemId = i.id
    WHERE poi.purchaseOrderId = ?
    ORDER BY i.name ASC
  `, poId);

  return {
    ...poData,
    status: poData.status as PurchaseOrderStatus,
    items: itemsData.map(item => ({
        ...item,
        quantityApproved: item.quantityApproved === null ? undefined : item.quantityApproved,
        totalCost: (item.quantityOrdered || 0) * (item.unitCost || 0)
    })),
    totalAmount: itemsData.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0),
    itemCount: itemsData.length,
  };
}


export async function deletePurchaseOrderAction(poId: string): Promise<{ success: boolean; message: string }> {
    if (!poId) {
        return { success: false, message: "Purchase Order ID is required for deletion." };
    }
    const db = await openDb();
    await db.run('BEGIN TRANSACTION');
    try {
        const po = await db.get('SELECT status FROM purchase_orders WHERE id = ?', poId);
        if (!po) {
            await db.run('ROLLBACK');
            return { success: false, message: `Purchase Order ${poId} not found.` };
        }
        // Allow deletion only for DRAFT or CANCELLED POs
        if (po.status !== 'DRAFT' && po.status !== 'CANCELLED') {
            await db.run('ROLLBACK');
            return { success: false, message: `Purchase Order ${poId} cannot be deleted. Status is ${po.status}. Only DRAFT or CANCELLED POs can be deleted.` };
        }

        await db.run('DELETE FROM purchase_order_items WHERE purchaseOrderId = ?', poId);
        const result = await db.run('DELETE FROM purchase_orders WHERE id = ?', poId);

        if (result.changes === 0) {
            await db.run('ROLLBACK'); // Should not happen if PO was found earlier
            return { success: false, message: `Failed to delete PO ${poId} or it was already deleted.` };
        }
        await db.run('COMMIT');
        revalidatePath("/purchase-orders"); 
        return { success: true, message: `Purchase Order "${poId}" and its items deleted successfully.` };
    } catch (error: any) {
        await db.run('ROLLBACK');
        console.error(`Failed to delete PO ${poId}:`, error);
        return { success: false, message: `Failed to delete PO: ${error.message}` };
    }
}

export async function updatePurchaseOrderStatusAction(poId: string, newStatus: PurchaseOrderStatus): Promise<{ success: boolean; message: string }> {
     if (!poId || !newStatus) {
        return { success: false, message: "PO ID and new status are required." };
    }
    const db = await openDb();
    try {
        const lastUpdated = new Date().toISOString();
        const po = await db.get('SELECT status FROM purchase_orders WHERE id = ?', poId);
        if (!po) {
            return { success: false, message: `Purchase Order ${poId} not found.` };
        }

        // TODO: Add more sophisticated workflow logic/validation here based on current and new status.
        // For example:
        // If newStatus is 'APPROVED' and current is 'PENDING_APPROVAL', proceed.
        // If newStatus is 'ORDERED' and current is 'APPROVED', proceed.
        // If newStatus is 'CANCELLED', check if it's allowed from current status.
        // If newStatus is 'PENDING_APPROVAL' from 'DRAFT', proceed.
        
        // For 'APPROVED' status, if coming from 'PENDING_APPROVAL', 
        // we should ideally set quantityApproved for all items to quantityOrdered by default.
        // This will be handled by a more specific approval action later.
        // This generic status update should be used for simpler transitions like DRAFT -> PENDING_APPROVAL
        // or an admin overriding a status.

        await db.run('UPDATE purchase_orders SET status = ?, lastUpdated = ? WHERE id = ?', newStatus, lastUpdated, poId);
        
        revalidatePath(`/purchase-orders/${poId}`);
        revalidatePath("/purchase-orders");
        return { success: true, message: `Purchase Order "${poId}" status updated to ${newStatus.replace(/_/g, ' ').toLowerCase()}.` };
    } catch (error: any) {
        console.error(`Failed to update PO ${poId} status:`, error);
        return { success: false, message: `Failed to update PO status: ${error.message}` };
    }
}

// TODO: Implement updatePurchaseOrderAction for editing existing POs
// This will be similar to createPurchaseOrderAction but will use UPDATE statements
// and handle item modifications (add, remove, update).
// It will also require a new page: src/app/(app)/purchase-orders/[poId]/edit/page.tsx

// TODO: Implement approvePurchaseOrderItemsAction (sets quantityApproved on items, moves PO to APPROVED)
// TODO: Implement receivePurchaseOrderItemsAction (updates inventory, PO item quantityReceived, PO status)

    