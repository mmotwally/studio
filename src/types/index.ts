

import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
}

export interface DashboardStat {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  color?: string; // Optional color for icon/text
}

export interface CategoryDB {
  id: string;
  name: string;
  code: string;
}

export interface SubCategoryDB {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string; // Optional: For display if joined
  code: string;
}

export interface LocationDB {
  id: string;
  store: string;
  rack?: string | null;
  shelf?: string | null;
  fullName?: string; // For display (e.g. Store - Rack - Shelf)
}

export interface SupplierDB {
  id: string;
  name: string;
  contactPerson?: string | null;
  contactMail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
}

export interface UnitOfMeasurementDB {
  id: string;
  name: string;
  abbreviation?: string | null;
  baseUnitId?: string | null;
  baseUnitName?: string | null; // For display
  conversionFactor: number;
}

// This type is used for the Excel export mapping
export interface InventoryItemExport {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitCost: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  categoryCode?: string;
  subCategoryCode?: string;
  locationStore?: string;
  locationRack?: string | null;
  locationShelf?: string | null;
  supplierName?: string;
  unitName?: string;
}


export interface InventoryItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitCost: number;
  totalValue: number; // Calculated: quantity * unitCost
  lastUpdated: string;
  lowStock?: boolean;
  minStockLevel?: number;
  maxStockLevel?: number;
  categoryId?: string;
  categoryName?: string; // For display, from join
  categoryCode?: string; // For ID generation logic
  subCategoryId?: string;
  subCategoryName?: string; // For display
  subCategoryCode?: string; // For ID generation logic
  locationId?: string;
  locationName?: string; // For display (e.g. Store - Rack - Shelf)
  supplierId?: string;
  supplierName?: string; // For display
  unitId?: string;
  unitName?: string; // For display (e.g. "Pieces" or "pcs")
}

export interface InventoryItemFormValues {
  name: string;
  description?: string | null;
  imageUrl?: string | null; // This might not be directly in form values if using file input
  quantity: number;
  unitCost: number;
  lowStock?: boolean;
  minStockLevel?: number;
  maxStockLevel?: number;
  categoryId: string;
  subCategoryId?: string | null;
  locationId?: string | null;
  supplierId?: string | null;
  unitId: string;
  removeImage?: boolean; // For edit form: to signal image removal
}


export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
}

export interface ReportFilter {
  dateRange?: { from?: Date; to?: Date };
  reportType?: string;
}

export type SelectItem = {
  value: string;
  label: string;
};


// Requisition Module Types
export type RequisitionStatus = 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'FULFILLED' 
  | 'PARTIALLY_FULFILLED' 
  | 'CANCELLED';

export interface Requisition {
  id: string;
  requesterId?: string | null; // Link to User later
  requesterName?: string; // For display
  department?: string | null;
  dateCreated: string;
  dateNeeded?: string | null;
  status: RequisitionStatus;
  notes?: string | null;
  lastUpdated: string;
  items?: RequisitionItem[]; // Populated when viewing details
  totalItems?: number; // For list view summary
}

export interface RequisitionItem {
  id: string;
  requisitionId: string;
  inventoryItemId: string;
  inventoryItemName?: string; // For display
  inventoryItemCurrentStock?: number; // For display on detail view
  quantityRequested: number;
  quantityIssued?: number;
  notes?: string | null;
}

export interface RequisitionFormValues {
  dateNeeded?: Date | null;
  notes?: string | null;
  items: Array<{
    inventoryItemId: string;
    quantityRequested: number;
    notes?: string | null;
  }>;
}
