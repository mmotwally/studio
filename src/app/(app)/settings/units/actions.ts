
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { UnitOfMeasurementFormValues } from "./schema";
import type { UnitOfMeasurementDB } from "@/types";

export async function addUnitOfMeasurementAction(data: UnitOfMeasurementFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    // Normalize conversion factor: if it's a base unit, factor is 1.
    const factor = data.baseUnitId ? data.conversionFactor : 1.0;
    const baseId = data.baseUnitId || null; // Ensure NULL if empty string

    const result = await db.run(
      `INSERT INTO units_of_measurement (id, name, abbreviation, base_unit_id, conversion_factor) VALUES (?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.abbreviation || null,
      baseId,
      factor
    );

    if (!result.lastID) {
        throw new Error("Failed to insert unit of measurement, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add unit of measurement:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed")) { 
            throw new Error(`A unit with this name or abbreviation already exists.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add unit.");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/new");
  revalidatePath("/settings/units"); // If there's a settings page for units
}

export async function getUnitsOfMeasurement(): Promise<UnitOfMeasurementDB[]> {
  const db = await openDb();
  const units = await db.all<UnitOfMeasurementDB[]>(`
    SELECT 
      uom.id, 
      uom.name, 
      uom.abbreviation, 
      uom.base_unit_id as baseUnitId,
      bu.name as baseUnitName, 
      uom.conversion_factor as conversionFactor
    FROM units_of_measurement uom
    LEFT JOIN units_of_measurement bu ON uom.base_unit_id = bu.id
    ORDER BY uom.name ASC
  `);
  return units.map(u => ({...u, conversionFactor: Number(u.conversionFactor) })); // Ensure conversionFactor is number
}
