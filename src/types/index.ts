
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
}

export interface LocationDB {
  id: string;
  store: string;
  rack?: string;
  shelf?: string;
}

export interface SupplierDB {
  id: string;
  name: string;
  contactPerson?: string;
  contactMail?: string;
  address?: string;
}

export interface UnitOfMeasurementDB {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalValue: number; // Calculated: quantity * unitCost
  lastUpdated: string;
  lowStock?: boolean;
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
