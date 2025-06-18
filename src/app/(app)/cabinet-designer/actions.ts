
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart, AccessoryItem, CabinetTemplateData, PartDefinition, DrawerSetCalculatorInput, DrawerSetCalculatorResult, CalculatedDrawer, DrawerPartCalculation } from './types';

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
  const sidePanelWidth = evaluateFormula("D", params); // This is the depth of the cabinet
  const sidePanelHeight = evaluateFormula("H", params); // Height of the side panel
  const sidePanelThickness = evaluateFormula("PT", params);
  parts.push({
    name: 'Side Panel',
    partType: 'Side Panel',
    quantity: sidePanelQty,
    width: sidePanelWidth,    // In cutting list, "width" might refer to the D dimension for side panels
    height: sidePanelHeight,  // and "height" is the H dimension
    thickness: sidePanelThickness, 
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
    partType: 'Bottom Panel',
    quantity: bottomPanelQty,
    width: bottomPanelWidth,
    height: bottomPanelDepth, // For bottom panel, height is depth dimension
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
    partType: 'Top Rail (Front)',
    quantity: topRailQty,
    width: topRailLength,
    height: topRailDepthVal,
    thickness: topRailThickness,
    material: `${topRailThickness}mm Panel`,
  });
  totalPanelArea_sqmm += (topRailQty * topRailLength * topRailDepthVal);

  parts.push({
    name: 'Top Rail (Back)',
    partType: 'Top Rail (Back)',
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
    partType: 'Fixed Shelf',
    quantity: shelfQty,
    width: shelfWidth,
    height: shelfDepth, // Shelf depth
    thickness: shelfThickness,
    material: `${shelfThickness}mm Panel`,
    notes: 'Adjust depth if back panel fitting differs',
    edgeBanding: { front: shelfWidth }
  });
  totalPanelArea_sqmm += (shelfQty * shelfWidth * shelfDepth);
  totalEdgeBandLength_mm += shelfQty * shelfWidth;

  // 5. Doors (x2) - Full overlay assumption
  const doorQty = evaluateFormula("2", params);
  const doorHeight = evaluateFormula("H - DG", params); 
  const singleDoorWidth = evaluateFormula("(W - DG - DCG) / 2", params); 
  const doorThickness = evaluateFormula("PT", params);
  parts.push({
    name: 'Door',
    partType: 'Door',
    quantity: doorQty,
    width: singleDoorWidth,
    height: doorHeight,
    thickness: doorThickness,
    material: `${doorThickness}mm Panel (Door Grade)`,
    edgeBanding: {
        front: singleDoorWidth, // Or all four edges, depending on style
        back: singleDoorWidth,
        top: doorHeight,
        bottom: doorHeight,
    }
  });
  totalPanelArea_sqmm += (doorQty * singleDoorWidth * doorHeight);
  totalEdgeBandLength_mm += doorQty * (singleDoorWidth * 2 + doorHeight * 2); 

  // 6. Back Panel (x1)
  const backPanelQty = evaluateFormula("1", params);
  const backPanelWidth = evaluateFormula("W - 2*PT - 2", params); 
  const backPanelHeight = evaluateFormula("H - 2*PT - 2", params);
  const backPanelActualThickness = evaluateFormula("BPT", params);
  parts.push({
    name: 'Back Panel',
    partType: 'Back Panel',
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
  const accessories: AccessoryItem[] = [
    { id: "HINGE_STD_FO", name: 'Hinges (pair)', quantity: 2, unitCost: COST_PER_HINGE * 2, totalCost: COST_PER_HINGE * 2 * 2 },
    { id: "HANDLE_STD_PULL", name: 'Handles', quantity: 2, unitCost: COST_PER_HANDLE, totalCost: COST_PER_HANDLE * 2 },
    { id: "SHELF_PIN_STD", name: 'Shelf Pins', quantity: 4, unitCost: COST_PER_SHELF_PIN, totalCost: COST_PER_SHELF_PIN * 4 },
  ];
  const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);

  // --- Cost Estimation ---
  const estimatedPanelMaterialCost = totalPanelArea_sqmm * COST_PER_SQM_PANEL_MM;
  const estimatedBackPanelMaterialCost = totalBackPanelArea_sqmm * COST_PER_SQM_BACK_PANEL_MM;
  const estimatedEdgeBandCost = (totalEdgeBandLength_mm / 1000) * COST_PER_METER_EDGE_BAND;

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


export async function calculateDrawerSet(input: DrawerSetCalculatorInput): Promise<DrawerSetCalculatorResult> {
  const {
    cabinetInternalHeight,
    cabinetWidth,
    numDrawers,
    drawerReveal,
    panelThickness: T,
    drawerSlideClearanceTotal,
    drawerBoxSideDepth,
    drawerBoxSideHeight, // This is the height of the drawer box sides
    customDrawerFrontHeights,
  } = input;

  if (numDrawers <= 0) {
    return { success: false, message: "Number of drawers must be greater than 0.", calculatedDrawers: [] };
  }
  if (cabinetInternalHeight <= 0 || cabinetWidth <= 0 || T <= 0 || drawerBoxSideDepth <= 0 || drawerBoxSideHeight <= 0) {
    return { success: false, message: "All dimensions and thicknesses must be positive values.", calculatedDrawers: [] };
  }
   if (drawerBoxSideHeight < 70) { // A reasonable minimum for box side height
    return { success: false, message: "Drawer box side height is too small (min 70mm).", calculatedDrawers: [] };
  }


  let drawerFrontHeights: number[] = [];
  const totalRevealSpace = (numDrawers > 1) ? (numDrawers - 1) * drawerReveal : 0;

  if (customDrawerFrontHeights && customDrawerFrontHeights.length > 0) {
    if (customDrawerFrontHeights.length !== numDrawers) {
      return { success: false, message: "Number of custom drawer front heights must match the number of drawers.", calculatedDrawers: [] };
    }
    drawerFrontHeights = customDrawerFrontHeights;
    const sumOfCustomFronts = customDrawerFrontHeights.reduce((sum, h) => sum + h, 0);
    if (sumOfCustomFronts + totalRevealSpace > cabinetInternalHeight) {
      return {
        success: false,
        message: `Custom drawer fronts and reveals (${(sumOfCustomFronts + totalRevealSpace).toFixed(1)}mm) exceed available internal cabinet height (${cabinetInternalHeight.toFixed(1)}mm).`,
        calculatedDrawers: [],
        totalFrontsHeightWithReveals: sumOfCustomFronts + totalRevealSpace,
        cabinetInternalHeight: cabinetInternalHeight
      };
    }
  } else {
    if (totalRevealSpace >= cabinetInternalHeight && numDrawers > 1) {
        return { success: false, message: "Total reveal space equals or exceeds internal cabinet height. Cannot calculate drawer fronts.", calculatedDrawers: [] };
    }
    const availableHeightForFronts = cabinetInternalHeight - totalRevealSpace;
    if (availableHeightForFronts <= 0) {
        return { success: false, message: "Not enough internal height for drawers and reveals.", calculatedDrawers: [] };
    }
    const equalDrawerFrontHeight = availableHeightForFronts / numDrawers;
    if (equalDrawerFrontHeight <= 0) {
        return { success: false, message: "Calculated drawer front height is not positive.", calculatedDrawers: [] };
    }
    drawerFrontHeights = Array(numDrawers).fill(equalDrawerFrontHeight);
  }

  const calculatedDrawers: CalculatedDrawer[] = [];

  for (let i = 0; i < numDrawers; i++) {
    const drawerNumber = i + 1;
    const currentDrawerFrontHeight = drawerFrontHeights[i];

    // Validate individual front height
    if (currentDrawerFrontHeight <= 30) { // Drawer front must be > 30 to make a box part
        return { success: false, message: `Drawer ${drawerNumber} front height (${currentDrawerFrontHeight.toFixed(1)}mm) is too small. Must allow for box construction.`, calculatedDrawers: [] };
    }

    // Drawer Box Side Panels (Height is drawerBoxSideHeight from input)
    // Width of side panel is the depth of the drawer box
    const sidePanel: DrawerPartCalculation = {
      name: "Drawer Box Side",
      quantity: 2,
      width: drawerBoxSideDepth, // This is the depth of the drawer side
      height: drawerBoxSideHeight,
      thickness: T,
    };

    // Drawer Back Panel
    // Width = Cabinet Width - (4T + 2 × Clearance)
    // Clearance is total here
    const drawerBackWidth = cabinetWidth - (4 * T + drawerSlideClearanceTotal);
    if (drawerBackWidth <= 0) {
        return { success: false, message: `Calculated drawer back width for drawer ${drawerNumber} is not positive. Check cabinet width, panel thickness, and slide clearance.`, calculatedDrawers: [] };
    }
    // Height = DrawerSideHeight - 30mm (using input drawerBoxSideHeight)
    const drawerBackHeight = drawerBoxSideHeight - 30;
     if (drawerBackHeight <= 0) {
        return { success: false, message: `Calculated drawer back height for drawer ${drawerNumber} (Box Side Height - 30mm) is not positive.`, calculatedDrawers: [] };
    }
    const backPanel: DrawerPartCalculation = {
      name: "Drawer Box Back",
      quantity: 1,
      width: drawerBackWidth,
      height: drawerBackHeight,
      thickness: T,
    };
    // Counter front would typically be the same dimensions if used.

    // Drawer Bottom Panel
    // Width = back panel width + 14mm
    const drawerBottomWidth = drawerBackWidth + 14;
    // Depth = drawer side panel depth
    const drawerBottomDepth = drawerBoxSideDepth;
    const bottomPanel: DrawerPartCalculation = {
      name: "Drawer Box Bottom",
      quantity: 1,
      width: drawerBottomWidth,
      height: drawerBottomDepth, // This is the depth of the bottom panel
      thickness: T, // Or could be thinner, e.g., 6mm, but stick to T for now
      notes: "Thickness could be less than T (e.g., 6mm)"
    };

    // Drawer Front Panel
    // Width = Cabinet Width - 2mm
    const drawerFrontPanelWidth = cabinetWidth - 2;
    if (drawerFrontPanelWidth <= 0) {
        return { success: false, message: `Calculated drawer front panel width for drawer ${drawerNumber} is not positive.`, calculatedDrawers: [] };
    }
    const frontPanel: DrawerPartCalculation = {
      name: "Drawer Front Panel",
      quantity: 1,
      width: drawerFrontPanelWidth,
      height: currentDrawerFrontHeight,
      thickness: T,
    };

    calculatedDrawers.push({
      drawerNumber,
      overallFrontHeight: currentDrawerFrontHeight,
      boxHeight: drawerBoxSideHeight, // This is the input side height
      parts: [sidePanel, backPanel, bottomPanel, frontPanel],
    });
  }

  return {
    success: true,
    calculatedDrawers,
    totalFrontsHeightWithReveals: drawerFrontHeights.reduce((sum, h) => sum + h, 0) + totalRevealSpace,
    cabinetInternalHeight: cabinetInternalHeight,
    message: "Drawer set calculated successfully."
  };
}
