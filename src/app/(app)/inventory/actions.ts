
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItemFormValues } from "./schema";
import type { InventoryItem } from '@/types';

export async function addInventoryItemAction(data: InventoryItemFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();
    const lastUpdated = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, quantity, unitCost, lastUpdated, lowStock, categoryId, subCategoryId, locationId, supplierId, unitId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.quantity,
      data.unitCost,
      lastUpdated,
      data.lowStock ? 1 : 0,
      data.categoryId || null,
      data.subCategoryId || null,
      data.locationId || null,
      data.supplierId || null,
      data.unitId || null
    );
  } catch (error) {
    console.error("Failed to add inventory item:", error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add item.");
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const db = await openDb();
  const rawItems = await db.all<({ // Explicitly type rawItems if possible, or use any and map carefully
      id: string;
      name: string;
      quantity: number;
      unitCost: number;
      lastUpdated: string;
      lowStock: number; // 0 or 1
      categoryName?: string | null;
      subCategoryName?: string | null;
      locationName?: string | null;
      supplierName?: string | null;
      unitName?: string | null;
      // Include FKs if they are part of the InventoryItem type and needed
      categoryId?: string | null;
      subCategoryId?: string | null;
      locationId?: string | null;
      supplierId?: string | null;
      unitId?: string | null;
    })[]>(`
    SELECT
      i.id, i.name, i.quantity, i.unitCost, i.lastUpdated, i.lowStock,
      c.name as categoryName, i.categoryId,
      sc.name as subCategoryName, i.subCategoryId,
      l.store || COALESCE(' - ' || l.rack, '') || COALESCE(' - ' || l.shelf, '') as locationName, i.locationId,
      s.name as supplierName, i.supplierId,
      uom.name as unitName, i.unitId
    FROM inventory i
    LEFT JOIN categories c ON i.categoryId = c.id
    LEFT JOIN sub_categories sc ON i.subCategoryId = sc.id
    LEFT JOIN locations l ON i.locationId = l.id
    LEFT JOIN suppliers s ON i.supplierId = s.id
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    ORDER BY i.name ASC
  `);

  return rawItems.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalValue: (item.quantity || 0) * (item.unitCost || 0),
    lastUpdated: item.lastUpdated,
    lowStock: Boolean(item.lowStock),
    categoryName: item.categoryName || undefined,
    subCategoryName: item.subCategoryName || undefined,
    locationName: item.locationName || undefined,
    supplierName: item.supplierName || undefined,
    unitName: item.unitName || undefined,
    categoryId: item.categoryId || undefined,
    subCategoryId: item.subCategoryId || undefined,
    locationId: item.locationId || undefined,
    supplierId: item.supplierId || undefined,
    unitId: item.unitId || undefined,
  }));
}
