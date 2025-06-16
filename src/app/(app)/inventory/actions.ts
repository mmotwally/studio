
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItemFormValues } from "./schema";

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
