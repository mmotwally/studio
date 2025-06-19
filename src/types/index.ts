
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

export type ActivityType = 
  | 'INVENTORY_NEW' 
  | 'REQUISITION_NEW' 
  | 'REQUISITION_STATUS_CHANGE'
  | 'PO_NEW'
  | 'PO_STATUS_CHANGE'
  | 'STOCK_MOVEMENT_PO_RECEIPT'
  | 'STOCK_MOVEMENT_REQ_ISSUE'
  | 'STOCK_MOVEMENT_REQ_RETURN'
  | 'STOCK_MOVEMENT_ADJUSTMENT'
  | 'STOCK_MOVEMENT_INITIAL';

export interface ActivityLogEntry {
  id: string; 
  timestamp: string; 
  type: ActivityType;
  description: string;
  referenceId?: string; 
  linkHref?: string;
  user?: string; 
  details?: Record<string, any>; 
}

export interface DashboardData {
  totalInventoryItems: number;
  lowStockItems: number;
  pendingRequisitions: number;
  openPurchaseOrders: number;
  monthlyExpenditure: number;
  totalInventoryValue: number;
  recentActivities?: ActivityLogEntry[];
  error?: string; 
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
  categoryName?: string; 
  code: string;
}

export interface LocationDB {
  id: string;
  store: string;
  rack?: string | null;
  shelf?: string | null;
  fullName?: string; 
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
  baseUnitName?: string | null; 
  conversionFactor: number;
}

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
  totalValue: number; 
  lastUpdated: string;
  lowStock?: boolean;
  minStockLevel?: number;
  maxStockLevel?: number;
  categoryId?: string;
  categoryName?: string; 
  categoryCode?: string; 
  subCategoryId?: string;
  subCategoryName?: string; 
  subCategoryCode?: string; 
  locationId?: string;
  locationName?: string; 
  supplierId?: string;
  supplierName?: string; 
  unitId?: string;
  unitName?: string; 
}

export interface InventoryItemFormValues {
  name: string;
  description?: string | null;
  imageUrl?: string | null; 
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
  removeImage?: boolean; 
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

// Enhanced ReportFilter
export interface ReportFilter {
  dateRange?: { from?: Date; to?: Date };
  reportType?: ReportTypeKey; // Use a specific key type
  status?: string; // For filtering by status (e.g., RequisitionStatus, PurchaseOrderStatus)
  categoryId?: string;
  supplierId?: string;
  departmentId?: string;
}

export interface SelectItem {
  value: string;
  label: string;
  // Allow for additional properties like lastPurchasePrice etc.
  lastPurchasePrice?: number | null;
  unitCost?: number | null;
  quantity?: number;
  unitName?: string | null;
}


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
  supplierName?: string; 
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: PurchaseOrderStatus;
  notes?: string | null;
  shippingAddress?: string | null;
  billingAddress?: string | null;
  totalAmount?: number; 
  lastUpdated: string;
  createdById?: string | null;
  createdByName?: string; 
  items?: PurchaseOrderItem[];
  itemCount?: number; 
}

