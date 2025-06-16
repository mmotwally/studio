
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
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, notes)
         VALUES (?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
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

    // Update main requisition details
    await db.run(
      `UPDATE requisitions
       SET dateNeeded = ?, notes = ?, lastUpdated = ?
       WHERE id = ?`,
      values.dateNeeded ? values.dateNeeded.toISOString() : null,
      values.notes,
      lastUpdated,
      requisitionId
    );

    // Delete existing items for this requisition
    await db.run('DELETE FROM requisition_items WHERE requisitionId = ?', requisitionId);

    // Re-insert all items from the form
    for (const item of values.items) {
      const requisitionItemId = crypto.randomUUID(); // Generate new UUID for each item, even if it's an "update"
      await db.run(
        `INSERT INTO requisition_items (id, requisitionId, inventoryItemId, quantityRequested, notes)
         VALUES (?, ?, ?, ?, ?)`,
        requisitionItemId,
        requisitionId,
        item.inventoryItemId,
        item.quantityRequested,
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
    items: itemsData,
    totalItems: itemsData.length,
  };
}

export async function updateRequisitionStatusAction(requisitionId: string, newStatus: RequisitionStatus, workflowNotes?: string) {
  if (!requisitionId || !newStatus) {
    throw new Error("Requisition ID and new status are required.");
  }

  let db;
  try {
    db = await openDb();
    const lastUpdated = new Date().toISOString();
    
    // For now, workflowNotes are not stored in a separate field.
    // They could be appended to the main 'notes' or a new field 'workflow_notes' could be added to the requisitions table.
    
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
    if (db && error instanceof Error && error.message.includes("ROLLBACK")) {
        // No explicit transaction here
    }
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error('Database operation failed. Could not update requisition status.');
  }

  revalidatePath(`/requisitions/${requisitionId}`);
  revalidatePath('/requisitions');
}
