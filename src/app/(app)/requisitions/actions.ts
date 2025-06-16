
'use server';

import { openDb } from '@/lib/database';
import type { RequisitionFormValues } from './schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { InventoryItem, Requisition, RequisitionItem, RequisitionStatus, SelectItem } from '@/types';
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
      `INSERT INTO requisitions (id, departmentId, orderNumber, bomNumber, dateCreated, dateNeeded, status, notes, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      requisitionId,
      values.departmentId,
      values.orderNumber,
      values.bomNumber,
      dateCreated,
      values.dateNeeded ? values.dateNeeded.toISOString() : null,
      'PENDING_APPROVAL', 
      values.notes,
      lastUpdated
    );

    for (const item of values.items) {
      const requisitionItemId = crypto.randomUUID();
      await db.run(
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, quantityIssued, isApproved, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
        0, 
        0, // isApproved defaults to 0 (false)
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

    const currentRequisition = await db.get<Requisition>('SELECT id, status FROM requisitions WHERE id = ?', requisitionId);
    if (!currentRequisition) {
        throw new Error("Requisition not found.");
    }

    const originalStatus = currentRequisition.status;

    if (originalStatus === 'FULFILLED' || originalStatus === 'PARTIALLY_FULFILLED') {
      const existingItems = await db.all<RequisitionItem>(
        'SELECT id, inventoryItemId, quantityIssued FROM requisition_items WHERE requisitionId = ?',
        requisitionId
      );
      for (const item of existingItems) {
        if (item.quantityIssued > 0) {
          await db.run(
            'UPDATE inventory SET quantity = quantity + ?, lastUpdated = ? WHERE id = ?',
            item.quantityIssued,
            lastUpdated,
            item.inventoryItemId
          );
        }
      }
    }

    await db.run('DELETE FROM requisition_items WHERE requisitionId = ?', requisitionId);

    for (const item of values.items) {
      const requisitionItemId = crypto.randomUUID(); 
      await db.run(
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, quantityIssued, isApproved, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
        0, 
        0, // New items in an edit are not approved by default
        item.notes
      );
    }

    let newStatus = originalStatus;
    if ((originalStatus === 'FULFILLED' || originalStatus === 'PARTIALLY_FULFILLED')) {
      newStatus = 'APPROVED'; 
    } else if (originalStatus === 'REJECTED' || originalStatus === 'CANCELLED') {
        newStatus = 'PENDING_APPROVAL';
    }

    await db.run(
      `UPDATE requisitions
       SET departmentId = ?, orderNumber = ?, bomNumber = ?, dateNeeded = ?, notes = ?, lastUpdated = ?, status = ?
       WHERE id = ?`,
      values.departmentId,
      values.orderNumber,
      values.bomNumber,
      values.dateNeeded ? values.dateNeeded.toISOString() : null,
      values.notes,
      lastUpdated,
      newStatus,
      requisitionId
    );

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
  revalidatePath('/inventory'); 
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
  const requisitionsData = await db.all<Omit<Requisition, 'items' | 'requesterName' | 'totalItems' | 'departmentName'>[] & { itemCount: number, departmentName?: string }>(`
    SELECT 
      r.id, 
      r.dateCreated, 
      r.dateNeeded, 
      r.status, 
      r.notes, 
      r.lastUpdated,
      r.departmentId,
      d.name as departmentName,
      r.orderNumber,
      r.bomNumber,
      (SELECT COUNT(*) FROM requisition_items ri WHERE ri.requisitionId = r.id) as itemCount
    FROM requisitions r
    LEFT JOIN departments d ON r.departmentId = d.id
    ORDER BY r.dateCreated DESC
  `);

  return requisitionsData.map(r => ({
    ...r,
    status: r.status as RequisitionStatus,
    totalItems: r.itemCount,
    departmentName: r.departmentName || undefined,
  }));
}

export async function getRequisitionById(requisitionId: string): Promise<Requisition | null> {
  const db = await openDb();
  const requisitionData = await db.get<Omit<Requisition, 'items' | 'requesterName' | 'totalItems' | 'status' | 'departmentName'> & { status: string, departmentName?: string }>(
    `SELECT 
      r.id, r.dateCreated, r.dateNeeded, r.status, r.notes, r.lastUpdated, r.requesterId, 
      r.departmentId, d.name as departmentName, r.orderNumber, r.bomNumber
     FROM requisitions r
     LEFT JOIN departments d ON r.departmentId = d.id
     WHERE r.id = ?`,
    requisitionId
  );

  if (!requisitionData) {
    return null;
  }

  const itemsData = await db.all<RequisitionItem[]>(
    `SELECT 
      ri.id, ri.requisitionId, ri.inventoryItemId, i.name as inventoryItemName, 
      i.quantity as inventoryItemCurrentStock,
      ri.quantityRequested, ri.quantityIssued, ri.isApproved, ri.notes
     FROM requisition_items ri
     JOIN inventory i ON ri.inventoryItemId = i.id
     WHERE ri.requisitionId = ?
     ORDER BY i.name ASC`,
    requisitionId
  );

  return {
    ...requisitionData,
    status: requisitionData.status as RequisitionStatus,
    departmentName: requisitionData.departmentName || undefined,
    items: itemsData.map(item => ({...item, quantityIssued: item.quantityIssued || 0, isApproved: Boolean(item.isApproved)})),
    totalItems: itemsData.length,
  };
}

export async function updateRequisitionStatusAction(requisitionId: string, newStatus: RequisitionStatus, workflowNotes?: string) {
  if (!requisitionId || !newStatus) {
    throw new Error("Requisition ID and new status are required.");
  }
  const db = await openDb();
  await db.run('BEGIN TRANSACTION');
  try {
    const currentRequisition = await db.get<Requisition>('SELECT id, status FROM requisitions WHERE id = ?', requisitionId);
    if (!currentRequisition) {
      throw new Error(`Requisition with ID "${requisitionId}" not found.`);
    }

    const currentStatus = currentRequisition.status;
    const lastUpdated = new Date().toISOString();

    if (newStatus === 'CANCELLED' && (currentStatus === 'FULFILLED' || currentStatus === 'PARTIALLY_FULFILLED')) {
      const itemsToReturn = await db.all<RequisitionItem>(
        'SELECT inventoryItemId, quantityIssued FROM requisition_items WHERE requisitionId = ? AND quantityIssued > 0',
        requisitionId
      );
      for (const item of itemsToReturn) {
        await db.run(
          'UPDATE inventory SET quantity = quantity + ?, lastUpdated = ? WHERE id = ?',
          item.quantityIssued,
          lastUpdated,
          item.inventoryItemId
        );
      }
      await db.run(
        'UPDATE requisition_items SET quantityIssued = 0 WHERE requisitionId = ?', // isApproved status remains as is
        requisitionId
      );
    } else if (newStatus === 'CANCELLED' && !(currentStatus === 'PENDING_APPROVAL' || currentStatus === 'APPROVED')) {
      // If cancelling an already fulfilled/partially fulfilled, allow, handled above.
      // This condition now mainly prevents cancelling 'REJECTED' or already 'CANCELLED' requisitions.
      if (currentStatus === 'REJECTED' || currentStatus === 'CANCELLED') {
         throw new Error(`Requisition cannot be cancelled. Current status: ${currentStatus}.`);
      }
    }
    
    // When REJECTING the whole requisition
    if (newStatus === 'REJECTED') {
        if (currentStatus !== 'PENDING_APPROVAL') {
            throw new Error(`Requisition cannot be rejected. Current status: ${currentStatus}.`);
        }
        // Set all items to not approved
        await db.run('UPDATE requisition_items SET isApproved = 0 WHERE requisitionId = ?', requisitionId);
    }
    
    // The main "Approve" for the whole requisition is now handled by approveRequisitionItemsAction
    // This action is now mainly for Reject, Cancel, or other direct status changes not involving item-level decisions.
    if ((newStatus === 'APPROVED') && currentStatus !== 'PENDING_APPROVAL') {
       // This specific transition should ideally be handled by approveRequisitionItemsAction
       // to ensure items are actually approved.
       // For now, if this action is directly called to set to 'APPROVED', we assume items are handled elsewhere or it's a general approval.
       // Consider if this direct 'APPROVED' status update is still needed or should be deprecated.
       console.warn(`Requisition ${requisitionId} directly set to APPROVED. Ensure item approval is handled.`);
    }


    const result = await db.run(
      `UPDATE requisitions
       SET status = ?, lastUpdated = ?
       WHERE id = ?`,
      newStatus,
      lastUpdated,
      requisitionId
    );

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error(`Failed to update status for requisition ${requisitionId} to ${newStatus}:`, error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not update requisition status.');
  }

  revalidatePath(`/requisitions/${requisitionId}`);
  revalidatePath('/requisitions');
  if (newStatus === 'CANCELLED') {
    revalidatePath('/inventory');
  }
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

      // Check if item is approved before fulfilling
      const reqItemDetails = await db.get<RequisitionItem>('SELECT isApproved FROM requisition_items WHERE id = ? AND requisitionId = ?', item.requisitionItemId, requisitionId);
      if (!reqItemDetails || !reqItemDetails.isApproved) {
        throw new Error(`Item ${item.inventoryItemId} (${item.requisitionItemId}) is not approved for fulfillment.`);
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
      'SELECT quantityRequested, quantityIssued, isApproved FROM requisition_items WHERE requisitionId = ?',
      requisitionId
    );

    let isFullyFulfilled = true;
    let isPartiallyFulfilled = false;
    const approvedItems = allRequisitionItems.filter(i => i.isApproved);

    if (approvedItems.length === 0 && allRequisitionItems.length > 0) { // If there are items but none approved
      isFullyFulfilled = false; // Cannot be fully fulfilled if no items are approved
    } else if (approvedItems.length === 0 && allRequisitionItems.length === 0) { // No items in requisition
        isFullyFulfilled = false; // Or handle as an edge case, perhaps shouldn't reach here.
    }


    for (const reqItem of approvedItems) { // Only check approved items for fulfillment status
      if ((reqItem.quantityIssued || 0) < reqItem.quantityRequested) {
        isFullyFulfilled = false;
      }
      if ((reqItem.quantityIssued || 0) > 0) {
        isPartiallyFulfilled = true;
      }
    }
    
    // If there are unapproved items, it can't be 'FULFILLED' in the sense of all *requested* items.
    // But it can be 'FULFILLED' in the sense of all *approved* items.
    // Let's refine: if all *approved* items are fully issued, AND no other items are pending approval, then it's FULFILLED.
    // If some approved items are issued, it's PARTIALLY_FULFILLED.

    const unapprovedPendingItemsExist = allRequisitionItems.some(item => !item.isApproved);

    let newStatus: RequisitionStatus;
    if (isFullyFulfilled && !unapprovedPendingItemsExist && approvedItems.length > 0) { // All approved items are fully issued and no pending items
      newStatus = 'FULFILLED';
    } else if (isPartiallyFulfilled || (isFullyFulfilled && unapprovedPendingItemsExist)) { // Some items issued, or all approved items issued but other items still pending approval
      newStatus = 'PARTIALLY_FULFILLED';
    } else { // No items issued, or no approved items to issue
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
    const requisition = await db.get<Requisition>('SELECT status FROM requisitions WHERE id = ?', requisitionId);
    if (!requisition) {
      await db.run('ROLLBACK');
      return { success: false, message: `Requisition with ID "${requisitionId}" not found.` };
    }
    
    const lastUpdated = new Date().toISOString();

    const itemsToReturn = await db.all<RequisitionItem>(
        'SELECT inventoryItemId, quantityIssued FROM requisition_items WHERE requisitionId = ? AND quantityIssued > 0',
        requisitionId
    );

    for (const item of itemsToReturn) {
        await db.run(
            'UPDATE inventory SET quantity = quantity + ?, lastUpdated = ? WHERE id = ?',
            item.quantityIssued,
            lastUpdated,
            item.inventoryItemId
        );
    }

    await db.run('DELETE FROM requisition_items WHERE requisitionId = ?', requisitionId);
    const result = await db.run('DELETE FROM requisitions WHERE id = ?', requisitionId);

    if (result.changes === 0) {
      await db.run('ROLLBACK');
      return { success: false, message: `Requisition with ID "${requisitionId}" not found or already deleted during transaction.` };
    }

    await db.run('COMMIT');
    revalidatePath("/requisitions");
    if (itemsToReturn.length > 0) {
        revalidatePath('/inventory');
    }
    return { success: true, message: `Requisition "${requisitionId}" and its items deleted successfully. Issued stock (if any) returned to inventory.` };

  } catch (error: any) {
    await db.run('ROLLBACK');
    console.error(`Failed to delete requisition ${requisitionId}:`, error);
    if (error.message.includes('FOREIGN KEY constraint failed')) {
        return { success: false, message: `Failed to delete requisition: A related record might still be in use or there's a data integrity issue.` };
    }
    return { success: false, message: `Failed to delete requisition: ${error.message}` };
  }
}
    
