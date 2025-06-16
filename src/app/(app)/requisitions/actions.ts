'use server';

import { openDb } from '@/lib/database';
import type { RequisitionFormValues, RequisitionItemFormValues } from './schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { InventoryItem, SelectItem } from '@/types'; // RequisitionItem is for DB, RequisitionItemFormValues for form
import { format } from 'date-fns';

async function generateRequisitionId(db: any): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `REQ-${today}-`;
  const result = await db.get(
    `SELECT id FROM requisitions WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
    `${prefix}%`
  );

  let nextSequence = 1;
  if (result && result.id) {
    const lastId = result.id as string;
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
  const db = await openDb();
  const requisitionId = await generateRequisitionId(db);
  const dateCreated = new Date().toISOString();
  const lastUpdated = dateCreated;

  if (!values.items || values.items.length === 0) {
    throw new Error('At least one item must be added to the requisition.');
  }

  try {
    await db.run('BEGIN TRANSACTION');

    await db.run(
      `INSERT INTO requisitions (id, dateCreated, dateNeeded, status, notes, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      requisitionId,
      dateCreated,
      values.dateNeeded ? values.dateNeeded.toISOString() : null,
      'PENDING_APPROVAL', // Default status
      values.notes,
      lastUpdated
    );

    for (const item of values.items) {
      if (!item.inventoryItemId || item.quantityRequested <= 0) {
        // Basic validation, Zod schema should catch most of this
        console.warn('Skipping invalid item in requisition:', item);
        continue;
      }
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
    await db.run('ROLLBACK');
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

// Action to fetch inventory items specifically for the requisition form's select component
export async function getInventoryItemsForSelect(): Promise<SelectItem[]> {
  const db = await openDb();
  // Fetching only essential fields for the select dropdown to keep it light
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
