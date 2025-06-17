
export interface CabinetPart {
  name: string;
  quantity: number;
  width: number; // mm
  height: number; // or length for rails
  thickness: number; // mm
  material: string;
  notes?: string;
}

export interface CalculatedCabinet {
  parts: CabinetPart[];
  estimatedCost: number;
  totalPanelArea: number; // in sq meters
  totalBackPanelArea: number; // in sq meters
  accessories: { name: string; quantity: number; unitCost: number; totalCost: number }[];
}

export interface CabinetCalculationInput {
  cabinetType: string; // e.g., "standard_base_2_door"
  width: number;
  height: number;
  depth: number;
}

/*
Suggested JSON structure for storable Cabinet Templates (for future database implementation):

export interface CabinetTemplate {
  id: string; // e.g., "base_cabinet_2_door"
  name: string; // e.g., "Base Cabinet - 2 Door"
  type: "base" | "wall" | "tall";
  previewImage?: string; // path to image
  defaultDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  parameters: {
    panelThickness: number;
    backPanelThickness: number;
    backPanelOffset: number; // from rear edge
    doorOverlayType: "full" | "partial" | "inset";
    doorGap: number; // gap around doors
    shelfCount?: number;
    hasAdjustableShelves?: boolean;
    // ... more parameters like drawer configuration, rail sizes, etc.
  };
  // Formulae for each part would be complex and likely involve a small expression language or specific functions
  // Example:
  // partsFormulae: [
  //   { name: "Side Panel", quantity: 2, width: "D", height: "H", material: "carcass" },
  //   { name: "Bottom Panel", quantity: 1, width: "W - 2 * PT", height: "D", material: "carcass" },
  // ]
  // Materials required (types, with default options)
  // Accessories required (types, quantities as formulae, default options)
}

export interface Material {
  id: string;
  name: string;
  type: "panel" | "edgeband" | "accessory_material";
  unit: "sqm" | "meter" | "piece";
  costPerUnit: number;
  thickness?: number; // for panels
  width?: number; // for edgeband
}

export interface Accessory {
  id: string;
  name: string;
  type: "hinge" | "drawer_slide" | "handle" | "leg";
  costPerUnit: number;
}
*/