export interface PurchaseOrderItem {
  id: string; 
  purchaseOrderId: string;
  inventoryItemId: string;
  inventoryItemName?: string; 
  inventoryItemCurrentStock?: number; 
  inventoryItemLastPurchasePrice?: number | null; 
  averageCost?: number | null; 
  description?: string | null; 
  quantityOrdered: number;
  unitCost: number;
  quantityApproved?: number | null; 
  totalCost?: number; 
  quantityReceived: number; 
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

export interface ApprovePOItemFormValues {
  poItemId: string; 
  inventoryItemId: string;
  itemName: string;
  quantityOrdered: number;
  quantityApproved: number;
}

export interface ApprovePOFormValues {
  purchaseOrderId: string;
  items: ApprovePOItemFormValues[];
}

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
  | 'RETURN_TO_SUPPLIER'; 
  

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string; 
  movementType: StockMovementType;
  quantityChanged: number; 
  balanceAfterMovement: number;
  referenceId?: string | null; 
  movementDate: string;
  userId?: string | null;
  userName?: string; 
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

// Report Specific Types
export type ReportTypeKey = 
  | 'inventory_stock_list' 
  | 'low_stock_items' 
  | 'requisition_summary' 
  | 'purchase_order_summary';

export interface ReportDefinition {
  value: ReportTypeKey;
  label: string;
  description: string;
  columns: Array<{ key: string; header: string; type?: 'currency' | 'date' | 'datetime' | 'badge' | 'number' }>;
}

export interface InventoryStockListItem {
  id: string;
  name: string;
  categoryName?: string;
  subCategoryName?: string;
  quantity: number;
  unitName?: string;
  unitCost: number;
  averageCost?: number;
  totalValue: number;
  locationName?: string;
  supplierName?: string;
  minStockLevel?: number;
  lowStock: boolean; // Calculated or directly from DB
}

export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minStockLevel: number;
  unitName?: string;
  supplierName?: string;
  categoryName?: string;
  diffQtyNeeded: number; // Calculated: minStockLevel - quantity
}

export interface RequisitionSummaryItem {
  id: string;
  dateCreated: string;
  dateNeeded?: string | null;
  departmentName?: string;
  requesterName?: string; // To be added if user association exists
  status: RequisitionStatus;
  itemCount: number;
  notes?: string | null;
}

export interface PurchaseOrderSummaryItem {
  id: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  supplierName?: string;
  status: PurchaseOrderStatus;
  itemCount: number;
  totalAmount: number;
  notes?: string | null;
}

export type GeneratedReportData = 
  | InventoryStockListItem[] 
  | LowStockItem[] 
  | RequisitionSummaryItem[] 
  | PurchaseOrderSummaryItem[]
  | null;

// Types for Cabinet Designer
export type CabinetPartType =
  | 'Side Panel' | 'Bottom Panel' | 'Top Panel' | 'Back Panel' | 'Double Back Panel'
  | 'Door' | 'Doors' | 'Drawer Front' | 'Drawer Back' | 'Drawer Side' | 'Drawer Counter Front'
  | 'Drawer Bottom' | 'Mobile Shelf' | 'Fixed Shelf' | 'Upright' | 'Front Panel'
  | 'Top Rail (Front)' | 'Top Rail (Back)' | 'Bottom Rail (Front)' | 'Bottom Rail (Back)'
  | 'Stretcher' | 'Toe Kick';

export type CabinetTypeContext = 'Base' | 'Wall' | 'Drawer' | 'General';
export type FormulaDimensionType = 'Width' | 'Height' | 'Quantity' | 'Thickness';

export interface CabinetPart {
  name: string;
  partType: CabinetPartType;
  quantity: number;
  width: number;
  height: number;
  thickness: number;
  material: string;
  grainDirection?: 'with' | 'reverse' | 'none' | null;
  notes?: string;
  edgeBanding?: { front?: number; back?: number; top?: number; bottom?: number; };
}

export interface AccessoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface CalculatedCabinet {
  parts: CabinetPart[];
  accessories: AccessoryItem[];
  estimatedMaterialCost: number;
  estimatedAccessoryCost: number;
  estimatedTotalCost: number;
  totalPanelAreaMM: number;
  totalBackPanelAreaMM: number;
}

export interface CabinetCalculationInput {
  cabinetType: string;
  width: number;
  height: number;
  depth: number;
  customTemplate?: CabinetTemplateData;
}

export interface MaterialDefinitionDB {
  id: string; name: string; type: "panel" | "edge_band" | "other";
  costPerSqm?: number | null; costPerMeter?: number | null; thickness?: number | null;
  defaultSheetWidth?: number | null; defaultSheetHeight?: number | null;
  hasGrain: boolean; notes?: string | null; createdAt: string; lastUpdated: string;
}
export interface PredefinedMaterialSimple { id: string; name: string; hasGrain?: boolean; costPerSqm?: number; thickness?: number; }

