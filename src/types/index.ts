
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
  value: string; // Values will be formatted strings
  icon: LucideIcon;
  description?: string;
  color?: string; 
}

export interface DashboardData {
  totalInventoryItems: number;
  lowStockItems: number;
  pendingRequisitions: number;
  openPurchaseOrders: number;
  monthlyExpenditure: number;
  totalInventoryValue: number;
  error?: string; // Optional error message
}


export interface Department {
  id: string;
  name: string;
  code: string;
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
  lastPurchasePrice?: number;
  averageCost?: number;
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
  requesterId?: string | null; 
  requesterName?: string; 
  departmentId?: string | null;
  departmentName?: string; 
  orderNumber?: string | null;
  bomNumber?: string | null;
  dateCreated: string;
  dateNeeded?: string | null;
  status: RequisitionStatus;
  notes?: string | null;
  lastUpdated: string;
  items?: RequisitionItem[]; 
  totalItems?: number; 
}

export interface RequisitionItem {
  id: string; 
  requisitionId: string;
  inventoryItemId: string;
  inventoryItemName?: string; 
  inventoryItemCurrentStock?: number; 
  quantityRequested: number;
  quantityApproved?: number | null; 
  quantityIssued: number; 
  isApproved?: boolean; 
  notes?: string | null;
}

export interface RequisitionFormValues {
  departmentId: string;
  orderNumber?: string | null;
  bomNumber?: string | null;
  dateNeeded?: Date | null;
  notes?: string | null;
  items: Array<{
    inventoryItemId: string;
    quantityRequested: number;
    notes?: string | null;
  }>;
}

export interface FulfillRequisitionItemFormValues {
  requisitionItemId: string;
  inventoryItemId: string;
  itemName: string; 
  quantityRequested: number; 
  quantityApproved: number; 
  currentQuantityIssued: number; 
  inventoryItemCurrentStock: number; 
  quantityToIssueNow: number; 
}

export interface FulfillRequisitionFormValues {
  requisitionId: string;
  items: FulfillRequisitionItemFormValues[];
}

export interface DepartmentFormValues {
  name: string;
  code: string;
}

export interface ApproveRequisitionItemFormValues {
  requisitionItemId: string;
  inventoryItemId: string;
  itemName: string;
  quantityRequested: number;
  quantityToApprove: number; 
}

export interface ApproveRequisitionFormValues {
  requisitionId: string;
  items: ApproveRequisitionItemFormValues[];
}

// Purchase Order Module Types
export type PurchaseOrderStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName?: string; // For display
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: PurchaseOrderStatus;
  notes?: string | null;
  shippingAddress?: string | null;
  billingAddress?: string | null;
  totalAmount?: number; // Calculated from items
  lastUpdated: string;
  createdById?: string | null;
  createdByName?: string; // For display
  items?: PurchaseOrderItem[];
  itemCount?: number; // For list display
}

export interface PurchaseOrderItem {
  id: string; // This is the purchase_order_item_id
  purchaseOrderId: string;
  inventoryItemId: string;
  inventoryItemName?: string; // For display
  inventoryItemCurrentStock?: number; // For display/validation during receiving
  inventoryItemLastPurchasePrice?: number | null; // Added for PO form
  averageCost?: number | null; // Added for PO form (current average cost)
  description?: string | null; // Can be custom or from inventory item
  quantityOrdered: number;
  unitCost: number;
  quantityApproved?: number | null; // Quantity approved by manager
  totalCost?: number; // Calculated: quantityOrdered * unitCost
  quantityReceived: number; // Total quantity received so far for this item
  notes?: string | null;
}

export interface PurchaseOrderItemFormValues {
  inventoryItemId: string;
  description?: string | null;
  quantityOrdered: number;
  unitCost: number;
}

export interface PurchaseOrderFormValues {
  supplierId: string;
  orderDate: Date;
  expectedDeliveryDate?: Date | null;
  notes?: string | null;
  shippingAddress?: string | null;
  billingAddress?: string | null;
  items: PurchaseOrderItemFormValues[];
}

// For Approving PO Items
export interface ApprovePOItemFormValues {
  poItemId: string; // Corresponds to PurchaseOrderItem.id
  inventoryItemId: string;
  itemName: string;
  quantityOrdered: number;
  quantityApproved: number;
}

export interface ApprovePOFormValues {
  purchaseOrderId: string;
  items: ApprovePOItemFormValues[];
}

// For Receiving PO Items
export interface ReceivePOItemFormValues {
  poItemId: string; 
  inventoryItemId: string;
  itemName: string;
  quantityOrdered: number;
  quantityApproved: number | null; 
  quantityAlreadyReceived: number; 
  quantityToReceiveNow: number; 
  inventoryItemCurrentStock?: number; 
  unitCostAtReceipt: number;
}

export interface ReceivePOFormValues {
  purchaseOrderId: string;
  items: ReceivePOItemFormValues[];
}

// Stock Movement Types
export type StockMovementType = 
  | 'INITIAL_STOCK'
  | 'PO_RECEIPT'
  | 'REQUISITION_ISSUE'
  | 'REQUISITION_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RETURN_TO_SUPPLIER'; // Example for future use
  

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string; // For display
  movementType: StockMovementType;
  quantityChanged: number; // Positive for IN, Negative for OUT
  balanceAfterMovement: number;
  referenceId?: string | null; // e.g., PO ID, Requisition ID
  movementDate: string;
  userId?: string | null;
  userName?: string; // For display
  notes?: string | null;
}

export interface StockMovementReport {
  inventoryItemId: string;
  inventoryItemName: string;
  periodFrom: string;
  periodTo: string;
  openingStock: number;
  totalIn: number;
  totalOut: number;
  closingStock: number;
  movements: StockMovement[];
}
