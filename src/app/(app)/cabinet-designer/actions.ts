
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart, AccessoryItem, CabinetTemplateData, PartDefinition, DrawerSetCalculatorInput, DrawerSetCalculatorResult, CalculatedDrawer, DrawerPartCalculation } from './types';

// --- Configuration Constants (would ideally come from database/settings or template parameters) ---
const PANEL_THICKNESS = 18; // mm -> PT (Default, will be overridden by template if custom template provides PT)
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
 */
function evaluateFormula(formula: string | undefined, params: { W: number, H: number, D: number, [key: string]: number | undefined }): number {
  if (typeof formula !== 'string' || !formula.trim()) {
    return 0; // Or handle as an error, perhaps default to a known parameter if it makes sense
  }
  // Make parameters available in the eval scope. DANGEROUS with real user input.
  // Extract known main dimensions and spread the rest of the template parameters
  const { W, H, D, ...templateParams } = params;
  const evalScope = { W, H, D, ...templateParams };

  try {
    // Extremely simplified and unsafe for general use.
    // A proper library like math.js or a custom parser is needed.
    // Basic check for allowed chars (alphanumeric, math operators, parens, decimal point, space)
    // This regex is still very permissive for an `eval` call.
    if (formula.match(/^[a-zA-Z0-9.+\-*/\s()]*$/)) {
      // Construct the evaluation string by defining variables in the scope
      let evalString = '';
      for (const key in evalScope) {
        if (evalScope[key] !== undefined) {
          evalString += `const ${key} = ${evalScope[key]}; `;
        }
      }
      evalString += formula;
      // eslint-disable-next-line no-eval
      const result = eval(evalString);
      if (typeof result === 'number' && !isNaN(result)) {
        return result;
      }
      console.warn(`Formula "${formula}" evaluated to non-number: ${result}`);
      return 0;
    }
    throw new Error("Invalid characters in formula for backend evaluation.");
  } catch (e) {
    console.error(`Error evaluating formula "${formula}" with params ${JSON.stringify(params)}:`, e);
    return 0; // Or throw error
  }
}


/**
 * Calculates the parts and estimated cost for a given cabinet.
 */
