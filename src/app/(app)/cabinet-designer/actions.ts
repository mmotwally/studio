
'use server';

import type { CalculatedCabinet, CabinetCalculationInput, CabinetPart } from './types';

// --- Configuration Constants (would ideally come from database/settings) ---
const PANEL_THICKNESS = 18; // mm
const BACK_PANEL_THICKNESS = 3; // mm
const BACK_PANEL_OFFSET = 10; // mm inset from back edge of carcass
const DOOR_GAP_SIDE = 2; // mm total side gap for a door (e.g., 1mm each side)
const DOOR_GAP_VERTICAL = 2; // mm total top/bottom gap for a door
const DOOR_GAP_CENTER = 3; // mm gap between two doors
const TOP_RAIL_DEPTH = 80; // mm width of top rails

// Material Costs (placeholders, would come from a database)
const COST_PER_SQM_PANEL = 25.0; // e.g., $25 per square meter for 18mm MDF/Plywood
const COST_PER_SQM_BACK_PANEL = 10.0; // e.g., $10 per square meter for 3mm HDF
const COST_PER_HINGE = 1.5;
const COST_PER_HANDLE = 3.0;
const COST_PER_SHELF_PIN = 0.1;

/**
 * Calculates the parts and estimated cost for a given cabinet.
 * Currently supports only a "standard_base_2_door" type with hardcoded logic.
 */
export async function calculateCabinetDetails(
  input: CabinetCalculationInput
): Promise<{ success: boolean; data?: CalculatedCabinet; error?: string }> {
  
  if (input.cabinetType !== 'standard_base_2_door') {
    return { success: false, error: 'Selected cabinet type is not supported by this prototype.' };
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
  const PT = PANEL_THICKNESS;

  const parts: CabinetPart[] = [];
  let totalPanelArea_sqm = 0;
  let totalBackPanelArea_sqm = 0;

  // --- Parametric Calculation Logic for "Standard Base Cabinet - 2 Door" ---

  // 1. Side Panels (x2)
  parts.push({
    name: 'Side Panel',
    quantity: 2,
    width: D, // Grain direction typically along depth for sides
    height: H,
    thickness: PT,
    material: `${PT}mm Panel`,
  });
  totalPanelArea_sqm += (2 * D * H) / (1000 * 1000);

  // 2. Bottom Panel (x1)
  const bottomPanelWidth = W - 2 * PT;
  parts.push({
    name: 'Bottom Panel',
    quantity: 1,
    width: bottomPanelWidth,
    height: D, // Grain direction typically along depth
    thickness: PT,
    material: `${PT}mm Panel`,
  });
  totalPanelArea_sqm += (bottomPanelWidth * D) / (1000 * 1000);

  // 3. Top Rails (Front & Back, x2 total)
  const topRailLength = W - 2 * PT;
  parts.push({
    name: 'Top Rail (Front)',
    quantity: 1,
    width: topRailLength, // Length of the rail
    height: TOP_RAIL_DEPTH,  // Depth/width of the rail material
    thickness: PT,
    material: `${PT}mm Panel`,
  });
  totalPanelArea_sqm += (topRailLength * TOP_RAIL_DEPTH) / (1000 * 1000);
  parts.push({
    name: 'Top Rail (Back)',
    quantity: 1,
    width: topRailLength,
    height: TOP_RAIL_DEPTH,
    thickness: PT,
    material: `${PT}mm Panel`,
  });
  totalPanelArea_sqm += (topRailLength * TOP_RAIL_DEPTH) / (1000 * 1000);
  
  // 4. Shelf (x1, simple fixed shelf for this example)
  const shelfWidth = W - 2 * PT;
  const shelfDepth = D - BACK_PANEL_OFFSET - BACK_PANEL_THICKNESS; // Shelf stops short of back panel
  parts.push({
    name: 'Shelf',
    quantity: 1,
    width: shelfWidth,
    height: shelfDepth,
    thickness: PT,
    material: `${PT}mm Panel`,
    notes: 'Adjust depth if back panel fitting differs',
  });
  totalPanelArea_sqm += (shelfWidth * shelfDepth) / (1000 * 1000);

  // 5. Doors (x2) - Full overlay assumption
  const doorHeight = H - DOOR_GAP_VERTICAL;
  const singleDoorWidth = (W - (DOOR_GAP_SIDE * 2) - DOOR_GAP_CENTER) / 2; // Total side gaps + center gap
  parts.push({
    name: 'Door',
    quantity: 2,
    width: singleDoorWidth,
    height: doorHeight,
    thickness: PT,
    material: `${PT}mm Panel (Door Grade)`,
  });
  totalPanelArea_sqm += (2 * singleDoorWidth * doorHeight) / (1000 * 1000);

  // 6. Back Panel (x1)
  // Assumes back panel fits inside the carcass, recessed.
  const backPanelWidth = W - 2 * PT - (2 *1); // Small tolerance for fitting
  const backPanelHeight = H - 2 * PT - (2*1); // Small tolerance
  parts.push({
    name: 'Back Panel',
    quantity: 1,
    width: backPanelWidth,
    height: backPanelHeight,
    thickness: BACK_PANEL_THICKNESS,
    material: `${BACK_PANEL_THICKNESS}mm HDF/Plywood`,
    notes: `Fits into a groove or is offset by ${BACK_PANEL_OFFSET}mm`
  });
  totalBackPanelArea_sqm += (backPanelWidth * backPanelHeight) / (1000 * 1000);

  // --- Accessories ---
  const accessories = [
    { name: 'Hinges (pair)', quantity: 2, unitCost: COST_PER_HINGE * 2, totalCost: COST_PER_HINGE * 2 * 2 }, // 2 pairs = 4 hinges
    { name: 'Handles', quantity: 2, unitCost: COST_PER_HANDLE, totalCost: COST_PER_HANDLE * 2 },
    { name: 'Shelf Pins', quantity: 4, unitCost: COST_PER_SHELF_PIN, totalCost: COST_PER_SHELF_PIN * 4 },
  ];
  const totalAccessoryCost = accessories.reduce((sum, acc) => sum + acc.totalCost, 0);

  // --- Cost Estimation ---
  const estimatedMaterialCost = (totalPanelArea_sqm * COST_PER_SQM_PANEL) + 
                                (totalBackPanelArea_sqm * COST_PER_SQM_BACK_PANEL);
  const estimatedTotalCost = estimatedMaterialCost + totalAccessoryCost;

  const calculatedCabinet: CalculatedCabinet = {
    parts,
    estimatedCost: parseFloat(estimatedTotalCost.toFixed(2)),
    totalPanelArea: parseFloat(totalPanelArea_sqm.toFixed(3)),
    totalBackPanelArea: parseFloat(totalBackPanelArea_sqm.toFixed(3)),
    accessories,
  };

  // In a real system, this part list would be sent to a nesting engine (e.g., deepnest.js or an API like Nest&Cut)
  // The nesting engine would return optimized layouts on standard sheet sizes.
  // console.log("Parts to nest:", parts.filter(p => p.thickness === PANEL_THICKNESS));
  // console.log("Back panels to nest:", parts.filter(p => p.thickness === BACK_PANEL_THICKNESS));

  return { success: true, data: calculatedCabinet };
}
