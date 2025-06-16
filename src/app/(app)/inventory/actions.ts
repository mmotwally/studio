
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItem } from '@/types';
import { getCategoryById, getCategories } from "@/app/(app)/settings/categories/actions";
import { getSubCategoryById, getSubCategories } from "@/app/(app)/settings/sub-categories/actions";
import { getLocations } from "@/app/(app)/settings/locations/actions";
import { getSuppliers } from "@/app/(app)/settings/suppliers/actions";
import { getUnitsOfMeasurement } from "@/app/(app)/settings/units/actions";

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { Database } from 'sqlite';
import * as XLSX from 'xlsx';


async function ensureDirExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error(`Failed to create directory ${dirPath}:`, error);
      throw error;
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
      console.warn(`Sub-category ${subCategoryId} is missing a code. Item ID will not include sub-category code.`);
    }
  }

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
    categoryId: rawFormData.categoryId as string,
    subCategoryId: rawFormData.subCategoryId ? rawFormData.subCategoryId as string : undefined,
    locationId: rawFormData.locationId ? rawFormData.locationId as string : undefined,
    supplierId: rawFormData.supplierId ? rawFormData.supplierId as string : undefined,
    unitId: rawFormData.unitId ? rawFormData.unitId as string : undefined,
  };

  if (!data.categoryId) {
    throw new Error("Category is required to add an inventory item.");
  }
  if (!data.unitId) {
    throw new Error("Unit of Measurement is required to add an inventory item.");
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
      // Potentially throw error or return a specific response if image upload is critical
    }
  } else if (rawFormData.imageUrl && typeof rawFormData.imageUrl === 'string' && rawFormData.imageUrl.trim() !== '') {
    // This branch might be less relevant now with direct file uploads,
    // but kept for potential future use or if manual URL input is re-enabled.
    imageUrlToStore = rawFormData.imageUrl.trim();
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
  revalidatePath("/inventory/new"); // In case user wants to add another
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
    ORDER BY i.id ASC
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

export async function deleteInventoryItemAction(itemId: string): Promise<{ success: boolean; message: string }> {
  if (!itemId) {
    return { success: false, message: "Item ID is required for deletion." };
  }

  const db = await openDb();
  try {
    // 1. Fetch item to get imageUrl
    const item = await db.get('SELECT imageUrl FROM inventory WHERE id = ?', itemId);

    // 2. Delete item from database
    const result = await db.run('DELETE FROM inventory WHERE id = ?', itemId);

    if (result.changes === 0) {
      return { success: false, message: `Item with ID "${itemId}" not found.` };
    }

    // 3. Delete local image file if it exists
    if (item && item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('/uploads/inventory/')) {
      const imagePath = path.join(process.cwd(), 'public', item.imageUrl);
      try {
        await fs.unlink(imagePath);
        console.log(`Successfully deleted image file: ${imagePath}`);
      } catch (fileError: any) {
        // Log error but don't fail the whole operation if file deletion fails (e.g., file already gone)
        console.warn(`Could not delete image file ${imagePath}: ${fileError.message}`);
      }
    }

    revalidatePath("/inventory");
    return { success: true, message: `Item "${itemId}" deleted successfully.` };
  } catch (error: any) {
    console.error(`Failed to delete item ${itemId}:`, error);
    return { success: false, message: `Failed to delete item: ${error.message}` };
  }
}


export async function exportInventoryToExcelAction(): Promise<Omit<InventoryItem, 'totalValue' | 'lastUpdated' | 'lowStock' | 'categoryId' | 'subCategoryId' | 'locationId' | 'supplierId' | 'unitId'>[]> {
  const items = await getInventoryItems();
  return items.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    quantity: item.quantity,
    unitCost: item.unitCost,
    minStockLevel: item.minStockLevel || 0,
    maxStockLevel: item.maxStockLevel || 0,
    categoryCode: item.categoryCode || "",
    subCategoryCode: item.subCategoryCode || "",
    locationStore: item.locationName ? item.locationName.split(' - ')[0] : "",
    locationRack: item.locationName && item.locationName.includes(' - ') && item.locationName.split(' - ').length > 1 ? item.locationName.split(' - ')[1] : "",
    locationShelf: item.locationName && item.locationName.includes(' - ') && item.locationName.split(' - ').length > 2 ? item.locationName.split(' - ')[2] : "",
    supplierName: item.supplierName || "",
    unitName: item.unitName || "",
    imageUrl: item.imageUrl || "", // Keep imageUrl for export context, though not for re-import of local files
  }));
}