export interface AccessoryDefinitionDB {
  id: string; name: string; type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw" | "other";
  unitCost: number; description?: string | null; supplierId?: string | null; sku?: string | null;
  createdAt: string; lastUpdated: string;
}
export interface PredefinedAccessory { id: string; name: string; type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw" | "other"; unitCost: number; description?: string;}

export interface EdgeBandingAssignment { front?: boolean; back?: boolean; top?: boolean; bottom?: boolean; }

export interface PartDefinition {
  partId: string; nameLabel: string; partType: CabinetPartType; cabinetContext?: CabinetTypeContext;
  quantityFormula: string; quantityFormulaKey?: string;
  widthFormula: string; widthFormulaKey?: string;
  heightFormula: string; heightFormulaKey?: string;
  materialId: string;
  thicknessFormula?: string; thicknessFormulaKey?: string;
  edgeBanding?: EdgeBandingAssignment;
  grainDirection?: 'with' | 'reverse' | 'none' | null; notes?: string;
}

export interface TemplateAccessoryEntry {
  id: string; accessoryId: string; quantityFormula: string; notes?: string;
}

export interface CabinetTemplateData {
  id: string; name: string; type: "base" | "wall" | "tall" | "custom"; previewImage?: string;
  defaultDimensions: { width: number; height: number; depth: number; };
  parameters: { PT: number; BPT?: number; BPO?: number; DG?: number; DCG?: number; TRD?: number; B?: number; DW?: number; DD?: number; DH?: number; Clearance?: number; };
  parts: PartDefinition[]; accessories?: TemplateAccessoryEntry[]; createdAt?: string; lastUpdated?: string;
}

export interface PredefinedFormula {
  key: string; name: string; description: string; example?: string;
  partType: CabinetPartType | CabinetPartType[] | []; context: CabinetTypeContext[] | null;
  dimension: FormulaDimensionType; formula: string;
}
export interface CustomFormulaEntry {
  id: string; name: string; formulaString: string; dimensionType: FormulaDimensionType;
  description?: string | null; createdAt: string;
}
export type CombinedFormulaItem = Omit<PredefinedFormula, 'key'> & { id: string; isCustom: boolean; };

export interface DrawerPartCalculation { name: string; quantity: number; width: number; height: number; thickness: number; notes?: string; }
export interface CalculatedDrawer { drawerNumber: number; overallFrontHeight: number; boxHeight: number; parts: DrawerPartCalculation[]; }
export interface DrawerSetCalculatorInput {
  cabinetInternalHeight: number; cabinetWidth: number; numDrawers: number; drawerReveal: number;
  panelThickness: number; drawerSlideClearanceTotal: number; drawerBoxSideDepth: number;
  drawerBoxSideHeight: number; customDrawerFrontHeights?: number[];
}
export interface DrawerSetCalculatorResult {
  success: boolean; message?: string; calculatedDrawers: CalculatedDrawer[];
  totalFrontsHeightWithReveals?: number; cabinetInternalHeight?: number;
}
// End Cabinet Designer Types

// Types for Special Feature / Nesting
export interface InputPart {
  name: string;
  width: number;
  height: number;
  qty: number;
  material?: string; // Optional, for context
}

export interface PackedPart extends InputPart {
  x?: number;
  y?: number;
  // Potpack might add 'bin' if multiple bins were supported directly, but we handle multi-sheet manually
}

export interface SheetLayout {
  id: number;
  dimensions: { w: number; h: number }; // Sheet dimensions
  parts: PackedPart[]; // Parts packed onto this sheet
  packedAreaWidth?: number; // Actual width used by packed parts
  packedAreaHeight?: number; // Actual height used by packed parts
  efficiency?: number; // Percentage of sheet area used by parts
}

// Type for devtools/potpack
export interface PotpackBox {
  w: number;
  h: number;
  x?: number;
  y?: number;
  name?: string; // Custom property for tracking
  original?: InputPart; // Link back to the original part definition
  [key: string]: any; // Allow other properties
}
export interface PotpackStats {
  w: number; // width of overall bounding box
  h: number; // height of overall bounding box
  fill: number; // percentage of space filled
  [key: string]: any;
}

