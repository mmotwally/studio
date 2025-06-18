
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
    top?: number; // formerly left
    bottom?: number; // formerly right
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
  customTemplate?: CabinetTemplateData; // Allow passing a full template for calculation
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
  hasGrain?: boolean; // New property
}

export interface AccessoryDefinition {
  id: string; 
  name: string;
  type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw";
  unitCost: number;
}

export interface EdgeBandingAssignment { // Defines which edges get banding
  front?: boolean; 
  back?: boolean;
  top?: boolean;   // Represents one pair of opposite edges (e.g., top/bottom if part is laid flat)
  bottom?: boolean; // Represents the other pair of opposite edges (e.g., left/right if part is laid flat)
}

export interface PartDefinition {
  partId: string; 
  nameLabel: string; 
  partType: CabinetPartType; // New: Type of part
  quantityFormula: string; 
  widthFormula: string; 
  heightFormula: string; 
  materialId: string; 
  thicknessFormula?: string; 
  edgeBanding?: EdgeBandingAssignment;
  grainDirection?: 'with' | 'reverse' | 'none' | null; // New: Grain direction
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
    PT: number; // PanelThickness
    BPT?: number; // BackPanelThickness
    BPO?: number; // BackPanelOffset / Back Panel Gap (B from user request)
    DG?: number; // DoorGap
    DCG?: number; // DoorCenterGap
    TRD?: number; // TopRailDepth
    // Drawer specific parameters might go here or be part of a "DrawerBox" sub-template type
    // Clearance?: number; // Drawer slide clearance
    // TKH?: number; // Toe Kick Height
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
];
