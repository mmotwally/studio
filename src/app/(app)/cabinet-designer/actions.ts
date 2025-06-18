
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart, AccessoryItem, CabinetTemplateData, PartDefinition } from './types';

// --- Configuration Constants (would ideally come from database/settings or template parameters) ---
const PANEL_THICKNESS = 18; // mm -> PT
const BACK_PANEL_THICKNESS = 3; // mm -> BPT
const BACK_PANEL_OFFSET = 10; // mm inset from back edge of carcass -> BPO
const DOOR_GAP = 2; // mm total side/vertical gap for a door (e.g., 1mm each side/top/bottom) -> DG
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

  // Parameters for formulas
  const params = {
    W, H, D,
    PT: PANEL_THICKNESS,
    BPT: BACK_PANEL_THICKNESS,
    BPO: BACK_PANEL_OFFSET,
    TRD: TOP_RAIL_DEPTH,
    DCG: DOOR_GAP_CENTER,
    DG: DOOR_GAP
  };

  const parts: CabinetPart[] = [];
  let totalPanelArea_sqmm = 0;
  let totalBackPanelArea_sqmm = 0;
  let totalEdgeBandLength_mm = 0;


  // --- BEGIN LOGIC FOR 'standard_base_2_door' USING FORMULAS ---
  // This section demonstrates using evaluateFormula. In a full system, these formulas
  // would come from a CabinetTemplateData object.

  // 1. Side Panels (x2)
  const sidePanelQty = evaluateFormula("2", params);
  const sidePanelWidth = evaluateFormula("D", params);
  const sidePanelHeight = evaluateFormula("H", params);
  const sidePanelThickness = evaluateFormula("PT", params); // PT is a parameter here
  parts.push({
    name: 'Side Panel',
    quantity: sidePanelQty,
    width: sidePanelWidth,
    height: sidePanelHeight,
    thickness: sidePanelThickness, // Using the evaluated thickness
    material: `${sidePanelThickness}mm Panel`,
    edgeBanding: { front: sidePanelHeight }
  });
  totalPanelArea_sqmm += (sidePanelQty * sidePanelWidth * sidePanelHeight);
  totalEdgeBandLength_mm += sidePanelQty * sidePanelHeight;

  // 2. Bottom Panel (x1)
  const bottomPanelQty = evaluateFormula("1", params);
  const bottomPanelWidth = evaluateFormula("W - 2*PT", params);
  const bottomPanelDepth = evaluateFormula("D", params);
  const bottomPanelThickness = evaluateFormula("PT", params);
  parts.push({
    name: 'Bottom Panel',
    quantity: bottomPanelQty,
    width: bottomPanelWidth,
    height: bottomPanelDepth,
    thickness: bottomPanelThickness,
    material: `${bottomPanelThickness}mm Panel`,
    edgeBanding: { front: bottomPanelWidth }
  });
  totalPanelArea_sqmm += (bottomPanelQty * bottomPanelWidth * bottomPanelDepth);
  totalEdgeBandLength_mm += bottomPanelQty * bottomPanelWidth;

  // 3. Top Rails (Front & Back, x2 total)
  const topRailQty = evaluateFormula("1", params); // Per rail
  const topRailLength = evaluateFormula("W - 2*PT", params);
  const topRailDepthVal = evaluateFormula("TRD", params);
  const topRailThickness = evaluateFormula("PT", params);

  parts.push({
    name: 'Top Rail (Front)',
    quantity: topRailQty,
    width: topRailLength,
    height: topRailDepthVal,
    thickness: topRailThickness,
    material: `${topRailThickness}mm Panel`,
  });
  totalPanelArea_sqmm += (topRailQty * topRailLength * topRailDepthVal);

  parts.push({
    name: 'Top Rail (Back)',
    quantity: topRailQty,
    width: topRailLength,
    height: topRailDepthVal,
    thickness: topRailThickness,
    material: `${topRailThickness}mm Panel`,
  });
  totalPanelArea_sqmm += (topRailQty * topRailLength * topRailDepthVal);

  // 4. Shelf (x1, simple fixed shelf for this example)
  const shelfQty = evaluateFormula("1", params);
  const shelfWidth = evaluateFormula("W - 2*PT", params);
  const shelfDepth = evaluateFormula("D - BPO - BPT", params);
  const shelfThickness = evaluateFormula("PT", params);
  parts.push({
    name: 'Shelf',
    quantity: shelfQty,
    width: shelfWidth,
    height: shelfDepth,
    thickness: shelfThickness,
    material: `${shelfThickness}mm Panel`,
    notes: 'Adjust depth if back panel fitting differs',
    edgeBanding: { front: shelfWidth }
  });
  totalPanelArea_sqmm += (shelfQty * shelfWidth * shelfDepth);
  totalEdgeBandLength_mm += shelfQty * shelfWidth;

  // 5. Doors (x2) - Full overlay assumption
  const doorQty = evaluateFormula("2", params);
  const doorHeight = evaluateFormula("H - DG", params); // Using unified DOOR_GAP for DG
  const singleDoorWidth = evaluateFormula("(W - DG - DCG) / 2", params); // Using unified DOOR_GAP for DG
  const doorThickness = evaluateFormula("PT", params);
  parts.push({
    name: 'Door',
    quantity: doorQty,
    width: singleDoorWidth,
    height: doorHeight,
    thickness: doorThickness,
    material: `${doorThickness}mm Panel (Door Grade)`,
    edgeBanding: {
        front: singleDoorWidth,
        back: singleDoorWidth,
        left: doorHeight,
        right: doorHeight,
    }
  });
  totalPanelArea_sqmm += (doorQty * singleDoorWidth * doorHeight);
  totalEdgeBandLength_mm += doorQty * (singleDoorWidth + singleDoorWidth + doorHeight + doorHeight); // For two doors, all 4 edges

  // 6. Back Panel (x1)
  const backPanelQty = evaluateFormula("1", params);
  // Assumes back panel fits inside the carcass, recessed. Small tolerance (1mm each side => 2mm total)
  const backPanelWidth = evaluateFormula("W - 2*PT - 2", params); // -2 for tolerance
  const backPanelHeight = evaluateFormula("H - 2*PT - 2", params); // -2 for tolerance
  const backPanelActualThickness = evaluateFormula("BPT", params);
  parts.push({
    name: 'Back Panel',
    quantity: backPanelQty,
    width: backPanelWidth,
    height: backPanelHeight,
    thickness: backPanelActualThickness,
    material: `${backPanelActualThickness}mm HDF/Plywood`,
    notes: `Fits into a groove or is offset by ${BACK_PANEL_OFFSET}mm`
  });
  totalBackPanelArea_sqmm += (backPanelQty * backPanelWidth * backPanelHeight);

  // --- END LOGIC USING FORMULAS ---

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

  return { success: true, data: calculatedCabinet };
}

