
'use server';

import { openDb } from '@/lib/database';
import type { RequisitionFormValues } from './schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { InventoryItem, Requisition, RequisitionItem, RequisitionStatus, SelectItem, FulfillRequisitionFormValues } from '@/types';
import { format } from 'date-fns';
import type { Database as SqliteDatabaseType } from 'sqlite';

async function generateRequisitionId(db: SqliteDatabaseType): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `REQ-${today}-`;
  const result = await db.get<{ id?: string } | undefined>(
    `SELECT id FROM requisitions WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
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

export async function createRequisitionAction(values: RequisitionFormValues) {
  let db;
  try {
    db = await openDb();
    await db.run('BEGIN TRANSACTION');

    const requisitionId = await generateRequisitionId(db);
    const dateCreated = new Date().toISOString();
    const lastUpdated = dateCreated;

    await db.run(
      `INSERT INTO requisitions (id, dateCreated, dateNeeded, status, notes, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      requisitionId,
      dateCreated,
      values.dateNeeded ? values.dateNeeded.toISOString() : null,
      'PENDING_APPROVAL', 
      values.notes,
      lastUpdated
    );

    for (const item of values.items) {
      const requisitionItemId = crypto.randomUUID();
      await db.run(
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, quantityIssued, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
        0, 
        item.notes
      );
    }

    await db.run('COMMIT');
  } catch (error) {
    if (db) {
        try {
            await db.run('ROLLBACK');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
    }
    console.error('Failed to create requisition:', error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not create requisition.');
  }

  revalidatePath('/requisitions');
  revalidatePath('/requisitions/new');
  redirect('/requisitions');
}

export async function updateRequisitionAction(requisitionId: string, values: RequisitionFormValues) {
  let db;
  try {
    db = await openDb();
    await db.run('BEGIN TRANSACTION');

    const lastUpdated = new Date().toISOString();

    const currentRequisition = await db.get('SELECT status FROM requisitions WHERE id = ?', requisitionId);
    if (!currentRequisition || currentRequisition.status !== 'PENDING_APPROVAL') {
        throw new Error("Requisition cannot be edited. It is not pending approval or does not exist.");
    }


    await db.run(
      `UPDATE requisitions
       SET dateNeeded = ?, notes = ?, lastUpdated = ?
       WHERE id = ? AND status = 'PENDING_APPROVAL'`,
      values.dateNeeded ? values.dateNeeded.toISOString() : null,
      values.notes,
      lastUpdated,
      requisitionId
    );

    const existingItemsMap = new Map<string, number>();
    const currentItems = await db.all<{id: string, inventoryItemId: string, quantityIssued: number}>(
        'SELECT id, inventoryItemId, quantityIssued FROM requisition_items WHERE requisitionId = ?', requisitionId
    );
    currentItems.forEach(item => existingItemsMap.set(item.inventoryItemId, item.quantityIssued));


    await db.run('DELETE FROM requisition_items WHERE requisitionId = ?', requisitionId);

    for (const item of values.items) {
      const requisitionItemId = crypto.randomUUID(); 
      const previouslyIssued = existingItemsMap.get(item.inventoryItemId) || 0;
      await db.run(
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, quantityIssued, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
        previouslyIssued, 
        item.notes
      );
    }

    await db.run('COMMIT');
  } catch (error) {
    if (db) {
      try {
        await db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction during update:', rollbackError);
      }
    }
    console.error(`Failed to update requisition ${requisitionId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not update requisition.');
  }

  revalidatePath('/requisitions');
  revalidatePath(`/requisitions/${requisitionId}`);
  revalidatePath(`/requisitions/${requisitionId}/edit`);
  redirect(`/requisitions/${requisitionId}`);
}


export async function getInventoryItemsForSelect(): Promise<SelectItem[]> {
  const db = await openDb();
  const items = await db.all<Pick<InventoryItem, 'id' | 'name' | 'quantity' | 'unitName'>[]>(`
    SELECT i.id, i.name, i.quantity, uom.name as unitName
    FROM inventory i
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    ORDER BY i.name ASC
  `);
  return items.map(item => ({
    value: item.id,
    label: `${item.name} (ID: ${item.id}) - Stock: ${item.quantity} ${item.unitName || ''}`.trim(),
  }));
}

export async function getRequisitions(): Promise<Requisition[]> {
  const db = await openDb();
  const requisitions = await db.all<Omit<Requisition, 'items' | 'requesterName' | 'totalItems'>[] & { itemCount: number }>(`
    SELECT 
      r.id, 
      r.dateCreated, 
      r.dateNeeded, 
      r.status, 
      r.notes, 
      r.lastUpdated,
      (SELECT COUNT(*) FROM requisition_items ri WHERE ri.requisitionId = r.id) as itemCount
    FROM requisitions r
    ORDER BY r.dateCreated DESC
  `);

  return requisitions.map(r => ({
    ...r,
    status: r.status as RequisitionStatus,
    totalItems: r.itemCount,
  }));
}

export async function getRequisitionById(requisitionId: string): Promise<Requisition | null> {
  const db = await openDb();
  const requisitionData = await db.get<Omit<Requisition, 'items' | 'requesterName' | 'totalItems' | 'status'> & { status: string }>(
    `SELECT 
      id, dateCreated, dateNeeded, status, notes, lastUpdated, requesterId, department 
     FROM requisitions 
     WHERE id = ?`,
    requisitionId
  );

  if (!requisitionData) {
    return null;
  }

  const itemsData = await db.all<RequisitionItem[]>(
    `SELECT 
      ri.id, ri.requisitionId, ri.inventoryItemId, i.name as inventoryItemName, 
      i.quantity as inventoryItemCurrentStock,
      ri.quantityRequested, ri.quantityIssued, ri.notes
     FROM requisition_items ri
     JOIN inventory i ON ri.inventoryItemId = i.id
     WHERE ri.requisitionId = ?
     ORDER BY i.name ASC`,
    requisitionId
  );

  return {
    ...requisitionData,
    status: requisitionData.status as RequisitionStatus,
    items: itemsData.map(item => ({...item, quantityIssued: item.quantityIssued || 0})),
    totalItems: itemsData.length,
  };
}

export async function updateRequisitionStatusAction(requisitionId: string, newStatus: RequisitionStatus, workflowNotes?: string) {
  if (!requisitionId || !newStatus) {
    throw new Error("Requisition ID and new status are required.");
  }
  const db = await openDb();
  const currentRequisition = await db.get('SELECT status FROM requisitions WHERE id = ?', requisitionId);
  if (!currentRequisition) {
    throw new Error(`Requisition with ID "${requisitionId}" not found.`);
  }

  const currentStatus = currentRequisition.status as RequisitionStatus;

  if (newStatus === 'CANCELLED' && !(currentStatus === 'PENDING_APPROVAL' || currentStatus === 'APPROVED')) {
    throw new Error(`Requisition cannot be cancelled. Current status: ${currentStatus}.`);
  }
  if ((newStatus === 'APPROVED' || newStatus === 'REJECTED') && currentStatus !== 'PENDING_APPROVAL') {
     throw new Error(`Requisition cannot be ${newStatus.toLowerCase()}. Current status: ${currentStatus}.`);
  }

  try {
    const lastUpdated = new Date().toISOString();
    
    const result = await db.run(
      `UPDATE requisitions
       SET status = ?, lastUpdated = ?
       WHERE id = ?`,
      newStatus,
      lastUpdated,
      requisitionId
    );

    if (result.changes === 0) {
      throw new Error(`Requisition with ID "${requisitionId}" not found or status already set.`);
    }

  } catch (error) {
    console.error(`Failed to update status for requisition ${requisitionId} to ${newStatus}:`, error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not update requisition status.');
  }

  revalidatePath(`/requisitions/${requisitionId}`);
  revalidatePath('/requisitions');
}


export async function processRequisitionFulfillmentAction(
  requisitionId: string, 
  itemsToFulfill: Array<{ requisitionItemId: string; inventoryItemId: string; quantityToIssueNow: number }>
) {
  if (!requisitionId || !itemsToFulfill || itemsToFulfill.length === 0) {
    throw new Error("Requisition ID and items to fulfill are required.");
  }

  const db = await openDb();
  await db.run('BEGIN TRANSACTION');

  try {
    const lastUpdated = new Date().toISOString();

    for (const item of itemsToFulfill) {
      if (item.quantityToIssueNow < 0) {
        throw new Error(`Quantity to issue for item ID ${item.inventoryItemId} cannot be negative.`);
      }
      if (item.quantityToIssueNow === 0) {
        continue; 
      }

      const inventoryItem = await db.get<InventoryItem>(
        'SELECT quantity FROM inventory WHERE id = ?',
        item.inventoryItemId
      );
      if (!inventoryItem) {
        throw new Error(`Inventory item with ID ${item.inventoryItemId} not found.`);
      }
      if (inventoryItem.quantity < item.quantityToIssueNow) {
        throw new Error(`Insufficient stock for item ID ${item.inventoryItemId}. Available: ${inventoryItem.quantity}, Tried to issue: ${item.quantityToIssueNow}.`);
      }

      await db.run(
        'UPDATE inventory SET quantity = quantity - ?, lastUpdated = ? WHERE id = ?',
        item.quantityToIssueNow,
        lastUpdated,
        item.inventoryItemId
      );

      await db.run(
        'UPDATE requisition_items SET quantityIssued = quantityIssued + ? WHERE id = ? AND requisitionId = ?',
        item.quantityToIssueNow,
        item.requisitionItemId,
        requisitionId
      );
    }

    const allRequisitionItems = await db.all<RequisitionItem>(
      'SELECT quantityRequested, quantityIssued FROM requisition_items WHERE requisitionId = ?',
      requisitionId
    );

    let isFullyFulfilled = true;
    let isPartiallyFulfilled = false;

    if (allRequisitionItems.length === 0) {
      isFullyFulfilled = false; 
    }

    for (const reqItem of allRequisitionItems) {
      if ((reqItem.quantityIssued || 0) < reqItem.quantityRequested) {
        isFullyFulfilled = false;
      }
      if ((reqItem.quantityIssued || 0) > 0) {
        isPartiallyFulfilled = true;
      }
    }

    let newStatus: RequisitionStatus;
    if (isFullyFulfilled) {
      newStatus = 'FULFILLED';
    } else if (isPartiallyFulfilled) {
      newStatus = 'PARTIALLY_FULFILLED';
    } else {
      const currentReq = await db.get('SELECT status FROM requisitions WHERE id = ?', requisitionId);
      newStatus = currentReq?.status as RequisitionStatus || 'APPROVED'; 
    }

    await db.run(
      'UPDATE requisitions SET status = ?, lastUpdated = ? WHERE id = ?',
      newStatus,
      lastUpdated,
      requisitionId
    );

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error(`Failed to process fulfillment for requisition ${requisitionId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Fulfillment processing failed: ${error.message}`);
    }
    throw new Error('Fulfillment processing failed due to an unexpected error.');
  }

  revalidatePath(`/requisitions/${requisitionId}`);
  revalidatePath('/requisitions');
  revalidatePath('/inventory'); 
  redirect(`/requisitions/${requisitionId}`);
}

export async function deleteRequisitionAction(requisitionId: string): Promise<{ success: boolean; message: string }> {
  if (!requisitionId) {
    return { success: false, message: "Requisition ID is required for deletion." };
  }

  const db = await openDb();
  await db.run('BEGIN TRANSACTION');

  try {
    // Check current status - for simplicity, allow deletion only for certain statuses
    const requisition = await db.get('SELECT status FROM requisitions WHERE id = ?', requisitionId);
    if (!requisition) {
      await db.run('ROLLBACK');
      return { success: false, message: `Requisition with ID "${requisitionId}" not found.` };
    }

    const deletableStatuses: RequisitionStatus[] = ['PENDING_APPROVAL', 'REJECTED', 'CANCELLED'];
    if (!deletableStatuses.includes(requisition.status as RequisitionStatus)) {
      await db.run('ROLLBACK');
      return { success: false, message: `Requisition cannot be deleted. Current status: ${requisition.status}. Only pending, rejected, or cancelled requisitions can be deleted.` };
    }

    // Delete associated requisition items first
    await db.run('DELETE FROM requisition_items WHERE requisitionId = ?', requisitionId);

    // Delete the requisition itself
    const result = await db.run('DELETE FROM requisitions WHERE id = ?', requisitionId);

    if (result.changes === 0) {
      // Should have been caught by the check above, but as a safeguard
      await db.run('ROLLBACK');
      return { success: false, message: `Requisition with ID "${requisitionId}" not found or already deleted.` };
    }

    await db.run('COMMIT');
    revalidatePath("/requisitions");
    return { success: true, message: `Requisition "${requisitionId}" and its items deleted successfully.` };

  } catch (error: any) {
    await db.run('ROLLBACK');
    console.error(`Failed to delete requisition ${requisitionId}:`, error);
    // Check for foreign key constraint errors if an inventory item was deleted, which shouldn't happen with ON DELETE RESTRICT
    if (error.message.includes('FOREIGN KEY constraint failed')) {
        return { success: false, message: `Failed to delete requisition: A related inventory item might still be in use or there's a data integrity issue.` };
    }
    return { success: false, message: `Failed to delete requisition: ${error.message}` };
  }
}
