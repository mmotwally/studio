
'use server';

import { openDb } from '@/lib/database';
import type { RequisitionFormValues } from './schema';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { InventoryItem, SelectItem } from '@/types';
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
    const lastId = result.id; // No need to cast, it's already string | undefined
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
    const requisitionId = await generateRequisitionId(db);
    const dateCreated = new Date().toISOString();
    const lastUpdated = dateCreated;

    // Zod schema ensures items array has at least one item.
    // if (!values.items || values.items.length === 0) {
    //   throw new Error('At least one item must be added to the requisition.');
    // }

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
      // Zod schema validation for item.inventoryItemId and item.quantityRequested
      // should have already occurred on the client side if using react-hook-form with zodResolver.
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
            // Attempt to rollback only if a transaction might have started.
            // A more robust check would be to see if db is in a transaction state,
            // but sqlite driver might not easily expose this.
            // For simplicity, always try rollback if db object exists after an error.
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

  // If we reach here, the try block was successful.
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
