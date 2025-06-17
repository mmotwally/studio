
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart, AccessoryItem, CabinetTemplateData, PartDefinition } from './types';

// --- Configuration Constants (would ideally come from database/settings or template parameters) ---
const PANEL_THICKNESS = 18; // mm -> PT
const BACK_PANEL_THICKNESS = 3; // mm -> BPT
const BACK_PANEL_OFFSET = 10; // mm inset from back edge of carcass -> BPO
const DOOR_GAP_SIDE = 2; // mm total side gap for a door (e.g., 1mm each side) -> DG
const DOOR_GAP_VERTICAL = 2; // mm total top/bottom gap for a door -> DG
const DOOR_GAP_CENTER = 3; // mm gap between two doors -> DCG
const TOP_RAIL_DEPTH = 80; // mm width of top rails -> TRD

// Material Costs (placeholders, would come from a MaterialDefinition database)
const COST_PER_SQM_PANEL_MM = 25.0 / (1000*1000); // e.g., $25 per square meter for 18mm MDF/Plywood
const COST_PER_SQM_BACK_PANEL_MM = 10.0 / (1000*1000); // e.g., $10 per square meter for 3mm HDF
const COST_PER_METER_EDGE_BAND = 0.5;

// Accessory Costs (placeholders, would come from AccessoryDefinition database)
const COST_PER_HINGE = 1.5;
const COST_PER_HANDLE = 3.0;
const COST_PER_SHELF_PIN = 0.1;


/**
 * Evaluates a simple formula string.
 * THIS IS A VERY BASIC PLACEHOLDER. A real implementation would need a robust math expression parser.
 * For now, it only handles direct values or simple subtractions/additions of parameters.
 */
function evaluateFormula(formula: string, params: { W: number, H: number, D: number, PT: number, BPT?: number, BPO?: number, TRD?: number, DCG?: number, DG?:number }): number {
  // Make parameters available in the eval scope. DANGEROUS with real user input.
  const { W, H, D, PT, BPT = 0, BPO = 0, TRD = 0, DCG = 0, DG = 0 } = params;
  try {
    // Extremely simplified and unsafe for general use.
    // A proper library like math.js or a custom parser is needed.
    if (formula.match(/^[0-9.+\-*/\s()WHDPTBPOTRDGCGSQRT]+$/)) { // Basic check for allowed chars
       // eslint-disable-next-line no-eval
      return eval(formula);
    }
    throw new Error("Invalid characters in formula.");
  } catch (e) {
    console.error(`Error evaluating formula "${formula}":`, e);
    return 0; // Or throw error
  }
}


/**
 * Calculates the parts and estimated cost for a given cabinet.
 * Currently supports only a "standard_base_2_door" type with hardcoded logic.
 * Future: Should accept a CabinetTemplateData object and process its part definitions and formulas.
 */
