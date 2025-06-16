
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItem } from '@/types';
import { getCategoryById } from "@/app/(app)/settings/categories/actions";
import { getSubCategoryById } from "@/app/(app)/settings/sub-categories/actions";
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto'; // For unique filenames for images

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

async function generateItemId(db: Database, categoryId: string, subCategoryId?: string | null): Promise<string> {
  const category = await getCategoryById(categoryId);
  if (!category || !category.code) {
    throw new Error("Selected category is invalid or missing a code.");
  }

  let prefix = category.code + "-";
  if (subCategoryId) {
    const subCategory = await getSubCategoryById(subCategoryId);
    if (subCategory && subCategory.code) {
      prefix += subCategory.code + "-";
    } else if (subCategory && !subCategory.code) {
      // This case should ideally not happen if codes are enforced
      console.warn(`Sub-category ${subCategoryId} is missing a code. Item ID will not include sub-category code.`);
    }
  }
  
  // Query for the highest sequence number for this prefix
  // The 'id' column stores the full ID, e.g., "WP-PLY-001"
  // We need to extract the numeric part after the prefix.
  const likePattern = prefix + '%';
  const result = await db.get(
    `SELECT id FROM inventory WHERE id LIKE ? ORDER BY id DESC LIMIT 1`, 
    likePattern
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


export async function addInventoryItemAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());

  const data = {
    name: rawFormData.name as string,
    description: rawFormData.description ? rawFormData.description as string : null,
    quantity: parseInt(rawFormData.quantity as string, 10) || 0,
    unitCost: parseFloat(rawFormData.unitCost as string) || 0,
    lowStock: rawFormData.lowStock === 'on' || rawFormData.lowStock === 'true',
    minStockLevel: parseInt(rawFormData.minStockLevel as string, 10) || 0,
    maxStockLevel: parseInt(rawFormData.maxStockLevel as string, 10) || 0,
    categoryId: rawFormData.categoryId as string, // Now mandatory
    subCategoryId: rawFormData.subCategoryId ? rawFormData.subCategoryId as string : undefined,
    locationId: rawFormData.locationId ? rawFormData.locationId as string : undefined,
    supplierId: rawFormData.supplierId ? rawFormData.supplierId as string : undefined,
    unitId: rawFormData.unitId ? rawFormData.unitId as string : undefined,
  };

  if (!data.categoryId) {
    throw new Error("Category is required to add an inventory item.");
  }

  let imageUrlToStore: string | null = null;
  const imageFile = formData.get('imageFile') as File | null;

  if (imageFile && imageFile.size > 0) {
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'inventory');
      await ensureDirExists(uploadsDir);

      const fileExtension = path.extname(imageFile.name) || '.png'; 
      const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      imageUrlToStore = `/uploads/inventory/${uniqueFileName}`;
    } catch (error) {
      console.error("Failed to upload image:", error);
    }
  }

  try {
    const db = await openDb();
    const itemId = await generateItemId(db, data.categoryId, data.subCategoryId);
    const lastUpdated = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      itemId,
      data.name,
      data.description,
      imageUrlToStore,
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
      categoryCode?: string | null;
      subCategoryName?: string | null;
      subCategoryCode?: string | null;
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
      c.name as categoryName, c.code as categoryCode, i.categoryId,
      sc.name as subCategoryName, sc.code as subCategoryCode, i.subCategoryId,
      l.store || COALESCE(' - ' || l.rack, '') || COALESCE(' - ' || l.shelf, '') as locationName, i.locationId,
      s.name as supplierName, i.supplierId,
      uom.name as unitName, i.unitId
    FROM inventory i
    LEFT JOIN categories c ON i.categoryId = c.id
    LEFT JOIN sub_categories sc ON i.subCategoryId = sc.id
    LEFT JOIN locations l ON i.locationId = l.id
    LEFT JOIN suppliers s ON i.supplierId = s.id
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    ORDER BY i.id ASC -- Order by the new structured ID
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
    categoryCode: item.categoryCode || undefined,
    subCategoryName: item.subCategoryName || undefined,
    subCategoryCode: item.subCategoryCode || undefined,
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

    