export async function calculateCabinetDetails(
  input: CabinetCalculationInput
): Promise<{ success: boolean; data?: CalculatedCabinet; error?: string }> {

  if (input.width <= 0 || input.height <= 0 || input.depth <= 0) {
    return { success: false, error: 'Dimensions must be positive numbers.' };
  }
  // Relaxing dimension constraints for custom templates, specific checks for hardcoded below
  // if (input.width < 300 || input.width > 1200 || input.height < 500 || input.height > 900 || input.depth < 300 || input.depth > 700) {
  //   return { success: false, error: 'Dimensions are outside typical ranges. Please check values.' };
  // }

  const W = input.width;
  const H = input.height;
  const D = input.depth;

  const parts: CabinetPart[] = [];
  let totalPanelArea_sqmm = 0;
  let totalBackPanelArea_sqmm = 0;
  let totalEdgeBandLength_mm = 0;

  // --- LOGIC FOR CUSTOM TEMPLATES ---
  if (input.customTemplate && input.cabinetType === input.customTemplate.id) {
    const template = input.customTemplate;
    // Combine main dimensions with template-specific parameters
    const formulaParams = {
      W, H, D,
      ...template.parameters // PT, BPT, BPO, DG, DCG, TRD, B, DW, DD, DH, Clearance etc.
    };

    // Ensure PT is available, either from template or a default if not set.
    const currentPanelThickness = template.parameters.PT || PANEL_THICKNESS;
    const currentBackPanelThickness = template.parameters.BPT || BACK_PANEL_THICKNESS;

    for (const partDef of template.parts) {
      const quantity = evaluateFormula(partDef.quantityFormula, formulaParams);
      if (quantity <= 0) continue; // Skip if quantity is zero or less

      const partWidth = evaluateFormula(partDef.widthFormula, formulaParams);
      const partHeight = evaluateFormula(partDef.heightFormula, formulaParams);
      // Use specific thickness formula, or default to global PT or specific BPT if it's a back panel
      let partThickness: number;
      if (partDef.thicknessFormula) {
        partThickness = evaluateFormula(partDef.thicknessFormula, formulaParams);
      } else if (partDef.partType === 'Back Panel' && template.parameters.BPT !== undefined) {
        partThickness = evaluateFormula('BPT', formulaParams);
      } else {
        partThickness = evaluateFormula('PT', formulaParams); // Default to PT
      }
      
      if (partWidth <=0 || partHeight <=0 || partThickness <=0) {
        console.warn(`Skipping part "${partDef.nameLabel}" due to non-positive calculated dimension: W=${partWidth}, H=${partHeight}, T=${partThickness}`);
        continue;
      }

      const material = `${partThickness.toFixed(0)}mm ${partDef.partType === 'Back Panel' ? 'HDF/Plywood' : 'Panel'}`; // Simplified material naming

      let edgeBandingLength = 0;
      const appliedEdges: string[] = [];
      if (partDef.edgeBanding) {
        if (partDef.edgeBanding.front) { edgeBandingLength += partHeight; appliedEdges.push(`Front: ${partHeight.toFixed(0)}mm`); }
        if (partDef.edgeBanding.back) { edgeBandingLength += partHeight; appliedEdges.push(`Back: ${partHeight.toFixed(0)}mm`); }
        if (partDef.edgeBanding.top) { edgeBandingLength += partWidth; appliedEdges.push(`Top: ${partWidth.toFixed(0)}mm`); }
        if (partDef.edgeBanding.bottom) { edgeBandingLength += partWidth; appliedEdges.push(`Bottom: ${partWidth.toFixed(0)}mm`); }
      }
      totalEdgeBandLength_mm += (quantity * edgeBandingLength);

      parts.push({
        name: partDef.nameLabel,
        partType: partDef.partType,
        quantity: quantity,
        width: partWidth,
        height: partHeight,
        thickness: partThickness,
        material: material, // Placeholder, derive from materialId and thickness if DB existed
        notes: partDef.notes || '',
        edgeBanding: appliedEdges.length > 0 ? { front: partDef.edgeBanding?.front ? partHeight : 0, back: partDef.edgeBanding?.back ? partHeight : 0, top: partDef.edgeBanding?.top ? partWidth : 0, bottom: partDef.edgeBanding?.bottom ? partWidth : 0 } : undefined, // Store applied lengths for display
        grainDirection: partDef.grainDirection,
      });

      if (partDef.partType === 'Back Panel') {
        totalBackPanelArea_sqmm += (quantity * partWidth * partHeight);
      } else {
        totalPanelArea_sqmm += (quantity * partWidth * partHeight);
      }
    }
     // Generic accessories for custom templates for now, would ideally come from template.accessories
    const accessories: AccessoryItem[] = [];
    if (template.parts.some(p => p.partType === 'Door' || p.partType === 'Doors')) {
        const doorCount = template.parts.reduce((sum, p) => (p.partType === 'Door' || p.partType === 'Doors') ? sum + evaluateFormula(p.quantityFormula, formulaParams) : sum, 0);
        accessories.push({ id: "HINGE_STD_FO", name: 'Hinges (pair)', quantity: doorCount, unitCost: COST_PER_HINGE * 2, totalCost: COST_PER_HINGE * 2 * doorCount });
        accessories.push({ id: "HANDLE_STD_PULL", name: 'Handles', quantity: doorCount, unitCost: COST_PER_HANDLE, totalCost: COST_PER_HANDLE * doorCount });
    }
    if (template.parts.some(p => p.partType === 'Fixed Shelf' || p.partType === 'Mobile Shelf')) {
        const shelfCount = template.parts.reduce((sum, p) => (p.partType === 'Fixed Shelf' || p.partType === 'Mobile Shelf') ? sum + evaluateFormula(p.quantityFormula, formulaParams) : sum, 0);
        accessories.push({ id: "SHELF_PIN_STD", name: 'Shelf Pins', quantity: shelfCount * 4, unitCost: COST_PER_SHELF_PIN, totalCost: COST_PER_SHELF_PIN * shelfCount * 4 });
    }
     const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);

    const estimatedPanelMaterialCost = totalPanelArea_sqmm * (COST_PER_SQM_PANEL_MM / currentPanelThickness * currentPanelThickness); // Normalized if using varying panel thicknesses
    const estimatedBackPanelMaterialCost = totalBackPanelArea_sqmm * (COST_PER_SQM_BACK_PANEL_MM / currentBackPanelThickness * currentBackPanelThickness); // Normalized
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
  // --- LOGIC FOR HARDCODED 'standard_base_2_door' ---
  else if (input.cabinetType === 'standard_base_2_door') {
    if (input.width < 300 || input.width > 1200 || input.height < 500 || input.height > 900 || input.depth < 300 || input.depth > 700) {
      return { success: false, error: 'Dimensions are outside typical ranges for a standard base cabinet. Please check values (W:300-1200, H:500-900, D:300-700).' };
    }
    // Parameters for formulas for the standard base cabinet
    const params = {
      W, H, D,
      PT: PANEL_THICKNESS, // Uses global default for hardcoded
      BPT: BACK_PANEL_THICKNESS,
      BPO: BACK_PANEL_OFFSET,
      TRD: TOP_RAIL_DEPTH,
      DCG: DOOR_GAP_CENTER,
      DG: DOOR_GAP
    };

    // 1. Side Panels (x2)
    const sidePanelQty = evaluateFormula("2", params);
    const sidePanelWidth = evaluateFormula("D", params);
    const sidePanelHeight = evaluateFormula("H", params);
    const sidePanelThickness = evaluateFormula("PT", params);
    parts.push({
      name: 'Side Panel',
      partType: 'Side Panel',
      quantity: sidePanelQty,
      width: sidePanelWidth,
      height: sidePanelHeight,
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

    // 4. Shelf (x1, simple fixed shelf)
    const shelfQty = evaluateFormula("1", params);
    const shelfWidth = evaluateFormula("W - 2*PT", params);
    const shelfDepth = evaluateFormula("D - BPO - BPT", params);
    const shelfThickness = evaluateFormula("PT", params);
    parts.push({
      name: 'Shelf',
      partType: 'Fixed Shelf',
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

    // 5. Doors (x2)
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
      edgeBanding: { front: singleDoorWidth, back: singleDoorWidth, top: doorHeight, bottom: doorHeight }
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
    
    // --- Accessories for standard_base_2_door ---
    const accessories: AccessoryItem[] = [
        { id: "HINGE_STD_FO", name: 'Hinges (pair)', quantity: 2, unitCost: COST_PER_HINGE * 2, totalCost: COST_PER_HINGE * 2 * 2 },
        { id: "HANDLE_STD_PULL", name: 'Handles', quantity: 2, unitCost: COST_PER_HANDLE, totalCost: COST_PER_HANDLE * 2 },
        { id: "SHELF_PIN_STD", name: 'Shelf Pins', quantity: 4, unitCost: COST_PER_SHELF_PIN, totalCost: COST_PER_SHELF_PIN * 4 },
    ];
    const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);

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
  else {
    // Fallback for other predefined types not yet implemented for full formula calc
    return { success: false, error: `Selected cabinet type '${input.cabinetType}' calculation logic is not fully implemented beyond the hardcoded 'standard_base_2_door' or dynamic custom templates.` };
  }
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
    // Width = Cabinet Width - (4T + 2 × Clearance) -> Note: The problem statement uses "Cabinet Width", not "Drawer Width (DW)" parameter here.
    // This could be ambiguous if cabinetWidth is external overall width or internal opening width.
    // Assuming "Cabinet Width" in the formula context refers to the *internal opening width* for the drawer bank.
    const drawerBackWidth = cabinetWidth - (4 * T + drawerSlideClearanceTotal);
    if (drawerBackWidth <= 0) {
        return { success: false, message: `Calculated drawer back width for drawer ${drawerNumber} is not positive. Check internal cabinet width, panel thickness, and slide clearance.`, calculatedDrawers: [] };
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
    // Width = Cabinet Width - 2mm (Again, assuming Cabinet Width refers to the internal opening width)
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