export async function calculateCabinetDetails(
  input: CabinetCalculationInput
  // FUTURE: customTemplate?: CabinetTemplateData 
): Promise<{ success: boolean; data?: CalculatedCabinet; error?: string }> {
  
  // FUTURE: If input.cabinetType is an ID, fetch the CabinetTemplateData from a database.
  // For now, we only handle the hardcoded 'standard_base_2_door'.
  // If `customTemplate` was passed, use that instead of hardcoded logic.

  if (input.cabinetType !== 'standard_base_2_door') {
    // In the future, if cabinetType is an ID of a custom template, this check would change.
    // We would load the template and proceed with formula-based calculation.
    // For now, only the hardcoded one is supported.
    return { success: false, error: `Selected cabinet type '${input.cabinetType}' is not supported by this prototype's hardcoded logic.` };
  }

  if (input.width <= 0 || input.height <= 0 || input.depth <= 0) {
    return { success: false, error: 'Dimensions must be positive numbers.' };
  }
  if (input.width < 300 || input.width > 1200 || input.height < 500 || input.height > 900 || input.depth < 300 || input.depth > 700) {
    return { success: false, error: 'Dimensions are outside typical ranges for a base cabinet. Please check values (W:300-1200, H:500-900, D:300-700).' };
  }

  const W = input.width;
  const H = input.height;
  const D = input.depth;
  // Parameters for formulas (matching the current hardcoded constants)
  const params = { W, H, D, PT: PANEL_THICKNESS, BPT: BACK_PANEL_THICKNESS, BPO: BACK_PANEL_OFFSET, TRD: TOP_RAIL_DEPTH, DCG: DOOR_GAP_CENTER, DG: DOOR_GAP_SIDE };

  const parts: CabinetPart[] = [];
  let totalPanelArea_sqmm = 0;
  let totalBackPanelArea_sqmm = 0;
  let totalEdgeBandLength_mm = 0;


  // --- BEGIN HARDCODED LOGIC FOR 'standard_base_2_door' ---
  // This section would be replaced by iterating through a CabinetTemplateData.parts array
  // and evaluating their formulas.

  // 1. Side Panels (x2) - Example of how it might work with formulas
  // From a template: { partId: "side", nameLabel: "Side Panel", quantityFormula: "2", widthFormula: "D", heightFormula: "H", materialId: "...", thicknessFormula: "PT", edgeBanding: { front: true } }
  const sidePanelQty = 2; // evaluateFormula("2", params)
  const sidePanelWidth = D; // evaluateFormula("D", params)
  const sidePanelHeight = H; // evaluateFormula("H", params)
  const sidePanelThickness = PANEL_THICKNESS; // evaluateFormula("PT", params)
  parts.push({
    name: 'Side Panel',
    quantity: sidePanelQty,
    width: sidePanelWidth,
    height: sidePanelHeight,
    thickness: sidePanelThickness,
    material: `${sidePanelThickness}mm Panel`,
    edgeBanding: { front: sidePanelHeight } // Edge banding on front edge of height H
  });
  totalPanelArea_sqmm += (sidePanelQty * sidePanelWidth * sidePanelHeight);
  totalEdgeBandLength_mm += sidePanelQty * sidePanelHeight; // Assuming front edge banded

  // 2. Bottom Panel (x1)
  // From a template: { partId: "bottom", nameLabel: "Bottom Panel", quantityFormula: "1", widthFormula: "W - 2*PT", heightFormula: "D", materialId: "...", thicknessFormula: "PT", edgeBanding: { front: true } }
  const bottomPanelWidth = W - 2 * PANEL_THICKNESS; // evaluateFormula("W - 2*PT", params)
  const bottomPanelDepth = D; // evaluateFormula("D", params)
  parts.push({
    name: 'Bottom Panel',
    quantity: 1,
    width: bottomPanelWidth,
    height: bottomPanelDepth,
    thickness: PANEL_THICKNESS,
    material: `${PANEL_THICKNESS}mm Panel`,
    edgeBanding: { front: bottomPanelWidth }
  });
  totalPanelArea_sqmm += (bottomPanelWidth * bottomPanelDepth);
  totalEdgeBandLength_mm += bottomPanelWidth;

  // 3. Top Rails (Front & Back, x2 total)
  const topRailLength = W - 2 * PANEL_THICKNESS; // evaluateFormula("W - 2*PT", params)
  const topRailDepthVal = TOP_RAIL_DEPTH; // evaluateFormula("TRD", params)
  parts.push({
    name: 'Top Rail (Front)',
    quantity: 1,
    width: topRailLength,
    height: topRailDepthVal,
    thickness: PANEL_THICKNESS,
    material: `${PANEL_THICKNESS}mm Panel`,
    // No edge banding typically on internal rails if hidden
  });
  totalPanelArea_sqmm += (topRailLength * topRailDepthVal);
  parts.push({
    name: 'Top Rail (Back)',
    quantity: 1,
    width: topRailLength,
    height: topRailDepthVal,
    thickness: PANEL_THICKNESS,
    material: `${PANEL_THICKNESS}mm Panel`,
  });
  totalPanelArea_sqmm += (topRailLength * topRailDepthVal);
  
  // 4. Shelf (x1, simple fixed shelf for this example)
  // From a template: { partId: "shelf", nameLabel: "Shelf", quantityFormula: "1", widthFormula: "W - 2*PT", heightFormula: "D - BPO - BPT", materialId: "...", thicknessFormula: "PT", edgeBanding: { front: true } }
  const shelfWidth = W - 2 * PANEL_THICKNESS; // evaluateFormula("W - 2*PT", params)
  const shelfDepth = D - BACK_PANEL_OFFSET - BACK_PANEL_THICKNESS; // evaluateFormula("D - BPO - BPT", params)
  parts.push({
    name: 'Shelf',
    quantity: 1,
    width: shelfWidth,
    height: shelfDepth,
    thickness: PANEL_THICKNESS,
    material: `${PANEL_THICKNESS}mm Panel`,
    notes: 'Adjust depth if back panel fitting differs',
    edgeBanding: { front: shelfWidth }
  });
  totalPanelArea_sqmm += (shelfWidth * shelfDepth);
  totalEdgeBandLength_mm += shelfWidth;

  // 5. Doors (x2) - Full overlay assumption
  // From template: { partId: "door", nameLabel: "Door", quantityFormula: "2", widthFormula: "(W - DG*2 - DCG) / 2", heightFormula: "H - DG*2", materialId: "...", thicknessFormula: "PT", edgeBanding: { front: true, back: true, top: true, bottom: true } }
  // Note: DOOR_GAP_SIDE is total, DOOR_GAP_VERTICAL is total. Formulas in template should account for this.
  // Current hardcode uses DG for side gap (split to each actual side of door)
  // and DCG for center gap. DGV for vertical.
  const doorHeight = H - DOOR_GAP_VERTICAL; // evaluateFormula("H - DG_VERTICAL", params)
  const singleDoorWidth = (W - (DOOR_GAP_SIDE) - DOOR_GAP_CENTER) / 2; // evaluateFormula("(W - DG_SIDE_TOTAL - DCG) / 2", params)
  parts.push({
    name: 'Door',
    quantity: 2,
    width: singleDoorWidth,
    height: doorHeight,
    thickness: PANEL_THICKNESS,
    material: `${PANEL_THICKNESS}mm Panel (Door Grade)`,
    edgeBanding: { // All edges typically banded for doors
        front: singleDoorWidth, // This interpretation is simplified. Edge banding is on the 'thickness' side.
        back: singleDoorWidth,  // So for a door, it's 2*width + 2*height per door.
        left: doorHeight,
        right: doorHeight,
    }
  });
  totalPanelArea_sqmm += (2 * singleDoorWidth * doorHeight);
  totalEdgeBandLength_mm += 2 * (2 * singleDoorWidth + 2 * doorHeight); // For two doors, all 4 edges

  // 6. Back Panel (x1)
  // From a template: { partId: "back_panel", nameLabel: "Back Panel", quantityFormula: "1", widthFormula: "W - 2*PT - 2", heightFormula: "H - 2*PT - 2", materialId: "...", thicknessFormula: "BPT" }
  // Assumes back panel fits inside the carcass, recessed. Small tolerance (1mm each side)
  const backPanelWidth = W - 2 * PANEL_THICKNESS - (2 * 1); // evaluateFormula("W - 2*PT - 2", params)
  const backPanelHeight = H - 2 * PANEL_THICKNESS - (2* 1); // evaluateFormula("H - 2*PT - 2", params)
  parts.push({
    name: 'Back Panel',
    quantity: 1,
    width: backPanelWidth,
    height: backPanelHeight,
    thickness: BACK_PANEL_THICKNESS,
    material: `${BACK_PANEL_THICKNESS}mm HDF/Plywood`,
    notes: `Fits into a groove or is offset by ${BACK_PANEL_OFFSET}mm`
  });
  totalBackPanelArea_sqmm += (backPanelWidth * backPanelHeight);

  // --- END HARDCODED LOGIC ---

  // --- Accessories ---
  // Future: iterate through template.accessories, evaluate quantityFormula
  const accessories: AccessoryItem[] = [
    { id: "HINGE_STD_FO", name: 'Hinges (pair)', quantity: 2, unitCost: COST_PER_HINGE * 2, totalCost: COST_PER_HINGE * 2 * 2 }, // 2 pairs = 4 hinges
    { id: "HANDLE_STD_PULL", name: 'Handles', quantity: 2, unitCost: COST_PER_HANDLE, totalCost: COST_PER_HANDLE * 2 },
    { id: "SHELF_PIN_STD", name: 'Shelf Pins', quantity: 4, unitCost: COST_PER_SHELF_PIN, totalCost: COST_PER_SHELF_PIN * 4 },
  ];
  const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);

  // --- Cost Estimation ---
  // Future: iterate through parts, get materialId, fetch MaterialDefinition, use its cost.
  const estimatedPanelMaterialCost = totalPanelArea_sqmm * COST_PER_SQM_PANEL_MM;
  const estimatedBackPanelMaterialCost = totalBackPanelArea_sqmm * COST_PER_SQM_BACK_PANEL_MM;
  const estimatedEdgeBandCost = (totalEdgeBandLength_mm / 1000) * COST_PER_METER_EDGE_BAND; // Convert mm to m

  const estimatedMaterialCost = estimatedPanelMaterialCost + estimatedBackPanelMaterialCost + estimatedEdgeBandCost;
  const estimatedTotalCost = estimatedMaterialCost + totalAccessoryCost;

  const calculatedCabinet: CalculatedCabinet = {
    parts,
    accessories,
    estimatedMaterialCost: parseFloat(estimatedMaterialCost.toFixed(2)),
    estimatedAccessoryCost: parseFloat(totalAccessoryCost.toFixed(2)),
    estimatedTotalCost: parseFloat(estimatedTotalCost.toFixed(2)),
    totalPanelAreaMM: totalPanelArea_sqmm,
    totalBackPanelAreaMM: totalBackPanelArea_sqmm,
  };

  // console.log("Total Edge Banding Length (mm):", totalEdgeBandLength_mm);
  // In a real system, this part list would be sent to a nesting engine.
  // console.log("Parts to nest:", parts.filter(p => p.thickness === PANEL_THICKNESS));
  // console.log("Back panels to nest:", parts.filter(p => p.thickness === BACK_PANEL_THICKNESS));

  return { success: true, data: calculatedCabinet };
}
