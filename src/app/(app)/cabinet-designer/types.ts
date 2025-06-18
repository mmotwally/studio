

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

export interface MaterialDefinition {
  id: string; 
  name: string; 
  type: "panel" | "edge_band" | "other";
  costPerSqm?: number; 
  costPerMeter?: number; 
  thickness?: number; // mm, for panels
  defaultSheetWidth?: number; 
  defaultSheetHeight?: number; 
  hasGrain?: boolean; 
}

export interface AccessoryDefinition {
  id: string; 
  name: string;
  type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw";
  unitCost: number;
}

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
  cabinetContext?: CabinetTypeContext; // Context like Base, Wall, Drawer
  quantityFormula: string; 
  widthFormula: string; 
  widthFormulaKey?: string; // Key if selected from predefined or ID of custom formula
  heightFormula: string; 
  heightFormulaKey?: string; // Key if selected from predefined or ID of custom formula
  materialId: string; 
  thicknessFormula?: string; 
  thicknessFormulaKey?: string; // Key if selected from predefined or ID of custom formula
  quantityFormulaKey?: string; // Key if selected from predefined or ID of custom formula
  edgeBanding?: EdgeBandingAssignment;
  grainDirection?: 'with' | 'reverse' | 'none' | null; 
  notes?: string;
}

export interface CabinetTemplateData {
  id: string; 
  name: string; 
  type: "base" | "wall" | "tall" | "custom"; // Main type of cabinet template
  previewImage?: string;
  defaultDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  parameters: { 
    PT: number; // PanelThickness
    BPT?: number; // BackPanelThickness
    BPO?: number; // BackPanelOffset / Back Panel Gap (from user as B)
    DG?: number; // DoorGap (overall)
    DCG?: number; // DoorCenterGap (between two doors)
    TRD?: number; // TopRailDepth
    B?: number; // Back Panel Gap (user added)
    
    // Drawer Specific Parameters (can be part of a drawer sub-assembly type later)
    DW?: number; // Drawer Width (overall, often opening width)
    DD?: number; // Drawer Depth (overall, often slide length or side panel depth)
    DH?: number; // Drawer Height (often side panel height)
    Clearance?: number; // Drawer slide clearance (total)
    // TKH?: number; // Toe Kick Height (if applicable to the main cabinet type)
  };
  parts: PartDefinition[];
  accessories?: Array<{
    accessoryId: string; 
    quantityFormula: string; 
  }>;
}

// Example of predefined materials (would come from DB)
export const PREDEFINED_MATERIALS: Array<{id: string; name: string; hasGrain?: boolean}> = [
    { id: "Material1", name: "Material 1" },
    { id: "Material2", name: "Material 2" },
    { id: "Material3", name: "Material 3" },
    { id: "MaterialGrain1", name: "Material Grain 1", hasGrain: true },
    { id: "MaterialGrain2", name: "Material Grain 2", hasGrain: true },
    { id: "MaterialGrain3", name: "Material Grain 3", hasGrain: true },
];


export interface PredefinedFormula {
  key: string; // A unique key for predefined formulas (e.g., 'SIDE_BASE_STD_H')
  name: string; // User-friendly name for the dropdown
  description: string;
  example?: string;
  partType: CabinetPartType | CabinetPartType[] | []; 
  context: CabinetTypeContext[] | null; 
  dimension: FormulaDimensionType; 
  formula: string; // The actual formula string
}

export interface CustomFormulaEntry {
  id: string; // UUID from database
  name: string; // User-defined name
  formulaString: string; // The actual formula string
  dimensionType: FormulaDimensionType;
  description?: string;
  createdAt: string;
  // Optional: part_types and cabinet_contexts could be added here if needed for filtering
  // For UI consistency with PredefinedFormula, we might add a 'key' field equal to 'id'
  // and a 'formula' field equal to 'formulaString' when merging lists.
}

export type CombinedFormulaItem = Omit<PredefinedFormula, 'key'> & {
  id: string; // For Predefined, this could be the 'key'. For Custom, it's the DB 'id'.
  isCustom: boolean; // Flag to distinguish
};


// --- Drawer Set Calculator Types ---
export interface DrawerPartCalculation {
  name: string;         // "Side Panel", "Back Panel", "Bottom Panel", "Drawer Front"
  quantity: number;
  width: number;
  height: number;       // For side panels, this is the 'depth' of the drawer box. For other panels, it's height.
  thickness: number;    // Typically 'T'
  notes?: string;
}

export interface CalculatedDrawer {
  drawerNumber: number;
  overallFrontHeight: number; // The height of the decorative drawer front
  boxHeight: number;          // The height of the drawer box itself (sides, back) - This is drawerBoxSideHeight from input
  parts: DrawerPartCalculation[];
}

export interface DrawerSetCalculatorInput {
  cabinetInternalHeight: number;
  cabinetWidth: number;
  numDrawers: number;
  drawerReveal: number;        // Gap between drawer fronts
  panelThickness: number;      // T
  drawerSlideClearanceTotal: number; // Total clearance for slides (e.g., 13mm for 6.5mm per side)
  drawerBoxSideDepth: number;  // User-defined depth of the drawer box sides
  drawerBoxSideHeight: number; // User-defined height of the drawer box sides (e.g., 100mm, 150mm)
  customDrawerFrontHeights?: number[]; // Optional list of individual front heights
}

export interface DrawerSetCalculatorResult {
  success: boolean;
  message?: string;
  calculatedDrawers: CalculatedDrawer[];
  totalFrontsHeightWithReveals?: number; 
  cabinetInternalHeight?: number; 
}

