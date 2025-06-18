

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
  widthFormulaKey?: string; // Key if selected from predefined
  heightFormula: string; 
  heightFormulaKey?: string; // Key if selected from predefined
  materialId: string; 
  thicknessFormula?: string; 
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
    
    // Drawer Specific Parameters (can be part of a drawer sub-assembly type later)
    DW?: number; // Drawer Width (overall, often opening width)
    DD?: number; // Drawer Depth (overall, often slide length or side panel depth)
    DH?: number; // Drawer Height (often side panel height)
    Clearance?: number; // Drawer slide clearance (per side)
    // TKH?: number; // Toe Kick Height (if applicable to the main cabinet type)
  };
  parts: PartDefinition[];
  accessories?: Array<{
    accessoryId: string; 
    quantityFormula: string; 
  }>;
}

// Example of predefined materials (would come from DB)
export const PREDEFINED_MATERIALS: MaterialDefinition[] = [
    { id: "MDF_18MM", name: "18mm MDF", type: "panel", thickness: 18, costPerSqm: 20, hasGrain: false },
    { id: "PLY_18MM_BIRCH", name: "18mm Birch Plywood", type: "panel", thickness: 18, costPerSqm: 35, hasGrain: true },
    { id: "MDF_3MM_BACK", name: "3mm MDF Back Panel", type: "panel", thickness: 3, costPerSqm: 10, hasGrain: false },
    { id: "EB_WHITE_PVC", name: "White PVC Edge Band", type: "edge_band", costPerMeter: 0.5 },
    { id: "EB_BIRCH_VENEER", name: "Birch Veneer Edge Band", type: "edge_band", costPerMeter: 1.2, hasGrain: true },
    { id: "Material1", name: "Generic Panel Material 1", type: "panel", thickness: 18, costPerSqm: 22, hasGrain: false},
    { id: "Material2", name: "Generic Panel Material 2 (Oak)", type: "panel", thickness: 18, costPerSqm: 40, hasGrain: true},
    { id: "Material3", name: "Generic Back Panel Material", type: "panel", thickness: 5, costPerSqm: 12, hasGrain: false},
];

export interface PredefinedFormula {
  key: string;
  name: string; // User-friendly name for the dropdown
  description: string;
  example?: string;
  partType: CabinetPartType | CabinetPartType[]; // Can apply to one or multiple part types
  context: CabinetTypeContext[] | null; // Can apply to one or multiple contexts, or null if general
  dimension: 'Width' | 'Height' | 'Quantity' | 'Thickness'; // Which dimension this formula is for
  formula: string; // The actual formula string
}
