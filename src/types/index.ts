
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
}

export interface SubCategoryDB {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string; // Optional: For display if joined
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
  subCategoryId?: string;
  subCategoryName?: string; // For display
  locationId?: string;
  locationName?: string; // For display (e.g. Store - Rack - Shelf)
  supplierId?: string;
  supplierName?: string; // For display
  unitId?: string;
  unitName?: string; // For display (e.g. "Pieces" or "pcs")
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

