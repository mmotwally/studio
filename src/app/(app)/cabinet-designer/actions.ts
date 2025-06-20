
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart, AccessoryItem, CabinetTemplateData, PartDefinition, DrawerSetCalculatorInput, DrawerSetCalculatorResult, CalculatedDrawer, DrawerPartCalculation, CustomFormulaEntry, FormulaDimensionType, AccessoryDefinitionDB, PredefinedAccessory, MaterialDefinitionDB, PredefinedMaterialSimple, TemplateAccessoryEntry, CabinetPartType, CabinetTypeContext } from './types';
import { PREDEFINED_ACCESSORIES, PREDEFINED_MATERIALS } from './types';
import { openDb } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { Database } from 'sqlite';

// --- Configuration Constants (Defaults, can be overridden by template parameters or material definitions) ---
const DEFAULT_PANEL_THICKNESS = 18; // mm -> PT
const DEFAULT_BACK_PANEL_THICKNESS = 3; // mm -> BPT
const DEFAULT_BACK_PANEL_OFFSET = 10; // mm inset from back edge of carcass -> BPO
const DEFAULT_DOOR_GAP = 2; // mm total side/vertical gap for a door -> DG
const DEFAULT_DOOR_GAP_CENTER = 3; // mm gap between two doors -> DCG
const DEFAULT_TOP_RAIL_DEPTH = 80; // mm width of top rails -> TRD

// Material Costs (Fallbacks, will be overridden by MaterialDefinitionDB if available)
const FALLBACK_COST_PER_SQM_PANEL_MM = 25.0 / (1000*1000); 
const FALLBACK_COST_PER_SQM_BACK_PANEL_MM = 10.0 / (1000*1000); 
const FALLBACK_COST_PER_METER_EDGE_BAND = 0.5;


// Helper to build a combined map of predefined and DB-defined accessories
async function getCombinedAccessoryMap(db: Database): Promise<Map<string, {name: string, unitCost: number}>> {
    const combinedMap = new Map<string, {name: string, unitCost: number}>();
    PREDEFINED_ACCESSORIES.forEach(acc => combinedMap.set(acc.id, { name: acc.name, unitCost: acc.unitCost }));
    
    const customAccessories = await getAccessoryDefinitionsAction(db); // Pass db instance
    customAccessories.forEach(acc => combinedMap.set(acc.id, { name: acc.name, unitCost: acc.unitCost }));
    return combinedMap;
}

// Helper to build a combined map of predefined and DB-defined materials
async function getCombinedMaterialMap(db: Database): Promise<Map<string, {name: string, costPerSqm?: number | null, costPerMeter?: number | null, thickness?: number | null }>> {
    const combinedMap = new Map<string, {name: string, costPerSqm?: number | null, costPerMeter?: number | null, thickness?: number | null}>();
    PREDEFINED_MATERIALS.forEach(mat => combinedMap.set(mat.id, { name: mat.name, costPerSqm: mat.costPerSqm, thickness: mat.thickness }));

    const customMaterials = await getMaterialDefinitionsAction(db); // Pass db instance
    customMaterials.forEach(mat => combinedMap.set(mat.id, { name: mat.name, costPerSqm: mat.costPerSqm, costPerMeter: mat.costPerMeter, thickness: mat.thickness }));
    return combinedMap;
}


