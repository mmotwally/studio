
"use server";

import { openDb } from "@/lib/database";
import type { ReportFilter, InventoryStockListItem, LowStockItem, RequisitionSummaryItem, PurchaseOrderSummaryItem } from '@/types';
import { formatISO, startOfDay, endOfDay, parseISO } from 'date-fns';

export async function getInventoryStockListReport(filters: ReportFilter): Promise<InventoryStockListItem[]> {
  const db = await openDb();
  // Filters (like categoryId) can be added to the query if provided in `filters`
  const items = await db.all<any[]>(`
    SELECT
      i.id, i.name, i.description, i.quantity, i.unitCost, i.averageCost,
      (i.quantity * COALESCE(i.averageCost, i.unitCost, 0)) as totalValue,
      i.minStockLevel, (i.quantity <= i.minStockLevel AND i.minStockLevel > 0) as lowStock,
      c.name as categoryName, sc.name as subCategoryName,
      l.store || COALESCE(' - ' || l.rack, '') || COALESCE(' - ' || l.shelf, '') as locationName,
      s.name as supplierName, uom.name as unitName
    FROM inventory i
    LEFT JOIN categories c ON i.categoryId = c.id
    LEFT JOIN sub_categories sc ON i.subCategoryId = sc.id
    LEFT JOIN locations l ON i.locationId = l.id
    LEFT JOIN suppliers s ON i.supplierId = s.id
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    ORDER BY i.name ASC
  `);
  return items.map(item => ({
    ...item,
    lowStock: Boolean(item.lowStock),
    totalValue: parseFloat(item.totalValue) || 0,
    averageCost: parseFloat(item.averageCost) || null,
    unitCost: parseFloat(item.unitCost) || 0,
  }));
}

export async function getLowStockReport(filters: ReportFilter): Promise<LowStockItem[]> {
  const db = await openDb();
  const items = await db.all<any[]>(`
    SELECT
      i.id, i.name, i.quantity, i.minStockLevel, 
      (i.minStockLevel - i.quantity) as diffQtyNeeded,
      uom.name as unitName, s.name as supplierName, c.name as categoryName
    FROM inventory i
    LEFT JOIN units_of_measurement uom ON i.unitId = uom.id
    LEFT JOIN suppliers s ON i.supplierId = s.id
    LEFT JOIN categories c ON i.categoryId = c.id
    WHERE i.quantity <= i.minStockLevel AND i.minStockLevel > 0
    ORDER BY diffQtyNeeded DESC, i.name ASC
  `);
   return items.map(item => ({
    ...item,
    diffQtyNeeded: Number(item.diffQtyNeeded) || 0,
  }));
}

export async function getRequisitionSummaryReport(filters: ReportFilter): Promise<RequisitionSummaryItem[]> {
  const db = await openDb();
  let query = `
    SELECT 
      r.id, r.dateCreated, r.dateNeeded, d.name as departmentName, 
      u.name as requesterName, r.status, r.notes,
      (SELECT COUNT(*) FROM requisition_items ri WHERE ri.requisitionId = r.id) as itemCount
    FROM requisitions r
    LEFT JOIN departments d ON r.departmentId = d.id
    LEFT JOIN users u ON r.requesterId = u.id
  `;
  const queryParams: any[] = [];
  const conditions: string[] = [];

  if (filters.dateRange?.from && filters.dateRange?.to) {
    conditions.push(`r.dateCreated BETWEEN ? AND ?`);
    queryParams.push(formatISO(startOfDay(filters.dateRange.from)));
    queryParams.push(formatISO(endOfDay(filters.dateRange.to)));
  }
  if (filters.status) {
    conditions.push(`r.status = ?`);
    queryParams.push(filters.status);
  }
  if (filters.departmentId) {
    conditions.push(`r.departmentId = ?`);
    queryParams.push(filters.departmentId);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY r.dateCreated DESC`;

  const requisitions = await db.all<any[]>(query, ...queryParams);
  return requisitions.map(req => ({
    ...req,
    itemCount: Number(req.itemCount) || 0,
  }));
}

export async function getPurchaseOrderSummaryReport(filters: ReportFilter): Promise<PurchaseOrderSummaryItem[]> {
  const db = await openDb();
  let query = `
    SELECT 
      po.id, po.orderDate, po.expectedDeliveryDate, s.name as supplierName, 
      po.status, po.notes,
      (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) as itemCount,
      (SELECT SUM(COALESCE(poi.quantityApproved, poi.quantityOrdered) * poi.unitCost) FROM purchase_order_items poi WHERE poi.purchaseOrderId = po.id) as totalAmount
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplierId = s.id
  `;
  const queryParams: any[] = [];
  const conditions: string[] = [];

  if (filters.dateRange?.from && filters.dateRange?.to) {
    conditions.push(`po.orderDate BETWEEN ? AND ?`);
    queryParams.push(formatISO(startOfDay(filters.dateRange.from)));
    queryParams.push(formatISO(endOfDay(filters.dateRange.to)));
  }
  if (filters.status) {
    conditions.push(`po.status = ?`);
    queryParams.push(filters.status);
  }
   if (filters.supplierId) {
    conditions.push(`po.supplierId = ?`);
    queryParams.push(filters.supplierId);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY po.orderDate DESC`;
  
  const purchaseOrders = await db.all<any[]>(query, ...queryParams);
  return purchaseOrders.map(po => ({
    ...po,
    itemCount: Number(po.itemCount) || 0,
    totalAmount: parseFloat(po.totalAmount) || 0,
  }));
}

// Placeholder for PDF generation action - to be implemented in Phase 2
// export async function generateReportPdfAction(reportType: ReportTypeKey, data: any[], filters: ReportFilter): Promise<string> {
//   // Logic to generate PDF using pdf-lib based on reportType and data
//   // Similar to generateStockMovementPdfAction but generalized
//   throw new Error("PDF generation for this report is not yet implemented.");
// }
