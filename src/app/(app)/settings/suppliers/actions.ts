
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { SupplierFormValues } from "./schema";
import type { SupplierDB, SelectItem } from "@/types";

export async function addSupplierAction(data: SupplierFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    const result = await db.run(
      `INSERT INTO suppliers (id, name, contactPerson, contactMail, contactPhone, address) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.contactPerson || null,
      data.contactMail || null,
      data.contactPhone || null,
      data.address || null
    );

    if (!result.lastID) {
        throw new Error("Failed to insert supplier, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add supplier:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed: suppliers.name")) {
            throw new Error(`A supplier with the name "${data.name}" already exists.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add supplier.");
  }

  revalidatePath("/inventory"); // For dropdowns in add item
  revalidatePath("/inventory/new"); // For dropdowns
  revalidatePath("/purchase-orders/new"); // For supplier dropdown in PO form
  // Potentially revalidate a settings page for suppliers if it exists
}

export async function getSuppliers(): Promise<SupplierDB[]> {
  const db = await openDb();
  const suppliers = await db.all<SupplierDB[]>('SELECT id, name, contactPerson, contactMail, contactPhone, address FROM suppliers ORDER BY name ASC');
  return suppliers;
}

export async function getSuppliersForSelect(): Promise<SelectItem[]> {
  const suppliers = await getSuppliers();
  return suppliers.map(sup => ({
    value: sup.id,
    label: sup.name
  }));
}

