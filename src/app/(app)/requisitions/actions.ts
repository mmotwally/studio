
'use server';

import { openDb } from '@/lib/database';
import type { RequisitionFormValues } from './schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { InventoryItem, Requisition, RequisitionItem, RequisitionStatus, SelectItem, ApproveRequisitionFormValues } from '@/types';
import { format, parseISO } from 'date-fns';
import type { Database as SqliteDatabaseType } from 'sqlite';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';

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
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, quantityApproved, quantityIssued, isApproved, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
        null, // quantityApproved is null initially
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
    let newStatus = originalStatus;

    if (originalStatus === 'FULFILLED' || originalStatus === 'PARTIALLY_FULFILLED') {
      const existingItems = await db.all<RequisitionItem>(
        'SELECT id, inventoryItemId, quantityIssued FROM requisition_items WHERE requisitionId = ?',
        requisitionId
      );
      for (const item of existingItems) {
        if (item.quantityIssued > 0) {
          const currentInv = await db.get<InventoryItem>('SELECT quantity FROM inventory WHERE id = ?', item.inventoryItemId);
          const newInvQty = (currentInv?.quantity ?? 0) + item.quantityIssued;
          
          await db.run(
            'UPDATE inventory SET quantity = ?, lastUpdated = ? WHERE id = ?',
            newInvQty,
            lastUpdated,
            item.inventoryItemId
          );
          // Log stock movement for returned items
          await db.run(
            `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, referenceId, movementDate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            crypto.randomUUID(),
            item.inventoryItemId,
            'REQUISITION_RETURN', // New movement type
            item.quantityIssued,    // Positive quantity for return
            newInvQty,
            requisitionId,
            lastUpdated,
            `Stock returned from edited Requisition ${requisitionId}`
          );
        }
      }
       newStatus = 'APPROVED'; 
    } else if (originalStatus === 'REJECTED' || originalStatus === 'CANCELLED') {
        newStatus = 'PENDING_APPROVAL';
    }


    await db.run('DELETE FROM requisition_items WHERE requisitionId = ?', requisitionId);

    for (const item of values.items) {
      const requisitionItemId = crypto.randomUUID(); 
      await db.run(
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, quantityApproved, quantityIssued, isApproved, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
        (newStatus === 'APPROVED' && (originalStatus === 'FULFILLED' || originalStatus === 'PARTIALLY_FULFILLED')) ? null : null, 
        0, 
        0, 
        item.notes
      );
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


export async function getInventoryItemsForSelect(): Promise<Array<{ value: string; label: string; lastPurchasePrice?: number | null; unitCost?: number | null; quantity?: number; unitName?: string | null }>> {
  const db = await openDb();
  const items = await db.all<Pick<InventoryItem, 'id' | 'name' | 'quantity' | 'unitName' | 'lastPurchasePrice' | 'unitCost'>[]>(`
    SELECT i.id, i.name, i.quantity, uom.name as unitName, i.lastPurchasePrice, i.unitCost
    FROM inventory i
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    ORDER BY i.name ASC
  `);
  return items.map(item => ({
    value: item.id,
    label: `${item.name} (ID: ${item.id}) - Stock: ${item.quantity || 0} ${item.unitName || ''}`.trim(),
    lastPurchasePrice: item.lastPurchasePrice,
    unitCost: item.unitCost, // This is the item's current unit cost from inventory table
    quantity: item.quantity,
    unitName: item.unitName
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
      u.name as requesterName,
      r.orderNumber,
      r.bomNumber,
      (SELECT COUNT(*) FROM requisition_items ri WHERE ri.requisitionId = r.id) as itemCount
    FROM requisitions r
    LEFT JOIN departments d ON r.departmentId = d.id
    LEFT JOIN users u ON r.requesterId = u.id
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
  const requisitionData = await db.get<Omit<Requisition, 'items' | 'totalItems' | 'status' | 'departmentName'> & { status: string, departmentName?: string, requesterName?: string }>(
    `SELECT 
      r.id, r.dateCreated, r.dateNeeded, r.status, r.notes, r.lastUpdated, r.requesterId, 
      u.name as requesterName,
      r.departmentId, d.name as departmentName, r.orderNumber, r.bomNumber
     FROM requisitions r
     LEFT JOIN departments d ON r.departmentId = d.id
     LEFT JOIN users u ON r.requesterId = u.id
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
      ri.quantityRequested, ri.quantityApproved, ri.quantityIssued, ri.isApproved, ri.notes
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
    requesterName: requisitionData.requesterName || undefined,
    items: itemsData.map(item => ({
        ...item, 
        quantityApproved: item.quantityApproved === null ? undefined : item.quantityApproved,
        quantityIssued: item.quantityIssued || 0, 
        isApproved: Boolean(item.isApproved)
    })),
    totalItems: itemsData.length,
  };
}

export async function updateRequisitionStatusAction(requisitionId: string, newStatus: RequisitionStatus, workflowNotes?: string) {
  if (!requisitionId || !newStatus) {
    throw new Error("Requisition ID and new status are required.");
  }
  const db = await openDb();
  await db.run('BEGIN TRANSACTION');
  let currentRequisition: Requisition | undefined = undefined;
  try {
    currentRequisition = await db.get<Requisition>('SELECT id, status FROM requisitions WHERE id = ?', requisitionId);
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
        const currentInv = await db.get<InventoryItem>('SELECT quantity FROM inventory WHERE id = ?', item.inventoryItemId);
        const newInvQty = (currentInv?.quantity ?? 0) + item.quantityIssued;
        await db.run(
          'UPDATE inventory SET quantity = ?, lastUpdated = ? WHERE id = ?',
          newInvQty,
          lastUpdated,
          item.inventoryItemId
        );
        // Log stock movement for returned items
        await db.run(
          `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, referenceId, movementDate, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          item.inventoryItemId,
          'REQUISITION_RETURN',
          item.quantityIssued, // Positive for return
          newInvQty,
          requisitionId,
          lastUpdated,
          `Stock returned from cancelled Requisition ${requisitionId}`
        );
      }
      await db.run(
        'UPDATE requisition_items SET quantityIssued = 0, quantityApproved = 0, isApproved = 0 WHERE requisitionId = ?',
        requisitionId
      );
    } else if (newStatus === 'CANCELLED') {
       await db.run(
        'UPDATE requisition_items SET quantityApproved = 0, isApproved = 0 WHERE requisitionId = ?', 
        requisitionId
      );
    }
    
    if (newStatus === 'REJECTED') {
        if (currentStatus !== 'PENDING_APPROVAL' && currentStatus !== 'APPROVED') { 
            throw new Error(`Requisition cannot be rejected. Current status: ${currentStatus}.`);
        }
        await db.run('UPDATE requisition_items SET isApproved = 0, quantityApproved = 0 WHERE requisitionId = ?', requisitionId);
    }
    
    await db.run(
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
  if (newStatus === 'CANCELLED' && currentRequisition && (currentRequisition.status === 'FULFILLED' || currentRequisition.status === 'PARTIALLY_FULFILLED')) {
    revalidatePath('/inventory');
  }
}

export async function approveRequisitionItemsAction(requisitionId: string, itemsToApprove: Array<{ requisitionItemId: string; quantityToApprove: number }>) {
  if (!requisitionId || !itemsToApprove) {
    throw new Error("Requisition ID and items for approval are required.");
  }

  const db = await openDb();
  await db.run('BEGIN TRANSACTION');
  try {
    const lastUpdated = new Date().toISOString();
    const currentRequisition = await db.get<Requisition>('SELECT id, status FROM requisitions WHERE id = ?', requisitionId);
    if (!currentRequisition) {
      throw new Error(`Requisition with ID "${requisitionId}" not found.`);
    }
    if (currentRequisition.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve items for a requisition that is not in 'PENDING_APPROVAL' status. Current status: ${currentRequisition.status}`);
    }

    for (const itemDecision of itemsToApprove) {
      const { requisitionItemId, quantityToApprove } = itemDecision;
      
      const reqItem = await db.get<RequisitionItem>('SELECT quantityRequested FROM requisition_items WHERE id = ? AND requisitionId = ?', requisitionItemId, requisitionId);
      if (!reqItem) {
        throw new Error(`Requisition item with ID ${requisitionItemId} not found for this requisition.`);
      }
      if (quantityToApprove < 0 || quantityToApprove > reqItem.quantityRequested) {
        throw new Error(`Invalid quantity to approve (${quantityToApprove}) for item ${requisitionItemId}. Must be between 0 and ${reqItem.quantityRequested}.`);
      }

      await db.run(
        'UPDATE requisition_items SET quantityApproved = ?, isApproved = ? WHERE id = ?',
        quantityToApprove,
        quantityToApprove > 0 ? 1 : 0,
        requisitionItemId
      );
    }
    
    const allItemsInRequisition = await db.all<RequisitionItem>('SELECT quantityApproved FROM requisition_items WHERE requisitionId = ?', requisitionId);
    
    const allDecisionsMade = allItemsInRequisition.every(item => item.quantityApproved !== null && item.quantityApproved !== undefined);
    let newRequisitionStatus: RequisitionStatus = 'PENDING_APPROVAL';

    if (allDecisionsMade) {
      const anyItemApproved = allItemsInRequisition.some(item => (item.quantityApproved ?? 0) > 0);
      if (anyItemApproved) {
        newRequisitionStatus = 'APPROVED';
      } else {
        newRequisitionStatus = 'REJECTED';
      }
    }

    if (newRequisitionStatus !== currentRequisition.status) {
         await db.run(
            'UPDATE requisitions SET status = ?, lastUpdated = ? WHERE id = ?',
            newRequisitionStatus,
            lastUpdated,
            requisitionId
        );
    } else {
         await db.run(
            'UPDATE requisitions SET lastUpdated = ? WHERE id = ?',
            lastUpdated,
            requisitionId
        );
    }

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error(`Failed to approve items for requisition ${requisitionId}:`, error);
    if (error instanceof Error) {
      throw new Error(`Approval processing failed: ${error.message}`);
    }
    throw new Error('Approval processing failed due to an unexpected error.');
  }
  revalidatePath(`/requisitions/${requisitionId}`);
  revalidatePath('/requisitions');
  redirect(`/requisitions/${requisitionId}?approval_success=true`);
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

      const reqItemDetails = await db.get<RequisitionItem>(
          'SELECT isApproved, quantityApproved, quantityIssued FROM requisition_items WHERE id = ? AND requisitionId = ?', 
          item.requisitionItemId, requisitionId
      );

      if (!reqItemDetails) {
        throw new Error(`Requisition item ${item.requisitionItemId} not found for requisition ${requisitionId}.`);
      }
      if (!reqItemDetails.isApproved || (reqItemDetails.quantityApproved ?? 0) === 0) { 
        throw new Error(`Item ${item.inventoryItemId} (${item.requisitionItemId}) is not approved or has an approved quantity of 0.`);
      }
      
      const qtyActuallyApproved = reqItemDetails.quantityApproved ?? 0;
      const alreadyIssued = reqItemDetails.quantityIssued ?? 0;
      const remainingToIssueBasedOnApproval = qtyActuallyApproved - alreadyIssued;

      if (item.quantityToIssueNow > remainingToIssueBasedOnApproval) {
        throw new Error(`Cannot issue ${item.quantityToIssueNow} for item ${item.inventoryItemId}. Max remaining based on approval: ${remainingToIssueBasedOnApproval}.`);
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
      
      const newInventoryQuantity = inventoryItem.quantity - item.quantityToIssueNow;

      await db.run(
        'UPDATE inventory SET quantity = ?, lastUpdated = ? WHERE id = ?',
        newInventoryQuantity,
        lastUpdated,
        item.inventoryItemId
      );

      await db.run(
        'UPDATE requisition_items SET quantityIssued = quantityIssued + ? WHERE id = ? AND requisitionId = ?',
        item.quantityToIssueNow,
        item.requisitionItemId,
        requisitionId
      );

      // Log stock movement
      await db.run(
        `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, referenceId, movementDate, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        item.inventoryItemId,
        'REQUISITION_ISSUE',
        -item.quantityToIssueNow, // Negative quantity
        newInventoryQuantity,
        requisitionId,
        lastUpdated,
        `Issued for Requisition ${requisitionId}`
      );
    }

    const allApprovedItems = await db.all<RequisitionItem>(
      'SELECT quantityApproved, quantityIssued FROM requisition_items WHERE requisitionId = ? AND isApproved = 1 AND quantityApproved > 0',
      requisitionId
    );

    let newStatus: RequisitionStatus;
    
    if (allApprovedItems.length === 0) { 
        const anyItemEligibleForFulfillment = await db.get(
            'SELECT 1 FROM requisition_items WHERE requisitionId = ? AND isApproved = 1 AND quantityApproved > 0 LIMIT 1',
            requisitionId
        );
        if (!anyItemEligibleForFulfillment) { 
            newStatus = 'FULFILLED'; 
        } else {
             newStatus = 'FULFILLED';
        }

    } else {
        const isFullyFulfilled = allApprovedItems.every(
        (reqItem) => (reqItem.quantityIssued ?? 0) >= (reqItem.quantityApproved ?? 0)
        );
        const isPartiallyFulfilled = allApprovedItems.some(
        (reqItem) => (reqItem.quantityIssued ?? 0) > 0 && (reqItem.quantityIssued ?? 0) < (reqItem.quantityApproved ?? 0)
        );
        const anyIssuedAtAll = allApprovedItems.some(item => (item.quantityIssued ?? 0) > 0);


        if (isFullyFulfilled) {
        newStatus = 'FULFILLED';
        } else if (isPartiallyFulfilled || anyIssuedAtAll) { 
        newStatus = 'PARTIALLY_FULFILLED';
        } else { 
        newStatus = 'APPROVED';
        }
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
  redirect(`/requisitions/${requisitionId}?fulfillment_success=true`);
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
        const currentInv = await db.get<InventoryItem>('SELECT quantity FROM inventory WHERE id = ?', item.inventoryItemId);
        const newInvQty = (currentInv?.quantity ?? 0) + item.quantityIssued;
        await db.run(
            'UPDATE inventory SET quantity = ?, lastUpdated = ? WHERE id = ?',
            newInvQty,
            lastUpdated,
            item.inventoryItemId
        );
        // Log stock movement for returned items during deletion
        await db.run(
          `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, referenceId, movementDate, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          item.inventoryItemId,
          'REQUISITION_RETURN',
          item.quantityIssued, // Positive for return
          newInvQty,
          requisitionId,
          lastUpdated,
          `Stock returned from deleted Requisition ${requisitionId}`
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


export async function generateRequisitionPdfAction(reqData: Requisition): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = height - margin;
    const lineSpacing = 14;
    const smallLineSpacing = 12;
    const sectionGap = 20;

    // Title
    page.setFont(boldFont);
    page.setFontSize(18);
    page.drawText("Requisition Issue Voucher", { x: margin, y, font: boldFont });
    y -= lineSpacing * 1.8;

    // Requisition Details
    page.setFont(font);
    page.setFontSize(10);
    page.drawText(`Requisition ID: ${reqData.id}`, { x: margin, y, font: boldFont });
    y -= lineSpacing;
    page.drawText(`Department: ${reqData.departmentName || 'N/A'}`, { x: margin, y });
    page.drawText(`Requester: ${reqData.requesterName || 'N/A'}`, { x: width / 2, y });
    y -= lineSpacing;
    page.drawText(`Date Created: ${format(parseISO(reqData.dateCreated), "PP")}`, { x: margin, y });
    if (reqData.dateNeeded) {
      page.drawText(`Date Needed: ${format(parseISO(reqData.dateNeeded), "PP")}`, { x: width / 2, y });
    }
    y -= lineSpacing;
    page.drawText(`Status: ${reqData.status.replace(/_/g, ' ')}`, { x: margin, y });
    y -= sectionGap;

    // Items Table
    page.setFont(boldFont);
    page.setFontSize(11);
    page.drawText("Issued Items", { x: margin, y, font: boldFont });
    y -= lineSpacing * 1.5;

    const tableTopY = y;
    const colWidths = [250, 100, 100]; // Item Name, Item ID, Qty Issued
    const headers = ["Item Name", "Item ID", "Quantity Issued"];
    let currentX = margin;

    page.setFont(boldFont);
    page.setFontSize(10);
    headers.forEach((header, i) => {
      page.drawText(header, { x: currentX + 2, y, font: boldFont });
      currentX += colWidths[i];
    });
    y -= 5;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    y -= lineSpacing;

    page.setFont(font);
    page.setFontSize(9);
    
    const issuedItems = reqData.items?.filter(item => (item.quantityIssued ?? 0) > 0) || [];

    if (issuedItems.length > 0) {
      issuedItems.forEach(item => {
        if (y < margin + lineSpacing * 2) { // Check for page break
          page.addPage(PageSizes.A4);
          y = height - margin;
          // Optionally redraw headers on new page for very long tables
           currentX = margin;
           page.setFont(boldFont);
           page.setFontSize(10);
           headers.forEach((header, i) => {
             page.drawText(header, { x: currentX + 2, y, font: boldFont });
             currentX += colWidths[i];
           });
           y -= 5;
           page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
           y -= lineSpacing;
           page.setFont(font);
           page.setFontSize(9);
        }
        currentX = margin;
        page.drawText(item.inventoryItemName || 'N/A', { x: currentX + 2, y });
        currentX += colWidths[0];
        page.drawText(item.inventoryItemId, { x: currentX + 2, y });
        currentX += colWidths[1];
        page.drawText((item.quantityIssued || 0).toString(), { x: currentX + 2, y });
        y -= lineSpacing;
      });
    } else {
        page.drawText("No items have been issued for this requisition.", { x: margin, y, font: font, size: 9, color: rgb(0.5,0.5,0.5) });
        y -= lineSpacing;
    }


    // Receiver Confirmation Section
    y -= sectionGap * 2; // More space before this section
    if (y < margin + lineSpacing * 4) { // Check if enough space for signature lines
        page.addPage(PageSizes.A4);
        y = height - margin;
    }

    page.setFont(boldFont);
    page.setFontSize(11);
    page.drawText("Received By:", { x: margin, y, font: boldFont });
    y -= lineSpacing * 1.5;

    page.setFont(font);
    page.setFontSize(10);
    const fieldWidth = (width - 2 * margin - 20) / 2; // For two fields per line
    const signatureLineY = y - lineSpacing;

    page.drawText("Name:", { x: margin, y });
    page.drawLine({ start: { x: margin + 40, y: y - 2 }, end: { x: margin + 40 + fieldWidth * 0.8, y: y - 2 }, thickness: 0.5 });
    
    page.drawText("Date:", { x: margin + 40 + fieldWidth * 0.8 + 20, y });
    page.drawLine({ start: { x: margin + 40 + fieldWidth * 0.8 + 20 + 35, y: y - 2 }, end: { x: width - margin, y: y - 2 }, thickness: 0.5 });
    
    y -= lineSpacing * 2;

    page.drawText("Signature:", { x: margin, y });
    page.drawLine({ start: { x: margin + 60, y: y - 2 }, end: { x: margin + 60 + fieldWidth, y: y - 2 }, thickness: 0.5 });


    const pdfBytes = await pdfDoc.save();
    const base64String = Buffer.from(pdfBytes).toString('base64');
    return `data:application/pdf;base64,${base64String}`;

  } catch (error) {
    console.error("Error generating Requisition PDF:", error);
    throw new Error(`Failed to generate Requisition PDF: ${(error as Error).message}`);
  }
}
    
    


