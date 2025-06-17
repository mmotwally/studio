
"use server";

import { openDb } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InventoryItem, InventoryItemFormValues, StockMovementReport, StockMovement } from '@/types';
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
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

// pdf-lib imports
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';


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

  const data: InventoryItemFormValues = {
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
    unitId: rawFormData.unitId as string,
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
      throw new Error("Image upload failed. Could not add item.");
    }
  }


  try {
    const db = await openDb();
    await db.run('BEGIN TRANSACTION');
    const itemId = await generateItemId(db, data.categoryId, data.subCategoryId);
    const lastUpdated = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastPurchasePrice, averageCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      itemId,
      data.name,
      data.description,
      imageUrlToStore,
      data.quantity,
      data.unitCost,
      data.unitCost, 
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

    if (data.quantity > 0) {
        await db.run(
            `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, movementDate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            crypto.randomUUID(),
            itemId,
            'INITIAL_STOCK',
            data.quantity,
            data.quantity,
            lastUpdated,
            'New item added'
        );
    }
    await db.run('COMMIT');

  } catch (error) {
    console.error("Failed to add inventory item:", error);
    const db = await openDb().catch(() => null); 
    if (db) await db.run('ROLLBACK').catch(rbError => console.error("Rollback failed:", rbError));
    
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not add item.");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/new");
  redirect("/inventory");
}


export async function updateInventoryItemAction(itemId: string, currentImageUrl: string | null, formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());

  const data: InventoryItemFormValues = {
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
    unitId: rawFormData.unitId as string,
    removeImage: rawFormData.removeImage === 'true', 
  };

  if (!data.categoryId) {
    throw new Error("Category is required.");
  }
  if (!data.unitId) {
    throw new Error("Unit of Measurement is required.");
  }

  let imageUrlToStore: string | null = currentImageUrl; 
  const imageFile = formData.get('imageFile') as File | null;
  const removeImage = data.removeImage;

  try {
    const db = await openDb();
    await db.run('BEGIN TRANSACTION');

    if (imageFile && imageFile.size > 0) {
      if (currentImageUrl && currentImageUrl.startsWith('/uploads/inventory/')) {
        const oldImagePath = path.join(process.cwd(), 'public', currentImageUrl);
        try {
          await fs.unlink(oldImagePath);
        } catch (err: any) {
          if (err.code !== 'ENOENT') console.warn(`Could not delete old image ${oldImagePath}: ${err.message}`);
        }
      }

      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'inventory');
      await ensureDirExists(uploadsDir);
      const fileExtension = path.extname(imageFile.name) || '.png';
      const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFileName);
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      imageUrlToStore = `/uploads/inventory/${uniqueFileName}`;
    }
    else if (removeImage) {
      if (currentImageUrl && currentImageUrl.startsWith('/uploads/inventory/')) {
        const imagePath = path.join(process.cwd(), 'public', currentImageUrl);
        try {
          await fs.unlink(imagePath);
        } catch (err: any) {
          if (err.code !== 'ENOENT') console.warn(`Could not delete image ${imagePath}: ${err.message}`);
        }
      }
      imageUrlToStore = null;
    }

    const lastUpdated = new Date().toISOString();
    const existingItem = await db.get<InventoryItem>('SELECT quantity FROM inventory WHERE id = ?', itemId);
    if (!existingItem) {
        throw new Error(`Item with ID ${itemId} not found.`);
    }
    const quantityChange = data.quantity - (existingItem.quantity || 0);


    await db.run(
      `UPDATE inventory
       SET name = ?, description = ?, imageUrl = ?, quantity = ?, unitCost = ?, lastUpdated = ?,
           lowStock = ?, minStockLevel = ?, maxStockLevel = ?, categoryId = ?, subCategoryId = ?,
           locationId = ?, supplierId = ?, unitId = ?
       WHERE id = ?`,
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
      data.unitId,
      itemId
    );
    
    if (quantityChange !== 0) {
        await db.run(
            `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, movementDate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            crypto.randomUUID(),
            itemId,
            quantityChange > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            quantityChange,
            data.quantity, 
            lastUpdated,
            'Manual stock adjustment during item edit'
        );
    }
    await db.run('COMMIT');

  } catch (error) {
    console.error(`Failed to update inventory item ${itemId}:`, error);
    const db = await openDb().catch(() => null);
    if (db) await db.run('ROLLBACK').catch(rbError => console.error("Rollback failed on update:", rbError));
    
    if (error instanceof Error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
    throw new Error("Database operation failed. Could not update item.");
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}/edit`);
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
      lastPurchasePrice: number;
      averageCost: number;
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
      i.id, i.name, i.description, i.imageUrl, i.quantity, i.unitCost, 
      i.lastPurchasePrice, i.averageCost,
      i.lastUpdated, i.lowStock,
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
    lastPurchasePrice: item.lastPurchasePrice,
    averageCost: item.averageCost,
    totalValue: (item.quantity || 0) * (item.averageCost || item.unitCost || 0), 
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

export async function getInventoryItemById(itemId: string): Promise<InventoryItem | null> {
  const db = await openDb();
  const item = await db.get<({
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      quantity: number;
      unitCost: number;
      lastPurchasePrice: number;
      averageCost: number;
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
    })>(`
    SELECT
      i.id, i.name, i.description, i.imageUrl, i.quantity, i.unitCost,
      i.lastPurchasePrice, i.averageCost,
      i.lastUpdated, i.lowStock,
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
    WHERE i.id = ?
  `, itemId);

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    unitCost: item.unitCost,
    lastPurchasePrice: item.lastPurchasePrice,
    averageCost: item.averageCost,
    totalValue: (item.quantity || 0) * (item.averageCost || item.unitCost || 0),
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
  };
}


export async function deleteInventoryItemAction(itemId: string): Promise<{ success: boolean; message: string }> {
  if (!itemId) {
    return { success: false, message: "Item ID is required for deletion." };
  }

  const db = await openDb();
  await db.run('BEGIN TRANSACTION');
  try {
    const requisitionItem = await db.get('SELECT id FROM requisition_items WHERE inventoryItemId = ? LIMIT 1', itemId);
    if (requisitionItem) {
      await db.run('ROLLBACK');
      return { success: false, message: `Cannot delete item "${itemId}". It is referenced in requisitions.` };
    }
    const purchaseOrderItem = await db.get('SELECT id FROM purchase_order_items WHERE inventoryItemId = ? LIMIT 1', itemId);
    if (purchaseOrderItem) {
      await db.run('ROLLBACK');
      return { success: false, message: `Cannot delete item "${itemId}". It is referenced in purchase orders.` };
    }
    
    await db.run('DELETE FROM stock_movements WHERE inventoryItemId = ?', itemId);

    const item = await db.get('SELECT imageUrl FROM inventory WHERE id = ?', itemId);
    const result = await db.run('DELETE FROM inventory WHERE id = ?', itemId);

    if (result.changes === 0) {
      await db.run('ROLLBACK');
      return { success: false, message: `Item with ID "${itemId}" not found.` };
    }

    if (item && item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('/uploads/inventory/')) {
      const imagePath = path.join(process.cwd(), 'public', item.imageUrl);
      try {
        await fs.unlink(imagePath);
      } catch (fileError: any) {
        if (fileError.code !== 'ENOENT') {
          console.warn(`Could not delete image file ${imagePath}: ${fileError.message}`);
        }
      }
    }
    await db.run('COMMIT');
    revalidatePath("/inventory");
    return { success: true, message: `Item "${itemId}" deleted successfully.` };
  } catch (error: any) {
    await db.run('ROLLBACK');
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
    lastPurchasePrice: item.lastPurchasePrice,
    averageCost: item.averageCost,
    minStockLevel: item.minStockLevel || 0,
    maxStockLevel: item.maxStockLevel || 0,
    categoryCode: item.categoryCode || "",
    subCategoryCode: item.subCategoryCode || "",
    locationStore: item.locationName ? item.locationName.split(' - ')[0] : "",
    locationRack: item.locationName && item.locationName.includes(' - ') && item.locationName.split(' - ').length > 1 ? item.locationName.split(' - ')[1] : "",
    locationShelf: item.locationName && item.locationName.includes(' - ') && item.locationName.split(' - ').length > 2 ? item.locationName.split(' - ')[2] : "",
    supplierName: item.supplierName || "",
    unitName: item.unitName || "",
    imageUrl: item.imageUrl || "", 
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
  ImageURL?: string; 
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
        await db.run('BEGIN TRANSACTION');
        await db.run(
          `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastPurchasePrice, averageCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          itemId,
          row.Name,
          row.Description || null,
          row.ImageURL || null, 
          quantity,
          unitCost,
          unitCost, 
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
        if (quantity > 0) {
            await db.run(
                `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, movementDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                crypto.randomUUID(),
                itemId,
                'INITIAL_STOCK', 
                quantity,
                quantity,
                lastUpdated,
                'Imported from Excel'
            );
        }
        await db.run('COMMIT');
        importedCount++;
      } catch (dbError: any) {
        await db.run('ROLLBACK').catch(rbErr => console.error("Rollback failed in import:", rbErr));
        errors.push({ row: rowNum, message: `Database error: ${dbError.message}` });
      }
    }

  } catch (error: any) {
    console.error("Import failed:", error);
    return { success: false, message: `Import process failed: ${error.message}`, importedCount, failedCount: errors.length, errors };
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

export async function getStockMovementDetailsAction(inventoryItemId: string, fromDateString: string, toDateString: string): Promise<StockMovementReport> {
  const db = await openDb();

  const item = await db.get<InventoryItem>('SELECT id, name FROM inventory WHERE id = ?', inventoryItemId);
  if (!item) {
    throw new Error(`Inventory item with ID ${inventoryItemId} not found.`);
  }

  // Parse date strings (YYYY-MM-DD) into Date objects.
  // parseISO correctly handles "YYYY-MM-DD" by interpreting it as local time 00:00:00.
  const fromDateLocal = parseISO(fromDateString); 
  const toDateLocal = parseISO(toDateString);     

  // Get the start of the "from" day and end of the "to" day in local time.
  const fromDateStartLocal = startOfDay(fromDateLocal);
  const toDateEndLocal = endOfDay(toDateLocal);     

  // Format these local Date objects into UTC ISO strings for database querying.
  // 'Z' in the format string ensures it's converted to UTC.
  const fromDateISOQuery = format(fromDateStartLocal, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const toDateISOQuery = format(toDateEndLocal, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

  // Query for the last movement *before* the start of the fromDate.
  const openingStockResult = await db.get<{ balance: number } | undefined>(
    `SELECT balanceAfterMovement as balance 
     FROM stock_movements 
     WHERE inventoryItemId = ? AND movementDate < ? 
     ORDER BY movementDate DESC, id DESC LIMIT 1`,
    inventoryItemId,
    fromDateISOQuery 
  );
  
  const openingStock = openingStockResult?.balance ?? 0;

  // Query for movements *within* the period (inclusive of start and end dates, considering full days).
  const movementsInPeriod = await db.all<StockMovement[]>(
    `SELECT sm.id, sm.inventoryItemId, i.name as inventoryItemName, sm.movementType, sm.quantityChanged, 
            sm.balanceAfterMovement, sm.referenceId, sm.movementDate, sm.userId, u.name as userName, sm.notes
     FROM stock_movements sm
     JOIN inventory i ON sm.inventoryItemId = i.id
     LEFT JOIN users u ON sm.userId = u.id
     WHERE sm.inventoryItemId = ? AND sm.movementDate >= ? AND sm.movementDate <= ?
     ORDER BY sm.movementDate ASC, sm.id ASC`,
    inventoryItemId,
    fromDateISOQuery, 
    toDateISOQuery    
  );

  let totalIn = 0;
  let totalOut = 0;
  movementsInPeriod.forEach(m => {
    if (m.quantityChanged > 0) totalIn += m.quantityChanged;
    else totalOut += Math.abs(m.quantityChanged);
  });

  // Closing stock is the balance after the last movement in the period,
  // or opening stock if no movements occurred in the period.
  const closingStock = movementsInPeriod.length > 0 
    ? movementsInPeriod[movementsInPeriod.length - 1].balanceAfterMovement
    : openingStock;


  return {
    inventoryItemId: item.id,
    inventoryItemName: item.name,
    periodFrom: fromDateString, // Return original YYYY-MM-DD for display
    periodTo: toDateString,     // Return original YYYY-MM-DD for display
    openingStock,
    totalIn,
    totalOut,
    closingStock,
    movements: movementsInPeriod.map(m => ({
        ...m,
        // Format movementDate back to a more readable local time format for display
        movementDate: format(parseISO(m.movementDate), "yyyy-MM-dd HH:mm") 
    })),
  };
}


export async function generateStockMovementPdfAction(reportData: StockMovementReport): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4_LANDSCAPE);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    let y = height - margin;
    
    const mainTitleSize = 18;
    const itemTitleSize = 14;
    const periodTextSize = 10;
    const summaryLabelSize = 10;
    const summaryValueSize = 10;
    const tableHeaderSize = 9;
    const tableBodySize = 8;

    const lineHeightMultiplier = 1.2;
    const sectionGap = 15;
    // const tableTopMargin = 20; // Not explicitly used, direct y calculation
    const cellPadding = 5;

    // Main Title
    page.setFont(boldFont);
    page.setFontSize(mainTitleSize);
    const mainTitleText = "Stock Movement Report";
    page.drawText(mainTitleText, {
      x: margin,
      y: y,
      font: boldFont,
      size: mainTitleSize,
    });
    y -= mainTitleSize * lineHeightMultiplier;

    // Item Name and ID
    page.setFont(font);
    page.setFontSize(itemTitleSize);
    const itemTitleText = `Item: ${reportData.inventoryItemName} (${reportData.inventoryItemId})`;
    page.drawText(itemTitleText, { x: margin, y: y, font: font, size: itemTitleSize });
    y -= itemTitleSize * lineHeightMultiplier * 1.5; // Extra gap after item title

    // Period
    page.setFont(font);
    page.setFontSize(periodTextSize);
    page.drawText(`Period: ${reportData.periodFrom} to ${reportData.periodTo}`, { x: margin, y: y, size: periodTextSize });
    y -= periodTextSize * lineHeightMultiplier + sectionGap;

    // Summary Section
    const summaryItemWidth = (width - 2 * margin - cellPadding *2) / 2; // For two columns
    const summaryStartY = y;
    const summaryLabelXOffset = 100; // How far from label to draw the value
    const summaryColumn2XOffset = summaryItemWidth + cellPadding;

    page.setFont(boldFont);
    page.setFontSize(summaryLabelSize);
    page.drawText(`Opening Stock:`, { x: margin, y: y, font: boldFont, size: summaryLabelSize });
    page.setFont(font);
    page.setFontSize(summaryValueSize);
    page.drawText(`${reportData.openingStock}`, { x: margin + summaryLabelXOffset, y: y, size: summaryValueSize });

    page.setFont(boldFont);
    page.drawText(`Total In (+):`, { x: margin + summaryColumn2XOffset, y: y, font: boldFont, size: summaryLabelSize });
    page.setFont(font);
    page.drawText(`${reportData.totalIn}`, { x: margin + summaryColumn2XOffset + summaryLabelXOffset, y: y, size: summaryValueSize });
    
    y -= summaryLabelSize * lineHeightMultiplier * 1.5; // Slightly more space between summary rows

    page.setFont(boldFont);
    page.drawText(`Closing Stock:`, { x: margin, y: y, font: boldFont, size: summaryLabelSize });
    page.setFont(font);
    page.drawText(`${reportData.closingStock}`, { x: margin + summaryLabelXOffset, y: y, size: summaryValueSize });

    page.setFont(boldFont);
    page.drawText(`Total Out (-):`, { x: margin + summaryColumn2XOffset, y: y, font: boldFont, size: summaryLabelSize });
    page.setFont(font);
    page.drawText(`${reportData.totalOut}`, { x: margin + summaryColumn2XOffset + summaryLabelXOffset, y: y, size: summaryValueSize });
    
    y = summaryStartY - (summaryLabelSize * lineHeightMultiplier * 1.5 * 2) - sectionGap; // Adjusted y based on two rows of summary


    // Table Headers
    const tableHeaders = ['Date', 'Type', 'Ref', 'Qty Chg', 'Balance', 'Notes', 'User'];
    // Adjusted colWidths: Date, Type, Ref, QtyChg, Balance, Notes (larger), User
    const colWidths = [90, 100, 80, 60, 60, 220, 70]; 
    let currentX = margin;

    page.setFont(boldFont);
    page.setFontSize(tableHeaderSize); 
    tableHeaders.forEach((header, i) => {
      page.drawText(header, { x: currentX + cellPadding, y: y, font: boldFont, size: tableHeaderSize });
      currentX += colWidths[i];
    });
    y -= tableHeaderSize * 0.8; 
    
    // Line below header
    page.drawLine({
        start: { x: margin, y: y + cellPadding * 0.5 },
        end: { x: width - margin, y: y + cellPadding * 0.5 },
        thickness: 0.8,
        color: rgb(0.3, 0.3, 0.3), // Darker gray for line
    });
    y -= tableHeaderSize * 0.8 + cellPadding * 0.5; 

    // Table Body
    page.setFont(font);
    page.setFontSize(tableBodySize);
    reportData.movements.forEach(mov => {
      if (y < margin + tableBodySize * 2) { 
        page.addPage(PageSizes.A4_LANDSCAPE);
        y = height - margin - tableBodySize; 
        // TODO: Consider redrawing headers on new page for very long tables if needed
      }
      currentX = margin;
      const rowData = [
        mov.movementDate,
        mov.movementType.replace(/_/g, ' '), // Replace underscores for display
        mov.referenceId || '-',
        mov.quantityChanged > 0 ? `+${mov.quantityChanged}` : mov.quantityChanged.toString(),
        mov.balanceAfterMovement.toString(),
        mov.notes || '-',
        mov.userName || mov.userId || '-',
      ];
      rowData.forEach((cell, i) => {
        let xPos = currentX + cellPadding;
        // Right-align numeric columns (Qty Chg and Balance)
        if (i === 3 || i === 4) { 
            const textWidth = font.widthOfTextAtSize(cell, tableBodySize);
            xPos = currentX + colWidths[i] - textWidth - cellPadding;
        }
        page.drawText(cell, { x: xPos, y: y, size: tableBodySize, font: font, color: rgb(0,0,0) });
        currentX += colWidths[i];
      });
      y -= tableBodySize * lineHeightMultiplier;
    });
    
    if (reportData.movements.length === 0) {
        page.setFont(font);
        page.setFontSize(tableBodySize);
        const noMovementsText = "No movements recorded for this period.";
        const textWidth = font.widthOfTextAtSize(noMovementsText, tableBodySize);
        page.drawText(noMovementsText, {
            x: margin + (width - 2 * margin - textWidth) / 2, // Centered
            y: y - tableBodySize,
            font: font,
            size: tableBodySize,
            color: rgb(0.5, 0.5, 0.5) // Muted color
        });
    }

    const pdfBytes = await pdfDoc.save();
    const base64String = Buffer.from(pdfBytes).toString('base64');
    return `data:application/pdf;base64,${base64String}`;

  } catch (error) {
    console.error("Error generating PDF with pdf-lib:", error);
    throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
  }
}
    

    











    
