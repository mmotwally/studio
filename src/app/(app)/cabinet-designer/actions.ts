
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart, AccessoryItem, CabinetTemplateData, PartDefinition, DrawerSetCalculatorInput, DrawerSetCalculatorResult, CalculatedDrawer, DrawerPartCalculation } from './types';
import { openDb } from '@/lib/database';
import { revalidatePath } from 'next/cache';

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
  
  let templateToUse = input.customTemplate;

  // If customTemplate is not directly provided, but cabinetType refers to a DB template ID, try to load it.
  if (!templateToUse && input.cabinetType && input.cabinetType !== 'standard_base_2_door') {
    const dbTemplate = await getCabinetTemplateByIdAction(input.cabinetType);
    if (dbTemplate) {
      templateToUse = dbTemplate;
    }
  }


  const W = input.width;
  const H = input.height;
  const D = input.depth;

  const parts: CabinetPart[] = [];
  let totalPanelArea_sqmm = 0;
  let totalBackPanelArea_sqmm = 0;
  let totalEdgeBandLength_mm = 0;

  // --- LOGIC FOR CUSTOM TEMPLATES (from input or DB) ---
  if (templateToUse) {
    const template = templateToUse;
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
      
      let partThickness: number;
      if (partDef.thicknessFormula) {
        partThickness = evaluateFormula(partDef.thicknessFormula, formulaParams);
      } else if (partDef.partType === 'Back Panel' && template.parameters.BPT !== undefined) {
         partThickness = evaluateFormula('BPT', formulaParams);
      } else {
        partThickness = evaluateFormula('PT', formulaParams); 
      }
      
      if (partWidth <=0 || partHeight <=0 || partThickness <=0) {
        console.warn(`Skipping part "${partDef.nameLabel}" due to non-positive calculated dimension: W=${partWidth}, H=${partHeight}, T=${partThickness}`);
        continue;
      }

      const material = `${partThickness.toFixed(0)}mm ${partDef.partType === 'Back Panel' ? 'HDF/Plywood' : 'Panel'}`; 

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
        material: material, 
        notes: partDef.notes || '',
        edgeBanding: appliedEdges.length > 0 ? { front: partDef.edgeBanding?.front ? partHeight : 0, back: partDef.edgeBanding?.back ? partHeight : 0, top: partDef.edgeBanding?.top ? partWidth : 0, bottom: partDef.edgeBanding?.bottom ? partWidth : 0 } : undefined,
        grainDirection: partDef.grainDirection,
      });

      if (partDef.partType === 'Back Panel') {
        totalBackPanelArea_sqmm += (quantity * partWidth * partHeight);
      } else {
        totalPanelArea_sqmm += (quantity * partWidth * partHeight);
      }
    }
    
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
    // Add accessories defined in template.accessories
    if (template.accessories && Array.isArray(template.accessories)) {
        for (const accDef of template.accessories) {
            const accQty = evaluateFormula(accDef.quantityFormula, formulaParams);
            // Placeholder for fetching accessory definition from DB by accDef.accessoryId
            const accUnitCost = 2.0; // Example, replace with actual cost
            accessories.push({
                id: accDef.accessoryId,
                name: accDef.accessoryId.replace(/_/g, ' ').split('-').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' '), // Placeholder name
                quantity: accQty,
                unitCost: accUnitCost,
                totalCost: accQty * accUnitCost,
            });
        }
    }

    const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);
    const estimatedPanelMaterialCost = totalPanelArea_sqmm * (COST_PER_SQM_PANEL_MM / currentPanelThickness * currentPanelThickness); 
    const estimatedBackPanelMaterialCost = totalBackPanelArea_sqmm * (COST_PER_SQM_BACK_PANEL_MM / currentBackPanelThickness * currentBackPanelThickness); 
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
    const params = {
      W, H, D,
      PT: PANEL_THICKNESS, 
      BPT: BACK_PANEL_THICKNESS,
      BPO: BACK_PANEL_OFFSET,
      TRD: TOP_RAIL_DEPTH,
      DCG: DOOR_GAP_CENTER,
      DG: DOOR_GAP
    };

    const sidePanelQty = evaluateFormula("2", params);
    const sidePanelWidth = evaluateFormula("D", params);
    const sidePanelHeight = evaluateFormula("H", params);
    const sidePanelThickness = evaluateFormula("PT", params);
    parts.push({
      name: 'Side Panel', partType: 'Side Panel', quantity: sidePanelQty, width: sidePanelWidth, height: sidePanelHeight, thickness: sidePanelThickness,
      material: `${sidePanelThickness}mm Panel`, edgeBanding: { front: sidePanelHeight }
    });
    totalPanelArea_sqmm += (sidePanelQty * sidePanelWidth * sidePanelHeight);
    totalEdgeBandLength_mm += sidePanelQty * sidePanelHeight;

    const bottomPanelQty = evaluateFormula("1", params);
    const bottomPanelWidth = evaluateFormula("W - 2*PT", params);
    const bottomPanelDepth = evaluateFormula("D", params);
    const bottomPanelThickness = evaluateFormula("PT", params);
    parts.push({
      name: 'Bottom Panel', partType: 'Bottom Panel', quantity: bottomPanelQty, width: bottomPanelWidth, height: bottomPanelDepth, thickness: bottomPanelThickness,
      material: `${bottomPanelThickness}mm Panel`, edgeBanding: { front: bottomPanelWidth }
    });
    totalPanelArea_sqmm += (bottomPanelQty * bottomPanelWidth * bottomPanelDepth);
    totalEdgeBandLength_mm += bottomPanelQty * bottomPanelWidth;

    const topRailQty = evaluateFormula("1", params);
    const topRailLength = evaluateFormula("W - 2*PT", params);
    const topRailDepthVal = evaluateFormula("TRD", params);
    const topRailThickness = evaluateFormula("PT", params);
    parts.push({ name: 'Top Rail (Front)', partType: 'Top Rail (Front)', quantity: topRailQty, width: topRailLength, height: topRailDepthVal, thickness: topRailThickness, material: `${topRailThickness}mm Panel`});
    totalPanelArea_sqmm += (topRailQty * topRailLength * topRailDepthVal);
    parts.push({ name: 'Top Rail (Back)', partType: 'Top Rail (Back)', quantity: topRailQty, width: topRailLength, height: topRailDepthVal, thickness: topRailThickness, material: `${topRailThickness}mm Panel`});
    totalPanelArea_sqmm += (topRailQty * topRailLength * topRailDepthVal);

    const shelfQty = evaluateFormula("1", params);
    const shelfWidth = evaluateFormula("W - 2*PT", params);
    const shelfDepth = evaluateFormula("D - BPO - BPT", params);
    const shelfThickness = evaluateFormula("PT", params);
    parts.push({
      name: 'Shelf', partType: 'Fixed Shelf', quantity: shelfQty, width: shelfWidth, height: shelfDepth, thickness: shelfThickness,
      material: `${shelfThickness}mm Panel`, notes: 'Adjust depth if back panel fitting differs', edgeBanding: { front: shelfWidth }
    });
    totalPanelArea_sqmm += (shelfQty * shelfWidth * shelfDepth);
    totalEdgeBandLength_mm += shelfQty * shelfWidth;

    const doorQty = evaluateFormula("2", params);
    const doorHeight = evaluateFormula("H - DG", params);
    const singleDoorWidth = evaluateFormula("(W - DG - DCG) / 2", params);
    const doorThickness = evaluateFormula("PT", params);
    parts.push({
      name: 'Door', partType: 'Door', quantity: doorQty, width: singleDoorWidth, height: doorHeight, thickness: doorThickness,
      material: `${doorThickness}mm Panel (Door Grade)`, edgeBanding: { front: singleDoorWidth, back: singleDoorWidth, top: doorHeight, bottom: doorHeight }
    });
    totalPanelArea_sqmm += (doorQty * singleDoorWidth * doorHeight);
    totalEdgeBandLength_mm += doorQty * (singleDoorWidth * 2 + doorHeight * 2);

    const backPanelQty = evaluateFormula("1", params);
    const backPanelWidth = evaluateFormula("W - 2*PT - 2", params); // Slightly smaller for fit
    const backPanelHeight = evaluateFormula("H - 2*PT - 2", params); // Slightly smaller for fit
    const backPanelActualThickness = evaluateFormula("BPT", params);
    parts.push({
      name: 'Back Panel', partType: 'Back Panel', quantity: backPanelQty, width: backPanelWidth, height: backPanelHeight, thickness: backPanelActualThickness,
      material: `${backPanelActualThickness}mm HDF/Plywood`, notes: `Fits into a groove or is offset by ${BACK_PANEL_OFFSET}mm`
    });
    totalBackPanelArea_sqmm += (backPanelQty * backPanelWidth * backPanelHeight);
    
    const accessoriesStd: AccessoryItem[] = [
        { id: "HINGE_STD_FO", name: 'Hinges (pair)', quantity: 2, unitCost: COST_PER_HINGE * 2, totalCost: COST_PER_HINGE * 2 * 2 },
        { id: "HANDLE_STD_PULL", name: 'Handles', quantity: 2, unitCost: COST_PER_HANDLE, totalCost: COST_PER_HANDLE * 2 },
        { id: "SHELF_PIN_STD", name: 'Shelf Pins', quantity: 4, unitCost: COST_PER_SHELF_PIN, totalCost: COST_PER_SHELF_PIN * 4 },
    ];
    const totalAccessoryCostStd = accessoriesStd.reduce((sum, acc) => sum + acc.totalCost, 0);

    const estimatedPanelMaterialCostStd = totalPanelArea_sqmm * COST_PER_SQM_PANEL_MM;
    const estimatedBackPanelMaterialCostStd = totalBackPanelArea_sqmm * COST_PER_SQM_BACK_PANEL_MM;
    const estimatedEdgeBandCostStd = (totalEdgeBandLength_mm / 1000) * COST_PER_METER_EDGE_BAND;

    const estimatedMaterialCostStd = estimatedPanelMaterialCostStd + estimatedBackPanelMaterialCostStd + estimatedEdgeBandCostStd;
    const estimatedTotalCostStd = estimatedMaterialCostStd + totalAccessoryCostStd;

    const calculatedCabinetStd: CalculatedCabinet = {
        parts, accessories: accessoriesStd, estimatedMaterialCost: parseFloat(estimatedMaterialCostStd.toFixed(2)),
        estimatedAccessoryCost: parseFloat(totalAccessoryCostStd.toFixed(2)), estimatedTotalCost: parseFloat(estimatedTotalCostStd.toFixed(2)),
        totalPanelAreaMM: totalPanelArea_sqmm, totalBackPanelAreaMM: totalBackPanelArea_sqmm,
    };
    return { success: true, data: calculatedCabinetStd };
  }
  else {
    // Fallback for other predefined types not yet implemented for full formula calc or DB lookup
    return { success: false, error: `Selected cabinet type '${input.cabinetType}' calculation logic is not yet implemented beyond hardcoded or dynamic custom templates.` };
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
    drawerBoxSideHeight, 
    customDrawerFrontHeights,
  } = input;

  if (numDrawers <= 0) {
    return { success: false, message: "Number of drawers must be greater than 0.", calculatedDrawers: [] };
  }
  if (cabinetInternalHeight <= 0 || cabinetWidth <= 0 || T <= 0 || drawerBoxSideDepth <= 0 || drawerBoxSideHeight <= 0) {
    return { success: false, message: "All dimensions and thicknesses must be positive values.", calculatedDrawers: [] };
  }
   if (drawerBoxSideHeight < 70) { 
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

    if (currentDrawerFrontHeight <= 30) { 
        return { success: false, message: `Drawer ${drawerNumber} front height (${currentDrawerFrontHeight.toFixed(1)}mm) is too small. Must allow for box construction.`, calculatedDrawers: [] };
    }

    const sidePanel: DrawerPartCalculation = {
      name: "Drawer Box Side", quantity: 2, width: drawerBoxSideDepth, 
      height: drawerBoxSideHeight, thickness: T,
    };

    const drawerBackWidth = cabinetWidth - (4 * T + drawerSlideClearanceTotal);
    if (drawerBackWidth <= 0) {
        return { success: false, message: `Calculated drawer back width for drawer ${drawerNumber} is not positive. Check internal cabinet width, panel thickness, and slide clearance.`, calculatedDrawers: [] };
    }
    
    const drawerBackHeight = drawerBoxSideHeight - 30;
     if (drawerBackHeight <= 0) {
        return { success: false, message: `Calculated drawer back height for drawer ${drawerNumber} (Box Side Height - 30mm) is not positive.`, calculatedDrawers: [] };
    }
    const backPanel: DrawerPartCalculation = {
      name: "Drawer Box Back", quantity: 1, width: drawerBackWidth,
      height: drawerBackHeight, thickness: T,
    };
    
    const drawerBottomWidth = drawerBackWidth + 14;
    const drawerBottomDepth = drawerBoxSideDepth;
    const bottomPanel: DrawerPartCalculation = {
      name: "Drawer Box Bottom", quantity: 1, width: drawerBottomWidth,
      height: drawerBottomDepth, thickness: T, notes: "Thickness could be less than T (e.g., 6mm)"
    };

    const drawerFrontPanelWidth = cabinetWidth - 2;
    if (drawerFrontPanelWidth <= 0) {
        return { success: false, message: `Calculated drawer front panel width for drawer ${drawerNumber} is not positive.`, calculatedDrawers: [] };
    }
    const frontPanel: DrawerPartCalculation = {
      name: "Drawer Front Panel", quantity: 1, width: drawerFrontPanelWidth,
      height: currentDrawerFrontHeight, thickness: T,
    };

    calculatedDrawers.push({
      drawerNumber, overallFrontHeight: currentDrawerFrontHeight,
      boxHeight: drawerBoxSideHeight, 
      parts: [sidePanel, backPanel, bottomPanel, frontPanel],
    });
  }

  return {
    success: true, calculatedDrawers,
    totalFrontsHeightWithReveals: drawerFrontHeights.reduce((sum, h) => sum + h, 0) + totalRevealSpace,
    cabinetInternalHeight: cabinetInternalHeight, message: "Drawer set calculated successfully."
  };
}

