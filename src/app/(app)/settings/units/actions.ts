
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { UnitOfMeasurementFormValues } from "./schema";
import type { UnitOfMeasurementDB } from "@/types";

export async function addUnitOfMeasurementAction(data: UnitOfMeasurementFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    const result = await db.run(
      `INSERT INTO units_of_measurement (id, name, abbreviation) VALUES (?, ?, ?)`,
      id,
      data.name,
      data.abbreviation || null
    );

    if (!result.lastID) {
        throw new Error("Failed to insert unit of measurement, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add unit of measurement:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed")) { // Covers name and abbreviation
            throw new Error(`A unit with this name or abbreviation already exists.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add unit.");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/new");
}

export async function getUnitsOfMeasurement(): Promise<UnitOfMeasurementDB[]> {
  const db = await openDb();
  const units = await db.all<UnitOfMeasurementDB[]>('SELECT id, name, abbreviation FROM units_of_measurement ORDER BY name ASC');
  return units;
}
