
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItem } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto'; // For unique filenames

// Helper function to ensure directory exists
async function ensureDirExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') { // Ignore error if directory already exists
      console.error(`Failed to create directory ${dirPath}:`, error);
      throw error; // Re-throw other errors
    }
  }
}

export async function addInventoryItemAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());

  // Manually parse and coerce form data because FormData sends everything as string
  const data = {
    name: rawFormData.name as string,
    description: rawFormData.description ? rawFormData.description as string : null,
    quantity: parseInt(rawFormData.quantity as string, 10) || 0,
    unitCost: parseFloat(rawFormData.unitCost as string) || 0,
    lowStock: rawFormData.lowStock === 'on' || rawFormData.lowStock === 'true',
    minStockLevel: parseInt(rawFormData.minStockLevel as string, 10) || 0,
    maxStockLevel: parseInt(rawFormData.maxStockLevel as string, 10) || 0,
    categoryId: rawFormData.categoryId ? rawFormData.categoryId as string : undefined,
    subCategoryId: rawFormData.subCategoryId ? rawFormData.subCategoryId as string : undefined,
    locationId: rawFormData.locationId ? rawFormData.locationId as string : undefined,
    supplierId: rawFormData.supplierId ? rawFormData.supplierId as string : undefined,
    unitId: rawFormData.unitId ? rawFormData.unitId as string : undefined,
  };

  let imageUrlToStore: string | null = null;
  const imageFile = formData.get('imageFile') as File | null;

  if (imageFile && imageFile.size > 0) {
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'inventory');
      await ensureDirExists(uploadsDir);

      const fileExtension = path.extname(imageFile.name) || '.png'; // default to png if no extension
      const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      imageUrlToStore = `/uploads/inventory/${uniqueFileName}`;
    } catch (error) {
      console.error("Failed to upload image:", error);
      // Decide if you want to throw an error and stop item creation or proceed without image
      // For now, proceeding without image if upload fails.
      // throw new Error("Image upload failed.");
    }
  }


  try {
    const db = await openDb();
    const id = crypto.randomUUID();
    const lastUpdated = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.description,
      imageUrlToStore, // Use the path of the stored image
      data.quantity,
      data.unitCost,
      lastUpdated,
      data.lowStock ? 1 : 0,
      data.minStockLevel,
      data.maxStockLevel,
      data.categoryId,
      data.subCategoryId,
      data.locationId,
      data.supplierId,
      data.unitId
    );
  } catch (error) {
    console.error("Failed to add inventory item:", error);
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add item.");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/new");
  redirect("/inventory");
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const db = await openDb();
  const rawItems = await db.all<({
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      quantity: number;
      unitCost: number;
      lastUpdated: string;
      lowStock: number;
      minStockLevel: number;
      maxStockLevel: number;
      categoryName?: string | null;
      subCategoryName?: string | null;
      locationName?: string | null;
      supplierName?: string | null;
      unitName?: string | null;
      categoryId?: string | null;
      subCategoryId?: string | null;
      locationId?: string | null;
      supplierId?: string | null;
      unitId?: string | null;
    })[]>(`
    SELECT
      i.id, i.name, i.description, i.imageUrl, i.quantity, i.unitCost, i.lastUpdated, i.lowStock,
      i.minStockLevel, i.maxStockLevel,
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
    description: item.description,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalValue: (item.quantity || 0) * (item.unitCost || 0),
    lastUpdated: item.lastUpdated,
    lowStock: Boolean(item.lowStock),
    minStockLevel: item.minStockLevel,
    maxStockLevel: item.maxStockLevel,
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
