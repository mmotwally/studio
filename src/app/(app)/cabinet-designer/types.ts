

export type CabinetPartType =
  | 'Side Panel'
  | 'Bottom Panel'
  | 'Top Panel' // Could be full top or top rails
  | 'Back Panel'
  | 'Double Back Panel'
  | 'Door' // Single or one of a pair
  | 'Doors' // Represents a pair, often calculated together
  | 'Drawer Front'
  | 'Drawer Back'
  | 'Drawer Side'
  | 'Drawer Counter Front' // For inset drawers
  | 'Drawer Bottom'
  | 'Mobile Shelf' // Adjustable shelf
  | 'Fixed Shelf' // Fixed shelf
  | 'Upright' // Vertical divider
  | 'Front Panel' // e.g., fixed panel on a sink base
  | 'Top Rail (Front)'
  | 'Top Rail (Back)'
  | 'Bottom Rail (Front)'
  | 'Bottom Rail (Back)'
  | 'Stretcher'
  | 'Toe Kick';

export type CabinetTypeContext = 'Base' | 'Wall' | 'Drawer' | 'General';
export type FormulaDimensionType = 'Width' | 'Height' | 'Quantity' | 'Thickness';


export interface CabinetPart {
  name: string; // This will be the nameLabel from PartDefinition
  partType: CabinetPartType;
  quantity: number;
  width: number; // mm
  height: number; // or length for rails
  thickness: number; // mm
  material: string; // e.g., "18mm MDF", "3mm HDF" (derived from materialId + template params)
  grainDirection?: 'with' | 'reverse' | 'none' | null;
  notes?: string;
  edgeBanding?: { // Calculated lengths of edge banding applied
    front?: number;
    back?: number;
    top?: number; 
    bottom?: number; 
  };
}

