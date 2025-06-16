
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItemFormValues } from "./schema"; // Import from the new schema file

export async function addInventoryItemAction(data: InventoryItemFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();
    const lastUpdated = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, category, quantity, unitCost, location, supplier, lastUpdated, lowStock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.category || null,
      data.quantity,
      data.unitCost,
      data.location || null,
      data.supplier || null,
      lastUpdated,
      data.lowStock ? 1 : 0
    );
  } catch (error) {
    console.error("Failed to add inventory item:", error);
    // Re-throw a more specific error or a generic one for the client
    // This message will be caught by the try-catch block in the client component.
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add item.");
  }

  revalidatePath("/inventory");
  redirect("/inventory"); // This should be called after successful operation
}