interface ExcelRow {
  Name?: string;
  Description?: string;
  Quantity?: number;
  UnitCost?: number;
  MinStockLevel?: number;
  MaxStockLevel?: number;
  CategoryCode?: string;
  SubCategoryCode?: string;
  LocationStore?: string;
  LocationRack?: string;
  LocationShelf?: string;
  SupplierName?: string;
  UnitName?: string;
  ImageURL?: string; // For importing external URLs if needed, not for local file paths.
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export async function importInventoryFromExcelAction(formData: FormData): Promise<{
  success: boolean;
  message: string;
  importedCount: number;
  failedCount: number;
  errors: ImportError[];
}> {
  const file = formData.get('excelFile') as File | null;

  if (!file) {
    return { success: false, message: "No Excel file provided.", importedCount: 0, failedCount: 0, errors: [{row: 0, message: "No file"}] };
  }

  let importedCount = 0;
  const errors: ImportError[] = [];

  try {
    const db = await openDb();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

    const allCategories = await getCategories();
    const allSubCategories = await getSubCategories();
    const allLocations = await getLocations();
    const allSuppliers = await getSuppliers();
    const allUnits = await getUnitsOfMeasurement();

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2;

      if (!row.Name) { errors.push({ row: rowNum, field: 'Name', message: 'Name is required.' }); continue; }
      if (row.Quantity === undefined || isNaN(Number(row.Quantity))) { errors.push({ row: rowNum, field: 'Quantity', message: 'Quantity is required and must be a number.' }); continue; }
      if (row.UnitCost === undefined || isNaN(Number(row.UnitCost))) { errors.push({ row: rowNum, field: 'UnitCost', message: 'UnitCost is required and must be a number.' }); continue; }
      if (!row.CategoryCode) { errors.push({ row: rowNum, field: 'CategoryCode', message: 'CategoryCode is required.' }); continue; }
      if (!row.UnitName) { errors.push({ row: rowNum, field: 'UnitName', message: 'UnitName is required.' }); continue; }

      const category = allCategories.find(c => c.code === row.CategoryCode);
      if (!category) { errors.push({ row: rowNum, field: 'CategoryCode', message: `Category with code "${row.CategoryCode}" not found.` }); continue; }

      let subCategory = null;
      if (row.SubCategoryCode) {
        subCategory = allSubCategories.find(sc => sc.categoryId === category.id && sc.code === row.SubCategoryCode);
        if (!subCategory) { errors.push({ row: rowNum, field: 'SubCategoryCode', message: `Sub-category with code "${row.SubCategoryCode}" under category "${category.name}" not found.` }); continue; }
      }

      let location = null;
      if (row.LocationStore) {
        location = allLocations.find(l =>
          l.store === row.LocationStore &&
          (l.rack || null) === (row.LocationRack || null) &&
          (l.shelf || null) === (row.LocationShelf || null)
        );
        if (!location) { errors.push({ row: rowNum, field: 'LocationStore/Rack/Shelf', message: `Location matching Store: "${row.LocationStore}", Rack: "${row.LocationRack || ''}", Shelf: "${row.LocationShelf || ''}" not found.` }); continue; }
      }

      let supplier = null;
      if (row.SupplierName) {
        supplier = allSuppliers.find(s => s.name === row.SupplierName);
        if (!supplier) { errors.push({ row: rowNum, field: 'SupplierName', message: `Supplier with name "${row.SupplierName}" not found.` }); continue; }
      }

      const unit = allUnits.find(u => u.name === row.UnitName);
      if (!unit) { errors.push({ row: rowNum, field: 'UnitName', message: `Unit of Measurement with name "${row.UnitName}" not found.` }); continue; }

      const itemId = await generateItemId(db, category.id, subCategory?.id || null);
      const lastUpdated = new Date().toISOString();
      const quantity = Number(row.Quantity);
      const unitCost = Number(row.UnitCost);
      const minStockLevel = row.MinStockLevel !== undefined ? Number(row.MinStockLevel) : 0;
      const maxStockLevel = row.MaxStockLevel !== undefined ? Number(row.MaxStockLevel) : 0;

      if (maxStockLevel > 0 && minStockLevel > maxStockLevel) {
         errors.push({ row: rowNum, field: 'MaxStockLevel', message: 'Max stock level cannot be less than min stock level.' }); continue;
      }

      try {
        await db.run(
          `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          itemId,
          row.Name,
          row.Description || null,
          row.ImageURL || null, // Excel import will only support URLs for images
          quantity,
          unitCost,
          lastUpdated,
          (quantity < minStockLevel && minStockLevel > 0) ? 1 : 0,
          minStockLevel,
          maxStockLevel,
          category.id,
          subCategory?.id || null,
          location?.id || null,
          supplier?.id || null,
          unit.id
        );
        importedCount++;
      } catch (dbError: any) {
        errors.push({ row: rowNum, message: `Database error: ${dbError.message}` });
      }
    }

  } catch (error: any) {
    console.error("Import failed:", error);
    return { success: false, message: `Import process failed: ${error.message}`, importedCount, failedCount: 0, errors };
  }

  revalidatePath("/inventory");
  return {
    success: true,
    message: `Import processed. ${importedCount} items imported. ${errors.length} items failed.`,
    importedCount,
    failedCount: errors.length,
    errors
  };
}