export interface AccessoryItem {
  id: string; // From a predefined accessory list/database
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


// --- Structures for Database-Driven Cabinet Templates ---

// For user-defined material types via UI
export interface MaterialDefinitionDB {
  id: string;
  name: string;
  type: "panel" | "edge_band" | "other"; // e.g. panel, edge_band
  costPerSqm?: number | null;
  costPerMeter?: number | null; // for edge banding
  thickness?: number | null; // mm, for panels
  defaultSheetWidth?: number | null;
  defaultSheetHeight?: number | null;
  hasGrain: boolean; // 0 or 1 in DB, boolean here
  notes?: string | null;
  createdAt: string;
  lastUpdated: string;
}

// For hardcoded PREDEFINED_MATERIALS in types.ts (simple version)
export interface PredefinedMaterialSimple {
  id: string;
  name: string;
  hasGrain?: boolean;
  // If you want to hardcode costs for these too, add them here
  costPerSqm?: number; 
  thickness?: number;
}


export const PREDEFINED_MATERIALS: PredefinedMaterialSimple[] = [
    { id: "STD_PANEL_18MM", name: "Standard Panel 18mm", costPerSqm: 25.0, thickness: 18 },
    { id: "STD_BACK_PANEL_3MM", name: "Standard Back Panel 3mm", costPerSqm: 10.0, thickness: 3 },
    { id: "DOOR_GRADE_PANEL_18MM", name: "Door Grade Panel 18mm", costPerSqm: 30.0, thickness: 18, hasGrain: true },
    { id: "SHELF_PANEL_18MM", name: "Shelf Panel 18mm", costPerSqm: 22.0, thickness: 18 },
    { id: "OAK_VENEER_18MM", name: "Oak Veneer Panel 18mm", hasGrain: true, costPerSqm: 45.0, thickness: 18 },
];

// For user-defined accessory types via UI
export interface AccessoryDefinitionDB {
  id: string;
  name: string;
  type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw" | "other";
  unitCost: number;
  description?: string | null;
  supplierId?: string | null; // Optional: link to a supplier
  sku?: string | null; // Optional: supplier SKU
  createdAt: string;
  lastUpdated: string;
}

// For hardcoded PREDEFINED_ACCESSORIES in types.ts
export interface PredefinedAccessory {
  id: string; 
  name: string;
  type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw" | "other";
  unitCost: number;
  description?: string;
}

export const PREDEFINED_ACCESSORIES: PredefinedAccessory[] = [
  { id: "HINGE_STD_FO", name: "Hinge, Standard Full Overlay", type: "hinge", unitCost: 1.5, description: "Standard cabinet hinge for full overlay doors." },
  { id: "HANDLE_STD_PULL", name: "Handle, Standard Pull (128mm)", type: "handle", unitCost: 3.0, description: "Common metal pull handle, 128mm hole spacing." },
  { id: "SHELF_PIN_STD", name: "Shelf Pin, Standard 5mm", type: "shelf_pin", unitCost: 0.1, description: "Standard 5mm metal shelf support pin." },
  { id: "DRAWER_SLIDE_BLUM_STD", name: "Drawer Slide, Blum Standard (500mm)", type: "drawer_slide", unitCost: 12.0, description: "Blum standard full extension drawer slide, 500mm." },
  { id: "LEG_ADJUSTABLE_PLASTIC", name: "Leg, Adjustable Plastic (100-150mm)", type: "leg", unitCost: 1.2, description: "Adjustable plastic cabinet leg." },
  { id: "SCREW_CONFIRMAT_7X50", name: "Screw, Confirmat 7x50mm", type: "screw", unitCost: 0.05, description: "Confirmat screw for strong cabinet joinery." },
];


export interface EdgeBandingAssignment { 
  front?: boolean; 
  back?: boolean;
  top?: boolean;   
  bottom?: boolean; 
}

export interface PartDefinition {
  partId: string; 
  nameLabel: string; 
  partType: CabinetPartType; 
  cabinetContext?: CabinetTypeContext; 
  quantityFormula: string; 
  widthFormula: string; 
  widthFormulaKey?: string; 
  heightFormula: string; 
  heightFormulaKey?: string; 
  materialId: string; // Can refer to PredefinedMaterialSimple.id or MaterialDefinitionDB.id
  thicknessFormula?: string; 
  thicknessFormulaKey?: string; 
  quantityFormulaKey?: string; 
  edgeBanding?: EdgeBandingAssignment;
  grainDirection?: 'with' | 'reverse' | 'none' | null; 
  notes?: string;
}

export interface TemplateAccessoryEntry {
  id: string; 
  accessoryId: string; // Can refer to PredefinedAccessory.id or AccessoryDefinitionDB.id
  quantityFormula: string;
  notes?: string;
}


export interface CabinetTemplateData {
  id: string; 
  name: string; 
  type: "base" | "wall" | "tall" | "custom"; 
  previewImage?: string;
  defaultDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  parameters: { 
    PT: number; 
    BPT?: number; 
    BPO?: number; 
    DG?: number; 
    DCG?: number; 
    TRD?: number; 
    DW?: number; 
    DD?: number; 
    DH?: number; 
    Clearance?: number; 
  };
  parts: PartDefinition[];
  accessories?: TemplateAccessoryEntry[];
  createdAt?: string; 
  lastUpdated?: string; 
}


export interface PredefinedFormula {
  key: string; 
  name: string; 
  description: string;
  example?: string;
  partType: CabinetPartType | CabinetPartType[] | []; 
  context: CabinetTypeContext[] | null; 
  dimension: FormulaDimensionType; 
  formula: string; 
}

export interface CustomFormulaEntry {
  id: string; 
  name: string; 
  formulaString: string; 
  dimensionType: FormulaDimensionType;
  description?: string | null;
  createdAt: string;
}

export type CombinedFormulaItem = Omit<PredefinedFormula, 'key'> & {
  id: string; 
  isCustom: boolean; 
};


// --- Drawer Set Calculator Types ---
export interface DrawerPartCalculation {
  name: string;         
  quantity: number;
  width: number;
  height: number;       
  thickness: number;    
  notes?: string;
}

export interface CalculatedDrawer {
  drawerNumber: number;
  overallFrontHeight: number; 
  boxHeight: number;          
  parts: DrawerPartCalculation[];
}

export interface DrawerSetCalculatorInput {
  cabinetInternalHeight: number;
  cabinetWidth: number;
  numDrawers: number;
  drawerReveal: number;        
  panelThickness: number;      
  drawerSlideClearanceTotal: number; 
  drawerBoxSideDepth: number;  
  drawerBoxSideHeight: number; 
  customDrawerFrontHeights?: number[]; 
}

export interface DrawerSetCalculatorResult {
  success: boolean;
  message?: string;
  calculatedDrawers: CalculatedDrawer[];
  totalFrontsHeightWithReveals?: number; 
  cabinetInternalHeight?: number; 
}

// UI Select Item Type
export interface SelectItem {
  value: string;
  label: string;
  disabled?: boolean;
  [key: string]: any; // For additional properties like cost, thickness, etc.
}

// Types for Special Feature / Nesting
export interface InputPart {
  name: string;
  width: number;
  height: number;
  qty: number;
  material?: string; 
  grainDirection?: 'with' | 'reverse' | 'none' | null;
  originalName?: string; 
  originalWidth?: number; 
  originalHeight?: number; 
}

export interface PackedPart extends InputPart { 
  x?: number;
  y?: number;
  isRotated?: boolean; 
}

export interface SheetLayout {
  id: number;
  dimensions: { w: number; h: number }; 
  parts: PackedPart[]; 
  packedAreaWidth?: number; 
  packedAreaHeight?: number; 
  efficiency?: number; 
  material?: string; 
}

// For potpack (client-side)
export interface PotpackBox {
  w: number; 
  h: number; 
  x?: number; 
  y?: number; 
  name?: string; 
  originalName?: string; 
  originalWidth?: number; 
  originalHeight?: number; 
  material?: string;
  grainDirection?: 'with' | 'reverse' | 'none' | null;
  [key: string]: any; 
}
export interface PotpackStats {
  w: number; 
  h: number; 
  fill: number; 
  [key: string]: any;
}

export interface NestingJob {
  id: string; 
  name: string; 
  timestamp: string; 
  parts: InputPart[]; 
}

export interface SheetDimensionOption {
  label: string;
  width: number;
  height: number;
}
