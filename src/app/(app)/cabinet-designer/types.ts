
export interface CabinetPart {
  name: string;
  quantity: number;
  width: number; // mm
  height: number; // or length for rails
  thickness: number; // mm
  material: string; // e.g., "18mm MDF", "3mm HDF", "Oak Edge Band"
  notes?: string;
  edgeBanding?: {
    front?: number; // length of edge banding on front edge
    back?: number;
    left?: number;
    right?: number;
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
  totalPanelAreaMM: number; // 18mm or primary panel material area in sq mm
  totalBackPanelAreaMM: number; // 3mm or secondary panel material area in sq mm
  // Add other material totals as needed, e.g., totalEdgeBandLengthMeters
}

export interface CabinetCalculationInput {
  cabinetType: string; // e.g., "standard_base_2_door" or ID of a CabinetTemplate
  width: number;
  height: number;
  depth: number;
  // Potentially, pass a full CabinetTemplate object if 'cabinetType' refers to a custom one
  // customTemplate?: CabinetTemplateData;
}


// --- Conceptual Structures for Database-Driven Cabinet Templates ---

export interface MaterialDefinition {
  id: string; // e.g., "MDF_18MM", "PLY_3MM_BACK", "OAK_EDGE_BAND_22MM"
  name: string; // "18mm MDF Sheet"
  type: "panel" | "edge_band" | "other";
  costPerSqm?: number; // For panels
  costPerMeter?: number; // For edge bands
  thickness?: number; // mm, for panels
  defaultSheetWidth?: number; // mm, for panel nesting
  defaultSheetHeight?: number; // mm, for panel nesting
}

export interface AccessoryDefinition {
  id: string; // e.g., "HINGE_SOFT_CLOSE_FO", "HANDLE_PULL_128MM"
  name: string;
  type: "hinge" | "drawer_slide" | "handle" | "shelf_pin" | "leg" | "screw";
  unitCost: number;
}

export interface EdgeBandingAssignment {
  front?: boolean | string; // boolean or materialId for specific edge banding
  back?: boolean | string;
  top?: boolean | string;   // Renamed from left/right for clarity if part is laid flat
  bottom?: boolean | string; // Renamed from left/right
}

export interface PartDefinition {
  partId: string; // e.g., "side_panel", "bottom_panel", "door"
  nameLabel: string; // "Side Panel", "Bottom Panel"
  quantityFormula: string; // "2", "1" (can be dynamic e.g. "NumberOfShelves")
  widthFormula: string; // e.g., "D - BackPanelOffset", "W - 2*PT"
  heightFormula: string; // e.g., "H", "D"
  materialId: string; // References MaterialDefinition.id for primary material
  thicknessFormula?: string; // e.g., "PT", "BPT" (PanelThickness, BackPanelThickness)
  edgeBanding?: EdgeBandingAssignment;
  notes?: string;
}

export interface CabinetTemplateData {
  id: string; // e.g., "base_cabinet_2_door_parametric"
  name: string; // "Base Cabinet - 2 Door (Parametric)"
  type: "base" | "wall" | "tall" | "custom";
  previewImage?: string;
  defaultDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  parameters: { // Global parameters for this template's formulas
    PT: number; // PanelThickness
    BPT?: number; // BackPanelThickness
    BPO?: number; // BackPanelOffset
    DG?: number; // DoorGap
    DCG?: number; // DoorCenterGap
    TRD?: number; // TopRailDepth
    // ... other parameters like toe kick height, shelf count etc.
  };
  parts: PartDefinition[];
  accessories?: Array<{
    accessoryId: string; // References AccessoryDefinition.id
    quantityFormula: string; // e.g., "4" (for 2 doors x 2 hinges), "NumberOfShelves * 4"
  }>;
}

// Example:
// const exampleTemplate: CabinetTemplateData = {
//   id: "base_cabinet_2_door_parametric_example",
//   name: "Base Cabinet - 2 Door (Parametric Example)",
//   type: "base",
//   defaultDimensions: { width: 600, height: 720, depth: 560 },
//   parameters: { PT: 18, BPT: 3, BPO: 10, DG: 2, DCG: 3, TRD: 80 },
//   parts: [
//     { partId: "side", nameLabel: "Side Panel", quantityFormula: "2", widthFormula: "D", heightFormula: "H", materialId: "MDF_18MM_CARCASS", thicknessFormula: "PT", edgeBanding: { front: true } },
//     { partId: "bottom", nameLabel: "Bottom Panel", quantityFormula: "1", widthFormula: "W - 2*PT", heightFormula: "D", materialId: "MDF_18MM_CARCASS", thicknessFormula: "PT", edgeBanding: { front: true } },
//     { partId: "top_rail_front", nameLabel: "Top Rail (Front)", quantityFormula: "1", widthFormula: "W - 2*PT", heightFormula: "TRD", materialId: "MDF_18MM_CARCASS", thicknessFormula: "PT" },
//     { partId: "top_rail_back", nameLabel: "Top Rail (Back)", quantityFormula: "1", widthFormula: "W - 2*PT", heightFormula: "TRD", materialId: "MDF_18MM_CARCASS", thicknessFormula: "PT" },
//     { partId: "shelf", nameLabel: "Shelf", quantityFormula: "1", widthFormula: "W - 2*PT", heightFormula: "D - BPO - BPT", materialId: "MDF_18MM_CARCASS", thicknessFormula: "PT", edgeBanding: { front: true } },
//     { partId: "door", nameLabel: "Door", quantityFormula: "2", widthFormula: "(W - DG*2 - DCG) / 2", heightFormula: "H - DG*2", materialId: "MDF_18MM_DOOR", thicknessFormula: "PT", edgeBanding: { front: true, back: true, top: true, bottom: true } },
//     { partId: "back_panel", nameLabel: "Back Panel", quantityFormula: "1", widthFormula: "W - 2*PT - 2", heightFormula: "H - 2*PT - 2", materialId: "HDF_3MM_BACK", thicknessFormula: "BPT" }
//   ],
//   accessories: [
//     { accessoryId: "HINGE_SOFT_CLOSE_FO", quantityFormula: "4" }, // 2 per door
//     { accessoryId: "HANDLE_PULL_128MM", quantityFormula: "2" },
//     { accessoryId: "SHELF_PINS_STD", quantityFormula: "4" }
//   ]
// };