// --- Cabinet Template Database Actions ---

export async function saveCabinetTemplateAction(
  templateData: CabinetTemplateData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = await openDb();
  try {
    const now = new Date().toISOString();
    // If templateData.id is already set (e.g., from client-side generation or editing existing), use it.
    // Otherwise, generate a new one (though client should ideally always provide one for new templates too).
    const id = templateData.id || crypto.randomUUID();

    await db.run(
      `INSERT INTO cabinet_templates (id, name, type, previewImage, defaultDimensions, parameters, parts, accessories, createdAt, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         previewImage = excluded.previewImage,
         defaultDimensions = excluded.defaultDimensions,
         parameters = excluded.parameters,
         parts = excluded.parts,
         accessories = excluded.accessories,
         lastUpdated = excluded.lastUpdated`,
      id,
      templateData.name,
      templateData.type,
      templateData.previewImage || null,
      JSON.stringify(templateData.defaultDimensions),
      JSON.stringify(templateData.parameters),
      JSON.stringify(templateData.parts),
      templateData.accessories ? JSON.stringify(templateData.accessories) : null,
      now, // createdAt - only set on initial insert by table default or explicit insert logic
      now  // lastUpdated
    );
    revalidatePath('/cabinet-designer');
    return { success: true, id: id };
  } catch (error) {
    console.error("Failed to save cabinet template:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getCabinetTemplatesAction(): Promise<CabinetTemplateData[]> {
  const db = await openDb();
  try {
    const rows = await db.all<any[]>("SELECT * FROM cabinet_templates ORDER BY name ASC");
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      previewImage: row.previewImage,
      defaultDimensions: JSON.parse(row.defaultDimensions),
      parameters: JSON.parse(row.parameters),
      parts: JSON.parse(row.parts),
      accessories: row.accessories ? JSON.parse(row.accessories) : [],
    }));
  } catch (error) {
    console.error("Failed to get cabinet templates:", error);
    return [];
  }
}


export async function getCabinetTemplateByIdAction(templateId: string): Promise<CabinetTemplateData | null> {
  const db = await openDb();
  try {
    const row = await db.get<any>("SELECT * FROM cabinet_templates WHERE id = ?", templateId);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      previewImage: row.previewImage,
      defaultDimensions: JSON.parse(row.defaultDimensions),
      parameters: JSON.parse(row.parameters),
      parts: JSON.parse(row.parts),
      accessories: row.accessories ? JSON.parse(row.accessories) : [],
    };
  } catch (error) {
    console.error(`Failed to get cabinet template ${templateId}:`, error);
    return null;
  }
}

export async function deleteCabinetTemplateAction(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await openDb();
  try {
    await db.run("DELETE FROM cabinet_templates WHERE id = ?", templateId);
    revalidatePath('/cabinet-designer');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete cabinet template:", error);
    return { success: false, error: (error as Error).message };
  }
}