function evaluateFormula(formula: string | undefined, params: { W: number, H: number, D: number, [key: string]: number | undefined }): number {
  if (typeof formula !== 'string' || !formula.trim()) {
    return 0; 
  }
  const { W, H, D, ...templateParams } = params;
  const evalScope = { W, H, D, ...templateParams };

  try {
    if (formula.match(/^[a-zA-Z0-9.+\-*/\s()_]*$/)) { 
      let evalString = '';
      for (const key in evalScope) {
        if (evalScope[key] !== undefined && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) { 
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
    return 0; 
  }
}


export async function calculateCabinetDetails(
  input: CabinetCalculationInput
): Promise<{ success: boolean; data?: CalculatedCabinet; error?: string }> {

  if (input.width <= 0 || input.height <= 0 || input.depth <= 0) {
    return { success: false, error: 'Dimensions must be positive numbers.' };
  }
  
  const db = await openDb();
  const accessoryDefinitionsMap = await getCombinedAccessoryMap(db);
  const materialDefinitionsMap = await getCombinedMaterialMap(db);
  
  let templateToUse = input.customTemplate;

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
  let totalMaterialCost = 0;
  let totalEdgeBandLength_mm = 0;
  let estimatedEdgeBandCost = 0;
  // Specific panel area tracking for summary, not directly for cost if materials have own costs
  let totalPanelArea_sqmm = 0; 
  let totalBackPanelArea_sqmm = 0;


  if (templateToUse) {
    const template = templateToUse;
    const formulaParams = {
      W, H, D,
      ...template.parameters,
      PT: template.parameters.PT || DEFAULT_PANEL_THICKNESS,
      BPT: template.parameters.BPT || DEFAULT_BACK_PANEL_THICKNESS,
      BPO: template.parameters.BPO || DEFAULT_BACK_PANEL_OFFSET,
    };

    for (const partDef of template.parts) {
      const quantity = evaluateFormula(partDef.quantityFormula, formulaParams);
      if (quantity <= 0) continue; 

      const partWidth = evaluateFormula(partDef.widthFormula, formulaParams);
      const partHeight = evaluateFormula(partDef.heightFormula, formulaParams);
      
      const materialInfo = materialDefinitionsMap.get(partDef.materialId);
      let partThickness: number;

      if (materialInfo?.thickness !== null && materialInfo?.thickness !== undefined) {
          partThickness = materialInfo.thickness;
      } else if (partDef.thicknessFormula) {
          partThickness = evaluateFormula(partDef.thicknessFormula, formulaParams);
      } else if (partDef.partType === 'Back Panel') {
         partThickness = formulaParams.BPT;
      } else {
        partThickness = formulaParams.PT; 
      }
      
      if (partWidth <=0 || partHeight <=0 || partThickness <=0) {
        console.warn(`Skipping part "${partDef.nameLabel}" due to non-positive calculated dimension: W=${partWidth}, H=${partHeight}, T=${partThickness}`);
        continue;
      }

      const materialDisplayName = materialInfo ? `${materialInfo.name} (${partThickness.toFixed(0)}mm)` : `${partThickness.toFixed(0)}mm Panel (Unknown Material ID: ${partDef.materialId})`;
      
      let edgeBandingLengthForPart = 0;
      const appliedEdges: string[] = [];
      if (partDef.edgeBanding) {
        if (partDef.edgeBanding.front) { edgeBandingLengthForPart += partHeight; appliedEdges.push(`Front: ${partHeight.toFixed(0)}mm`); }
        if (partDef.edgeBanding.back) { edgeBandingLengthForPart += partHeight; appliedEdges.push(`Back: ${partHeight.toFixed(0)}mm`); }
        if (partDef.edgeBanding.top) { edgeBandingLengthForPart += partWidth; appliedEdges.push(`Top: ${partWidth.toFixed(0)}mm`); }
        if (partDef.edgeBanding.bottom) { edgeBandingLengthForPart += partWidth; appliedEdges.push(`Bottom: ${partWidth.toFixed(0)}mm`); }
      }
      
      const edgeBandingForThisPartInstance = quantity * edgeBandingLengthForPart;
      totalEdgeBandLength_mm += edgeBandingForThisPartInstance;

      let edgeBandCostForPart = 0;
      if (edgeBandingForThisPartInstance > 0) {
        const edgeBandMaterialInfo = materialDefinitionsMap.get(partDef.edgeBandingMaterialId || '');
        const costPerMeter = edgeBandMaterialInfo?.costPerMeter ?? FALLBACK_COST_PER_METER_EDGE_BAND;
        edgeBandCostForPart = (edgeBandingForThisPartInstance / 1000) * costPerMeter;
      }
      estimatedEdgeBandCost += edgeBandCostForPart;


      parts.push({
        name: partDef.nameLabel,
        partType: partDef.partType,
        quantity: quantity,
        width: partWidth,
        height: partHeight,
        thickness: partThickness,
        material: materialDisplayName, 
        notes: partDef.notes || '',
        edgeBanding: appliedEdges.length > 0 ? { front: partDef.edgeBanding?.front ? partHeight : 0, back: partDef.edgeBanding?.back ? partHeight : 0, top: partDef.edgeBanding?.top ? partWidth : 0, bottom: partDef.edgeBanding?.bottom ? partWidth : 0 } : undefined,
        grainDirection: partDef.grainDirection,
      });

      const partAreaSqMM = partWidth * partHeight;
      const materialCostPerSqMM = (materialInfo?.costPerSqm ?? (partDef.partType === 'Back Panel' ? FALLBACK_COST_PER_SQM_BACK_PANEL_MM * DEFAULT_BACK_PANEL_THICKNESS : FALLBACK_COST_PER_SQM_PANEL_MM * DEFAULT_PANEL_THICKNESS)) / (1000*1000);
      totalMaterialCost += quantity * partAreaSqMM * materialCostPerSqMM;

      if (partDef.partType === 'Back Panel') {
        totalBackPanelArea_sqmm += (quantity * partAreaSqMM);
      } else {
        totalPanelArea_sqmm += (quantity * partAreaSqMM);
      }
    }
    
    const accessories: AccessoryItem[] = [];
    if (template.accessories && Array.isArray(template.accessories)) {
        for (const accEntry of template.accessories) {
            const accQty = Math.round(evaluateFormula(accEntry.quantityFormula, formulaParams));
            if (accQty <= 0) continue;

            const accDefinition = accessoryDefinitionsMap.get(accEntry.accessoryId);
            if (accDefinition) {
                accessories.push({
                    id: accEntry.accessoryId,
                    name: accDefinition.name,
                    quantity: accQty,
                    unitCost: accDefinition.unitCost,
                    totalCost: accQty * accDefinition.unitCost,
                    notes: accEntry.notes,
                });
            } else {
                 accessories.push({
                    id: accEntry.accessoryId,
                    name: accEntry.accessoryId.replace(/_/g, ' ').split('-').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ') + " (Custom/Unknown)",
                    quantity: accQty,
                    unitCost: 0.01, 
                    totalCost: accQty * 0.01,
                    notes: accEntry.notes || "Accessory definition not found.",
                });
            }
        }
    } else {
        // Fallback for older templates or if accessories block is missing
        if (template.parts.some(p => p.partType === 'Door' || p.partType === 'Doors')) {
            const doorCount = template.parts.reduce((sum, p) => (p.partType === 'Door' || p.partType === 'Doors') ? sum + evaluateFormula(p.quantityFormula, formulaParams) : sum, 0);
            const hingeDef = accessoryDefinitionsMap.get("HINGE_STD_FO");
            const handleDef = accessoryDefinitionsMap.get("HANDLE_STD_PULL");
            if(hingeDef) accessories.push({ id: "HINGE_STD_FO", name: hingeDef.name, quantity: doorCount * 2, unitCost: hingeDef.unitCost, totalCost: hingeDef.unitCost * doorCount * 2 });
            if(handleDef) accessories.push({ id: "HANDLE_STD_PULL", name: handleDef.name, quantity: doorCount, unitCost: handleDef.unitCost, totalCost: handleDef.unitCost * doorCount });
        }
        if (template.parts.some(p => p.partType === 'Fixed Shelf' || p.partType === 'Mobile Shelf')) {
            const shelfCount = template.parts.reduce((sum, p) => (p.partType === 'Fixed Shelf' || p.partType === 'Mobile Shelf') ? sum + evaluateFormula(p.quantityFormula, formulaParams) : sum, 0);
            const shelfPinDef = accessoryDefinitionsMap.get("SHELF_PIN_STD");
            if(shelfPinDef) accessories.push({ id: "SHELF_PIN_STD", name: shelfPinDef.name, quantity: shelfCount * 4, unitCost: shelfPinDef.unitCost, totalCost: shelfPinDef.unitCost * shelfCount * 4 });
        }
    }

    const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);
    // estimatedEdgeBandCost is now calculated per part and summed up
    const estimatedTotalCost = totalMaterialCost + estimatedEdgeBandCost + totalAccessoryCost;

    const calculatedCabinet: CalculatedCabinet = {
      parts,
      accessories,
      estimatedMaterialCost: parseFloat(totalMaterialCost.toFixed(2)),
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
    const params = { W, H, D, PT: DEFAULT_PANEL_THICKNESS, BPT: DEFAULT_BACK_PANEL_THICKNESS, BPO: DEFAULT_BACK_PANEL_OFFSET, TRD: DEFAULT_TOP_RAIL_DEPTH, DCG: DEFAULT_DOOR_GAP_CENTER, DG: DEFAULT_DOOR_GAP };
    const currentPanelThickness = params.PT;
    const currentBackPanelThickness = params.BPT;

    // Side Panels
    const sidePanelQty = 2;
    const sidePanelWidth = params.D;
    const sidePanelHeight = params.H;
    parts.push({ name: 'Side Panel', partType: 'Side Panel', quantity: sidePanelQty, width: sidePanelWidth, height: sidePanelHeight, thickness: currentPanelThickness, material: `${currentPanelThickness}mm Panel`, edgeBanding: { front: sidePanelHeight }});
    totalPanelArea_sqmm += sidePanelQty * sidePanelWidth * sidePanelHeight;
    totalEdgeBandLength_mm += sidePanelQty * sidePanelHeight;

    // Bottom Panel
    const bottomPanelQty = 1;
    const bottomPanelWidth = params.W - 2 * currentPanelThickness;
    const bottomPanelDepth = params.D;
    parts.push({ name: 'Bottom Panel', partType: 'Bottom Panel', quantity: bottomPanelQty, width: bottomPanelWidth, height: bottomPanelDepth, thickness: currentPanelThickness, material: `${currentPanelThickness}mm Panel`, edgeBanding: { front: bottomPanelWidth }});
    totalPanelArea_sqmm += bottomPanelQty * bottomPanelWidth * bottomPanelDepth;
    totalEdgeBandLength_mm += bottomPanelQty * bottomPanelWidth;

    // Top Rails
    const topRailQty = 1; // Per front/back
    const topRailLength = params.W - 2 * currentPanelThickness;
    const topRailDepthVal = params.TRD;
    parts.push({ name: 'Top Rail (Front)', partType: 'Top Rail (Front)', quantity: topRailQty, width: topRailLength, height: topRailDepthVal, thickness: currentPanelThickness, material: `${currentPanelThickness}mm Panel`});
    totalPanelArea_sqmm += topRailQty * topRailLength * topRailDepthVal;
    parts.push({ name: 'Top Rail (Back)', partType: 'Top Rail (Back)', quantity: topRailQty, width: topRailLength, height: topRailDepthVal, thickness: currentPanelThickness, material: `${currentPanelThickness}mm Panel`});
    totalPanelArea_sqmm += topRailQty * topRailLength * topRailDepthVal;
    
    // Shelf
    const shelfQty = 1;
    const shelfWidth = params.W - 2*currentPanelThickness;
    const shelfDepth = params.D - params.BPO - currentBackPanelThickness;
    parts.push({ name: 'Shelf', partType: 'Fixed Shelf', quantity: shelfQty, width: shelfWidth, height: shelfDepth, thickness: currentPanelThickness, material: `${currentPanelThickness}mm Panel`, notes: 'Adjust depth if back panel fitting differs', edgeBanding: { front: shelfWidth }});
    totalPanelArea_sqmm += shelfQty * shelfWidth * shelfDepth;
    totalEdgeBandLength_mm += shelfQty * shelfWidth;

    // Doors
    const doorQty = 2;
    const doorHeight = params.H - params.DG;
    const singleDoorWidth = (params.W - params.DG - params.DCG) / 2;
    parts.push({ name: 'Door', partType: 'Door', quantity: doorQty, width: singleDoorWidth, height: doorHeight, thickness: currentPanelThickness, material: `${currentPanelThickness}mm Panel (Door Grade)`, edgeBanding: { front: singleDoorWidth, back: singleDoorWidth, top: doorHeight, bottom: doorHeight } });
    totalPanelArea_sqmm += doorQty * singleDoorWidth * doorHeight;
    totalEdgeBandLength_mm += doorQty * (singleDoorWidth*2 + doorHeight*2);

    // Back Panel
    const backPanelQty = 1;
    const backPanelWidth = params.W - 2*currentPanelThickness - 2; // Slightly smaller for fit
    const backPanelHeight = params.H - 2*currentPanelThickness - 2; // Slightly smaller for fit
    parts.push({ name: 'Back Panel', partType: 'Back Panel', quantity: backPanelQty, width: backPanelWidth, height: backPanelHeight, thickness: currentBackPanelThickness, material: `${currentBackPanelThickness}mm HDF/Plywood`, notes: `Fits into a groove or is offset by ${params.BPO}mm`});
    totalBackPanelArea_sqmm += (backPanelQty * backPanelWidth * backPanelHeight);

    const accessoriesStd: AccessoryItem[] = [];
    const hingeDef = accessoryDefinitionsMap.get("HINGE_STD_FO");
    const handleDef = accessoryDefinitionsMap.get("HANDLE_STD_PULL");
    const shelfPinDef = accessoryDefinitionsMap.get("SHELF_PIN_STD");
    if(hingeDef) accessoriesStd.push({ id: "HINGE_STD_FO", name: hingeDef.name, quantity: 4, unitCost: hingeDef.unitCost, totalCost: hingeDef.unitCost * 4 }); // 2 per door
    if(handleDef) accessoriesStd.push({ id: "HANDLE_STD_PULL", name: handleDef.name, quantity: 2, unitCost: handleDef.unitCost, totalCost: handleDef.unitCost * 2 });
    if(shelfPinDef) accessoriesStd.push({ id: "SHELF_PIN_STD", name: shelfPinDef.name, quantity: 4, unitCost: shelfPinDef.unitCost, totalCost: shelfPinDef.unitCost * 4 });
    
    const totalAccessoryCostStd = accessoriesStd.reduce((sum, acc) => sum + acc.totalCost, 0);
    const estimatedPanelMaterialCostStd = totalPanelArea_sqmm * FALLBACK_COST_PER_SQM_PANEL_MM;
    const estimatedBackPanelMaterialCostStd = totalBackPanelArea_sqmm * FALLBACK_COST_PER_SQM_BACK_PANEL_MM;
    const estimatedEdgeBandCostStd = (totalEdgeBandLength_mm / 1000) * FALLBACK_COST_PER_METER_EDGE_BAND; // Hardcoded uses fallback for edge banding
    const estimatedMaterialCostStd = estimatedPanelMaterialCostStd + estimatedBackPanelMaterialCostStd; // Edge band cost is separate from material for this fallback
    const estimatedTotalCostStd = estimatedMaterialCostStd + estimatedEdgeBandCostStd + totalAccessoryCostStd;

    return { success: true, data: { parts, accessories: accessoriesStd, estimatedMaterialCost: parseFloat(estimatedMaterialCostStd.toFixed(2)), estimatedAccessoryCost: parseFloat(totalAccessoryCostStd.toFixed(2)), estimatedTotalCost: parseFloat(estimatedTotalCostStd.toFixed(2)), totalPanelAreaMM: totalPanelArea_sqmm, totalBackPanelAreaMM: totalBackPanelArea_sqmm }};

  }
  else {
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
      templateData.createdAt || now, 
      now 
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
      createdAt: row.createdAt,
      lastUpdated: row.lastUpdated,
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
      createdAt: row.createdAt,
      lastUpdated: row.lastUpdated,
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


// --- Custom Formula Database Actions ---

export async function saveCustomFormulaAction(
  name: string,
  formulaString: string,
  dimensionType: FormulaDimensionType,
  description?: string,
  partType?: CabinetPartType | null,
  context?: CabinetTypeContext | null,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = await openDb();
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO custom_formulas (id, name, formula_string, dimension_type, description, part_type, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      name,
      formulaString,
      dimensionType,
      description || null,
      partType || null,
      context || null,
      createdAt
    );
    revalidatePath('/cabinet-designer'); 
    return { success: true, id: id };
  } catch (error) {
    console.error("Failed to save custom formula:", error);
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return { success: false, error: `A custom formula with a similar unique property already exists.` };
    }
    return { success: false, error: (error as Error).message };
  }
}

export async function getCustomFormulasAction(): Promise<CustomFormulaEntry[]> {
  const db = await openDb();
  try {
    const rows = await db.all<any[]>("SELECT id, name, formula_string, dimension_type, description, part_type, context, created_at FROM custom_formulas ORDER BY name ASC");
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      formulaString: row.formula_string,
      dimensionType: row.dimension_type as FormulaDimensionType,
      description: row.description,
      partType: row.part_type,
      context: row.context,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Failed to get custom formulas:", error);
    return [];
  }
}

export async function deleteCustomFormulaAction(id: string): Promise<{ success: boolean; error?: string }> {
  const db = await openDb();
  try {
    const result = await db.run("DELETE FROM custom_formulas WHERE id = ?", id);
    if (result.changes === 0) {
      return { success: false, error: `Custom formula with ID ${id} not found.` };
    }
    revalidatePath('/cabinet-designer');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete custom formula:", error);
    return { success: false, error: (error as Error).message };
  }
}

// --- Material Definition Actions ---
export async function saveMaterialDefinitionAction(
  data: Omit<MaterialDefinitionDB, 'id' | 'createdAt' | 'lastUpdated'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = await openDb();
  try {
    const now = new Date().toISOString();
    const id = data.id || crypto.randomUUID();

    await db.run(
      `INSERT INTO material_definitions (id, name, type, costPerSqm, costPerMeter, thickness, defaultSheetWidth, defaultSheetHeight, hasGrain, notes, createdAt, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         costPerSqm = excluded.costPerSqm,
         costPerMeter = excluded.costPerMeter,
         thickness = excluded.thickness,
         defaultSheetWidth = excluded.defaultSheetWidth,
         defaultSheetHeight = excluded.defaultSheetHeight,
         hasGrain = excluded.hasGrain,
         notes = excluded.notes,
         lastUpdated = excluded.lastUpdated`,
      id, data.name, data.type, data.costPerSqm, data.costPerMeter, data.thickness, data.defaultSheetWidth, data.defaultSheetHeight, data.hasGrain ? 1 : 0, data.notes,
      data.id ? undefined : now, // Only set createdAt if it's a new record
      now
    );
    revalidatePath('/cabinet-designer'); // Or specific settings page
    return { success: true, id: id };
  } catch (error) {
    console.error("Failed to save material definition:", error);
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: material_definitions.name")) {
       return { success: false, error: `A material definition with the name "${data.name}" already exists.` };
    }
    return { success: false, error: (error as Error).message };
  }
}

export async function getMaterialDefinitionsAction(dbInstance?: Database): Promise<MaterialDefinitionDB[]> {
  const db = dbInstance || await openDb();
  try {
    const rows = await db.all<any[]>("SELECT * FROM material_definitions ORDER BY name ASC");
    return rows.map(row => ({
      ...row,
      hasGrain: Boolean(row.hasGrain),
    }));
  } catch (error) {
    console.error("Failed to get material definitions:", error);
    return [];
  }
}

// --- Accessory Definition Actions ---
export async function saveAccessoryDefinitionAction(
  data: Omit<AccessoryDefinitionDB, 'id' | 'createdAt' | 'lastUpdated'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = await openDb();
  try {
    const now = new Date().toISOString();
    const id = data.id || crypto.randomUUID();

    await db.run(
      `INSERT INTO accessory_definitions (id, name, type, unitCost, description, supplierId, sku, createdAt, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         unitCost = excluded.unitCost,
         description = excluded.description,
         supplierId = excluded.supplierId,
         sku = excluded.sku,
         lastUpdated = excluded.lastUpdated`,
      id, data.name, data.type, data.unitCost, data.description, data.supplierId, data.sku,
      data.id ? undefined : now,
      now
    );
    revalidatePath('/cabinet-designer'); // Or specific settings page
    return { success: true, id: id };
  } catch (error) {
    console.error("Failed to save accessory definition:", error);
     if (error instanceof Error && error.message.includes("UNIQUE constraint failed: accessory_definitions.name")) {
       return { success: false, error: `An accessory definition with the name "${data.name}" already exists.` };
    }
    return { success: false, error: (error as Error).message };
  }
}

export async function getAccessoryDefinitionsAction(dbInstance?: Database): Promise<AccessoryDefinitionDB[]> {
  const db = dbInstance || await openDb();
  try {
    const rows = await db.all<any[]>("SELECT * FROM accessory_definitions ORDER BY name ASC");
    return rows;
  } catch (error) {
    console.error("Failed to get accessory definitions:", error);
    return [];
  }
}
