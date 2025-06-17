
'use server';

import { openDb } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderFormValues, PurchaseOrderItem, ApprovePOFormValues, ReceivePOFormValues, InventoryItem } from '@/types';
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        purchaseOrderItemId,
        purchaseOrderId,
        item.inventoryItemId,
        item.description,
        item.quantityOrdered,
        item.unitCost,
        null, 
        0 
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
  
  const dbForRedirect = await openDb(); 
  const newPo = await dbForRedirect.get<{ id: string } | undefined>(
      'SELECT id FROM purchase_orders ORDER BY rowid DESC LIMIT 1'
  );
  const newPoId = newPo?.id;

  if (newPoId) {
    redirect(`/purchase-orders/${newPoId}?created=true`);
  } else {
    redirect('/purchase-orders'); 
  }
}

export async function updatePurchaseOrderAction(poId: string, values: PurchaseOrderFormValues) {
  let db;
  try {
    db = await openDb();
    await db.run('BEGIN TRANSACTION');

    const existingPO = await db.get('SELECT status FROM purchase_orders WHERE id = ?', poId);
    if (!existingPO) {
      throw new Error(`Purchase Order with ID ${poId} not found.`);
    }
    
    let newStatus = existingPO.status as PurchaseOrderStatus;
    if (existingPO.status === 'APPROVED' || existingPO.status === 'ORDERED' || existingPO.status === 'PARTIALLY_RECEIVED' || existingPO.status === 'RECEIVED' ) {
      newStatus = 'PENDING_APPROVAL';
    }


    const lastUpdated = new Date().toISOString();

    await db.run(
      `UPDATE purchase_orders 
       SET supplierId = ?, orderDate = ?, expectedDeliveryDate = ?, notes = ?, shippingAddress = ?, billingAddress = ?, lastUpdated = ?, status = ?
       WHERE id = ?`,
      values.supplierId,
      values.orderDate.toISOString(),
      values.expectedDeliveryDate ? values.expectedDeliveryDate.toISOString() : null,
      values.notes,
      values.shippingAddress,
      values.billingAddress,
      lastUpdated,
      newStatus, 
      poId
    );

    await db.run('DELETE FROM purchase_order_items WHERE purchaseOrderId = ?', poId);

    for (const item of values.items) {
      const purchaseOrderItemId = crypto.randomUUID();
      await db.run(
        `INSERT INTO purchase_order_items (id, purchaseOrderId, inventoryItemId, description, quantityOrdered, unitCost, quantityApproved, quantityReceived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        purchaseOrderItemId,
        poId,
        item.inventoryItemId,
        item.description,
        item.quantityOrdered,
        item.unitCost,
        null, 
        0 
      );
    }

    await db.run('COMMIT');
  } catch (error) {
    if (db) {
      try {
        await db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction for PO update:', rollbackError);
      }
    }
    console.error(`Failed to update purchase order ${poId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not update purchase order.');
  }

  revalidatePath('/purchase-orders');
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath(`/purchase-orders/${poId}/edit`);
  redirect(`/purchase-orders/${poId}?updated=true`);
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
      (SELECT SUM(COALESCE(poi.quantityApproved, poi.quantityOrdered) * poi.unitCost) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) as totalAmount
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplierId = s.id
    ORDER BY po.orderDate DESC, po.id DESC
  `);
  
  return poData.map(po => ({
    ...po,
    status: po.status as PurchaseOrderStatus, 
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
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplierId = s.id
    WHERE po.id = ?
  `, poId);

  if (!poData) {
    return null;
  }

  const itemsData = await db.all<PurchaseOrderItem[]>(`
    SELECT
      poi.id,
      poi.purchaseOrderId,
      poi.inventoryItemId,
      i.name as inventoryItemName,
      i.quantity as inventoryItemCurrentStock,
      i.averageCost as inventoryItemAverageCost, 
      i.lastPurchasePrice as inventoryItemLastPurchasePrice,
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
        quantityReceived: item.quantityReceived || 0,
        totalCost: (item.quantityOrdered || 0) * (item.unitCost || 0)
    })),
    totalAmount: itemsData.reduce((sum, item) => sum + ((item.quantityApproved ?? item.quantityOrdered) * item.unitCost), 0),
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
        
        if (po.status !== 'DRAFT' && po.status !== 'CANCELLED') {
            await db.run('ROLLBACK');
            return { success: false, message: `Purchase Order ${poId} cannot be deleted. Status is ${po.status}. Only DRAFT or CANCELLED POs can be deleted.` };
        }

        await db.run('DELETE FROM purchase_order_items WHERE purchaseOrderId = ?', poId);
        const result = await db.run('DELETE FROM purchase_orders WHERE id = ?', poId);

        if (result.changes === 0) {
            await db.run('ROLLBACK'); 
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

        const allowedTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
            DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
            PENDING_APPROVAL: ['APPROVED', 'CANCELLED', 'DRAFT'], 
            APPROVED: ['ORDERED', 'CANCELLED'],
            ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'], 
            PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
            RECEIVED: [], 
            CANCELLED: []  
        };

        if (!allowedTransitions[po.status as PurchaseOrderStatus]?.includes(newStatus)) {
             return { success: false, message: `Cannot change PO status from ${po.status} to ${newStatus}.` };
        }
        
        await db.run('UPDATE purchase_orders SET status = ?, lastUpdated = ? WHERE id = ?', newStatus, lastUpdated, poId);
        
        revalidatePath(`/purchase-orders/${poId}`);
        revalidatePath("/purchase-orders");
        return { success: true, message: `Purchase Order "${poId}" status updated to ${newStatus.replace(/_/g, ' ').toLowerCase()}.` };
    } catch (error: any) {
        console.error(`Failed to update PO ${poId} status:`, error);
        return { success: false, message: `Failed to update PO status: ${error.message}` };
    }
}

export async function approvePurchaseOrderItemsAction(
    purchaseOrderId: string, 
    itemsToApprove: Array<{ poItemId: string; quantityApproved: number }>
) {
    if (!purchaseOrderId || !itemsToApprove) {
        throw new Error("Purchase Order ID and items for approval are required.");
    }

    const db = await openDb();
    await db.run('BEGIN TRANSACTION');
    try {
        const lastUpdated = new Date().toISOString();
        const currentPO = await db.get('SELECT id, status FROM purchase_orders WHERE id = ?', purchaseOrderId);
        if (!currentPO) {
            throw new Error(`Purchase Order with ID "${purchaseOrderId}" not found.`);
        }
        if (currentPO.status !== 'PENDING_APPROVAL') {
            throw new Error(`Cannot approve items for a PO that is not in 'PENDING_APPROVAL' status. Current status: ${currentPO.status}`);
        }

        for (const itemDecision of itemsToApprove) {
            const { poItemId, quantityApproved } = itemDecision;
            
            const poItem = await db.get<{ quantityOrdered: number } | undefined>(
                'SELECT quantityOrdered FROM purchase_order_items WHERE id = ? AND purchaseOrderId = ?', 
                poItemId, purchaseOrderId
            );
            if (!poItem) {
                throw new Error(`PO item with ID ${poItemId} not found for this PO.`);
            }
            if (quantityApproved < 0 || quantityApproved > poItem.quantityOrdered) {
                throw new Error(`Invalid quantity to approve (${quantityApproved}) for item ${poItemId}. Must be between 0 and ${poItem.quantityOrdered}.`);
            }

            await db.run(
                'UPDATE purchase_order_items SET quantityApproved = ? WHERE id = ?',
                quantityApproved,
                poItemId
            );
        }
        
        await db.run(
            'UPDATE purchase_orders SET status = ?, lastUpdated = ? WHERE id = ?',
            'APPROVED',
            lastUpdated,
            purchaseOrderId
        );

        await db.run('COMMIT');
    } catch (error) {
        if (db) {
            try {
                await db.run('ROLLBACK');
            } catch (rollbackError) {
                console.error('Failed to rollback transaction for PO item approval:', rollbackError);
            }
        }
        console.error(`Failed to approve items for PO ${purchaseOrderId}:`, error);
        if (error instanceof Error) {
            throw new Error(`Approval processing failed: ${error.message}`);
        }
        throw new Error('Approval processing failed due to an unexpected error.');
    }
    revalidatePath(`/purchase-orders/${purchaseOrderId}`);
    revalidatePath('/purchase-orders');
    redirect(`/purchase-orders/${purchaseOrderId}?approval_success=true`);
}


export async function receivePurchaseOrderItemsAction(
  purchaseOrderId: string,
  itemsReceived: Array<{ poItemId: string, inventoryItemId: string, quantityReceivedNow: number, unitCostAtReceipt: number }>
) {
  if (!purchaseOrderId || !itemsReceived || itemsReceived.length === 0) {
    throw new Error("Purchase Order ID and items received are required.");
  }

  const db = await openDb();
  await db.run('BEGIN TRANSACTION');

  try {
    const currentTime = new Date().toISOString();

    for (const item of itemsReceived) {
      if (item.quantityReceivedNow <= 0) {
        continue; 
      }

      const poItemDetails = await db.get<PurchaseOrderItem>(
        'SELECT quantityOrdered, quantityApproved, quantityReceived, unitCost FROM purchase_order_items WHERE id = ? AND purchaseOrderId = ?',
        item.poItemId, purchaseOrderId
      );

      if (!poItemDetails) {
        throw new Error(`Purchase order item ${item.poItemId} not found for PO ${purchaseOrderId}.`);
      }
      
      const qtyApproved = poItemDetails.quantityApproved ?? poItemDetails.quantityOrdered; 
      const alreadyReceived = poItemDetails.quantityReceived || 0;
      const maxReceivable = qtyApproved - alreadyReceived;

      if (item.quantityReceivedNow > maxReceivable) {
        throw new Error(`Cannot receive ${item.quantityReceivedNow} for item ${item.inventoryItemId}. Max receivable: ${maxReceivable}.`);
      }

      const inventoryItem = await db.get<InventoryItem>(
        'SELECT quantity, averageCost FROM inventory WHERE id = ?',
        item.inventoryItemId
      );
      if (!inventoryItem) {
        throw new Error(`Inventory item with ID ${item.inventoryItemId} not found.`);
      }

      const newInventoryQuantity = (inventoryItem.quantity || 0) + item.quantityReceivedNow;

      await db.run(
        'UPDATE inventory SET quantity = ?, lastUpdated = ?, lastPurchasePrice = ? WHERE id = ?',
        newInventoryQuantity,
        currentTime,
        item.unitCostAtReceipt, 
        item.inventoryItemId
      );
      
      const oldQuantity = inventoryItem.quantity || 0;
      const oldAverageCost = inventoryItem.averageCost || 0;
      let newAverageCost = oldAverageCost;

      if (newInventoryQuantity > 0) { 
          newAverageCost = ((oldAverageCost * oldQuantity) + (item.quantityReceivedNow * item.unitCostAtReceipt)) / newInventoryQuantity;
      } else if (item.quantityReceivedNow > 0) { 
          newAverageCost = item.unitCostAtReceipt;
      }
      
      await db.run(
        'UPDATE inventory SET averageCost = ? WHERE id = ?',
        newAverageCost,
        item.inventoryItemId
      );

      await db.run(
        'UPDATE purchase_order_items SET quantityReceived = quantityReceived + ? WHERE id = ? AND purchaseOrderId = ?',
        item.quantityReceivedNow,
        item.poItemId,
        purchaseOrderId
      );

      // Log stock movement
      await db.run(
        `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, referenceId, movementDate, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        item.inventoryItemId,
        'PO_RECEIPT',
        item.quantityReceivedNow,
        newInventoryQuantity,
        purchaseOrderId,
        currentTime,
        `Received via PO ${purchaseOrderId}`
      );
    }

    const allPoItems = await db.all<PurchaseOrderItem>(
      'SELECT quantityApproved, quantityOrdered, quantityReceived FROM purchase_order_items WHERE purchaseOrderId = ?',
      purchaseOrderId
    );

    let newPoStatus: PurchaseOrderStatus;
    const allItemsFullyReceived = allPoItems.every(
      pItem => (pItem.quantityReceived || 0) >= (pItem.quantityApproved ?? pItem.quantityOrdered)
    );
    const anyItemPartiallyReceived = allPoItems.some(
      pItem => (pItem.quantityReceived || 0) > 0 && (pItem.quantityReceived || 0) < (pItem.quantityApproved ?? pItem.quantityOrdered)
    );

    if (allItemsFullyReceived) {
      newPoStatus = 'RECEIVED';
    } else if (anyItemPartiallyReceived || allPoItems.some(pItem => (pItem.quantityReceived || 0) > 0)) {
      newPoStatus = 'PARTIALLY_RECEIVED';
    } else {
      const currentPO = await db.get('SELECT status FROM purchase_orders WHERE id = ?', purchaseOrderId);
      newPoStatus = currentPO?.status as PurchaseOrderStatus || 'ORDERED';
    }

    await db.run(
      'UPDATE purchase_orders SET status = ?, lastUpdated = ? WHERE id = ?',
      newPoStatus,
      currentTime,
      purchaseOrderId
    );

    await db.run('COMMIT');
  } catch (error) {
    if (db) { // Ensure db is defined before trying to rollback
        try {
            await db.run('ROLLBACK');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction for stock receipt:', rollbackError);
        }
    }
    console.error(`Failed to process stock receipt for PO ${purchaseOrderId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Stock receiving failed: ${error.message}`);
    }
    throw new Error('Stock receiving failed due to an unexpected error.');
  }

  revalidatePath(`/purchase-orders/${purchaseOrderId}`);
  revalidatePath('/purchase-orders');
  revalidatePath('/inventory');
  revalidatePath(`/inventory/${itemsReceived.map(i => i.inventoryItemId).join(',')}`); // Revalidate specific items
  redirect(`/purchase-orders/${purchaseOrderId}?receive_success=true`);
}
