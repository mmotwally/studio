
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import type { LocationFormValues } from "./schema";
import type { LocationDB } from "@/types";

export async function addLocationAction(data: LocationFormValues) {
  try {
    const db = await openDb();
    const id = crypto.randomUUID();

    const result = await db.run(
      `INSERT INTO locations (id, store, rack, shelf) VALUES (?, ?, ?, ?)`,
      id,
      data.store,
      data.rack || null,
      data.shelf || null
    );

    if (!result.lastID) {
        throw new Error("Failed to insert location, no ID returned.");
    }

  } catch (error) {
    console.error("Failed to add location:", error);
    if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint failed: locations.store, locations.rack, locations.shelf")) {
            throw new Error(`This exact location (Store: ${data.store}, Rack: ${data.rack || 'N/A'}, Shelf: ${data.shelf || 'N/A'}) already exists.`);
        }
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add location.");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/new");
}

export async function getLocations(): Promise<LocationDB[]> {
  const db = await openDb();
  const locations = await db.all<LocationDB[]>(`
    SELECT 
      id, 
      store, 
      rack, 
      shelf,
      store || COALESCE(' - ' || rack, '') || COALESCE(' - ' || shelf, '') as fullName
    FROM locations 
    ORDER BY store, rack, shelf ASC
  `);
  return locations;
}
