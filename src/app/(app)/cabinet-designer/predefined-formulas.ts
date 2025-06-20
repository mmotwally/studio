
import type { CabinetPartType, CabinetTypeContext, FormulaDimensionType } from "./types";

// Example:
// { key: "WIDTH_BASE_SIDE_PANEL", name: "Base Side Panel Width", description: "Width for standard base side panels.", partType: ["Side Panel"], context: ["Base"], dimension: "Width", formula: "D" },

export const PREDEFINED_FORMULAS = [
    { key: "WIDTH_BASE_SIDE_PANEL", name: "Base Side Panel Width", description: "Width for standard base side panels.", partType: ["Side Panel"], context: ["Base", "General"], dimension: "Width", formula: "D" },
    { key: "HEIGHT_BASE_SIDE_PANEL", name: "Base Side Panel Height", description: "Height for standard base side panels.", partType: ["Side Panel"], context: ["Base", "General"], dimension: "Height", formula: "H - PT" },
    
    { key: "WIDTH_DOOR", name: "Door Width (Single)", description: "Width for a single door.", partType: ["Door"], context: ["Base", "Wall", "General"], dimension: "Width", formula: "(W - DG - DCG) / 2" },
    { key: "HEIGHT_DOOR", name: "Door Height", description: "Height for doors.", partType: ["Door"], context: ["Base", "Wall", "General"], dimension: "Height", formula: "H - DG" },

    { key: "QUANTITY_SIDE_PANELS", name: "Side Panel Quantity (x2)", description: "Always two side panels.", partType: ["Side Panel"], context: ["Base", "Wall", "General"], dimension: "Quantity", formula: "2" },
    { key: "QUANTITY_SINGLE", name: "Single Quantity", description: "Always one.", partType: [], context: null, dimension: "Quantity", formula: "1" },

    { key: "WIDTH_SHELF", name: "Shelf Width", description: "Width of a shelf, accounting for side panel thickness.", partType: ["Fixed Shelf", "Mobile Shelf"], context: ["Base", "Wall", "General"], dimension: "Width", formula: "W - 2 * PT" },
    { key: "DEPTH_SHELF", name: "Shelf Depth", description: "Depth of a shelf, accounting for back panel offset.", partType: ["Fixed Shelf", "Mobile Shelf"], context: ["Base", "Wall", "General"], dimension: "Height", formula: "D - BPO" },

    { key: "WIDTH_BACK_PANEL", name: "Back Panel Width", description: "Width of the back panel.", partType: ["Back Panel"], context: ["Base", "Wall", "General"], dimension: "Width", formula: "W - 2 * PT" },
    { key: "HEIGHT_BACK_PANEL", name: "Back Panel Height", description: "Height of the back panel.", partType: ["Back Panel"], context: ["Base", "Wall", "General"], dimension: "Height", formula: "H - PT" },

    { key: "CUSTOM", name: "Custom", description: "Define a custom formula.", partType: [], context: null, dimension: "Width" as FormulaDimensionType, formula: "" },
];
