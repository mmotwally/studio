
'use server';

import type { InputPart, PackedPart, SheetLayout, SheetDimensionOption } from '@/types';

// Constants for nesting, could be configurable in a real app
const KERF_ALLOWANCE = 3; // mm
// const DEFAULT_SHEET_WIDTH = 2440; // mm - This will now be configurable per material
// const DEFAULT_SHEET_HEIGHT = 1220; // mm
const MAX_SHEETS_PER_JOB = 50; // Safety limit


export interface SpecialActionInput {
  parameter1: string;
  parameter2: number;
}

export interface SpecialActionOutput {
  resultData: string;
  details?: Record<string, any>;
}


// Placeholder for a server action
export async function performSpecialServerAction(data: SpecialActionInput): Promise<{ success: boolean; message: string; output?: SpecialActionOutput }> {
  console.log("Special server action called with:", data);
  
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!data.parameter1 || data.parameter2 <= 0) {
    return { success: false, message: "Invalid input provided to special server action." };
  }

  const output: SpecialActionOutput = {
    resultData: `Processed '${data.parameter1}' and '${data.parameter2}'. Timestamp: ${new Date().toISOString()}`,
    details: { inputReceived: data }
  };
  
  return { success: true, message: "Special server action completed successfully!", output };
}


// Placeholder for Server-Side Nesting Action (kept for conceptual separation if needed later)
export async function performServerSideNestingAction(partsData: string): Promise<{ success: boolean; message: string; details?: string }> {
  console.log("Server-Side Nesting Action called with partsData:", partsData);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    message: "Server-side nesting calculation completed (conceptual).",
    details: "Layout data would be returned here (e.g., SVG, JSON coordinates)."
  };
}

// Placeholder for Export Cut List Action
export async function exportCutListForDesktopAction(partsData: string): Promise<{ success: boolean; message: string; data?: string, fileName?: string }> {
  console.log("Export Cut List Action called with partsData:", partsData);
  await new Promise(resolve => setTimeout(resolve, 700));
  const conceptualCsvData = "Part Name,Width,Height,Material,Quantity\nSide Panel,700,500,Plywood,2\nTop Panel,600,500,Plywood,1";
  const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(conceptualCsvData)}`;
  return {
    success: true,
    message: "Cut list for desktop software prepared (conceptual CSV).",
    data: dataUri,
    fileName: "conceptual_cutlist.csv"
  };
}


// Simulated FFDH (First Fit Decreasing Height) with 90-degree rotation, respecting material-specific sheet sizes and grain direction
export async function runDeepnestAlgorithmAction(
  partsDataString: string,
  materialSheetConfigString: string
): Promise<{ success: boolean; message: string; layout?: SheetLayout[] }> {
  console.log("runDeepnestAlgorithmAction (Server-Side FFDH with Material Sizes, Rotation & Grain) called.");
  
  let inputParts: InputPart[];
  let materialSheetConfig: Record<string, { width: number; height: number }>;
  const DEFAULT_FALLBACK_SHEET_WIDTH = 2440;
  const DEFAULT_FALLBACK_SHEET_HEIGHT = 1220;


  try {
    inputParts = JSON.parse(partsDataString);
    if (!Array.isArray(inputParts)) throw new Error("Input parts must be a JSON array.");
    for (const part of inputParts) {
      if (
        typeof part.name !== 'string' ||
        typeof part.width !== 'number' || !(part.width > 0) ||
        typeof part.height !== 'number' || !(part.height > 0) ||
        typeof part.qty !== 'number' || !(part.qty > 0) ||
        (part.material && typeof part.material !== 'string')
      ) {
        throw new Error("Each part must have a 'name' (string), 'material' (string, optional), and positive numeric 'width', 'height', and 'qty'. Invalid part: " + JSON.stringify(part));
      }
       // Ensure original dimensions are present, defaulting from width/height if not
      part.originalName = part.originalName || part.name;
      part.originalWidth = part.originalWidth || part.width;
      part.originalHeight = part.originalHeight || part.height;
    }
    materialSheetConfig = JSON.parse(materialSheetConfigString);
    if (typeof materialSheetConfig !== 'object' || materialSheetConfig === null) throw new Error("Material sheet config must be a JSON object.");

  } catch (e: any) {
    console.error("Error parsing input data in server action (FFDH-Sim):", e.message);
    return { success: false, message: `Server-side parsing error (FFDH-Sim): ${e.message}` };
  }

  if (inputParts.length === 0) {
    return { success: false, message: "No parts provided for server-side FFDH-Sim nesting." };
  }

  // Group parts by material
  const partsByMaterial = new Map<string, InputPart[]>();
  inputParts.forEach(part => {
    const materialKey = part.material || "Default_Material"; 
    if (!partsByMaterial.has(materialKey)) {
      partsByMaterial.set(materialKey, []);
    }
    partsByMaterial.get(materialKey)!.push(part);
  });

  const allPackedSheets: SheetLayout[] = [];
  let globalSheetId = 1;
  let totalPartsProcessed = 0;
  let totalPartsNotPacked = 0;

  for (const [material, materialParts] of partsByMaterial.entries()) {
    const sheetConfig = materialSheetConfig[material] || { width: DEFAULT_FALLBACK_SHEET_WIDTH, height: DEFAULT_FALLBACK_SHEET_HEIGHT };
    const currentMaterialSheetWidth = sheetConfig.width;
    const currentMaterialSheetHeight = sheetConfig.height;

    const allPartInstancesForMaterial: Array<{
      id: string; // Unique ID for this instance
      originalName: string;
      originalWidth: number;
      originalHeight: number;
      material?: string;
      packed: boolean;
    }> = [];

    materialParts.forEach(part => {
      for (let i = 0; i < part.qty; i++) {
        allPartInstancesForMaterial.push({
          id: `${part.originalName}_${i + 1}_${material.replace(/\s+/g, '_')}`, 
          originalName: part.originalName!,
          originalWidth: part.originalWidth!,
          originalHeight: part.originalHeight!,
          material: part.material,
          packed: false,
        });
      }
    });
    totalPartsProcessed += allPartInstancesForMaterial.length;

    // Sort parts for FFDH for this material: primarily by height descending, then width descending
    allPartInstancesForMaterial.sort((a, b) => {
      if (b.originalHeight === a.originalHeight) {
        return b.originalWidth - a.originalWidth;
      }
      return b.originalHeight - a.originalHeight;
    });

    let sheetsUsedForMaterial = 0;
    while (allPartInstancesForMaterial.some(p => !p.packed) && sheetsUsedForMaterial < MAX_SHEETS_PER_JOB) { 
      const currentSheetParts: PackedPart[] = [];
      let currentX = 0;
      let currentY = 0;
      let currentRowMaxHeight = 0;

      for (const part of allPartInstancesForMaterial) {
        if (part.packed) continue;

        let placedOnSheet = false;
        let placedPartData: PackedPart | null = null;
        
        const isGrainSensitive = part.material?.toLowerCase().includes('grain');
        const isSquare = part.originalWidth === part.originalHeight;
        const canRotate = !isGrainSensitive || isSquare;


        // Try original orientation
        const effWidthOrig = part.originalWidth + KERF_ALLOWANCE;
        const effHeightOrig = part.originalHeight + KERF_ALLOWANCE;

        if (currentX + effWidthOrig <= currentMaterialSheetWidth && currentY + effHeightOrig <= currentMaterialSheetHeight) {
          placedPartData = { ...part, x: currentX, y: currentY, width: part.originalWidth, height: part.originalHeight, isRotated: false, qty:1 };
          placedOnSheet = true;
        } else if (currentY + currentRowMaxHeight + effHeightOrig <= currentMaterialSheetHeight && effWidthOrig <= currentMaterialSheetWidth) {
          // Try to place on a new "level" or "skyline" in the current sheet
          placedPartData = { ...part, x: 0, y: currentY + currentRowMaxHeight, width: part.originalWidth, height: part.originalHeight, isRotated: false, qty:1 };
          placedOnSheet = true;
        }

        // Try rotated orientation if allowed and not already placed
        if (!placedOnSheet && canRotate && !isSquare) { 
          const effWidthRot = part.originalHeight + KERF_ALLOWANCE;
          const effHeightRot = part.originalWidth + KERF_ALLOWANCE;

          if (currentX + effWidthRot <= currentMaterialSheetWidth && currentY + effHeightRot <= currentMaterialSheetHeight) {
            placedPartData = { ...part, x: currentX, y: currentY, width: part.originalHeight, height: part.originalWidth, isRotated: true, qty:1 };
            placedOnSheet = true;
          } else if (currentY + currentRowMaxHeight + effHeightRot <= currentMaterialSheetHeight && effWidthRot <= currentMaterialSheetWidth) {
            // Try to place on a new "level" or "skyline" in the current sheet (rotated)
            placedPartData = { ...part, x: 0, y: currentY + currentRowMaxHeight, width: part.originalHeight, height: part.originalWidth, isRotated: true, qty:1 };
            placedOnSheet = true;
          }
        }
        
        if (placedOnSheet && placedPartData) {
          part.packed = true;
          currentSheetParts.push(placedPartData);
          const packedEffectiveWidth = (placedPartData.isRotated ? part.originalHeight : part.originalWidth) + KERF_ALLOWANCE;
          const packedEffectiveHeight = (placedPartData.isRotated ? part.originalWidth : part.originalHeight) + KERF_ALLOWANCE;

          if (placedPartData.y! > currentY) { 
              currentY = placedPartData.y!;
              currentX = packedEffectiveWidth;
              currentRowMaxHeight = packedEffectiveHeight;
          } else { 
              currentX += packedEffectiveWidth;
              currentRowMaxHeight = Math.max(currentRowMaxHeight, packedEffectiveHeight);
          }
        }
      }

      if (currentSheetParts.length > 0) {
        let actualUsedWidthOnSheet = 0;
        let actualUsedHeightOnSheet = 0;
        let totalPartAreaOnSheet = 0;
        currentSheetParts.forEach(p => {
            // Use originalWidth/Height for area calculation to reflect the part's true area
            totalPartAreaOnSheet += (p.originalWidth! + KERF_ALLOWANCE) * (p.originalHeight! + KERF_ALLOWANCE);
            // Use placed width/height for bounding box calculation
            const packedWidthWithKerf = p.width! + KERF_ALLOWANCE;
            const packedHeightWithKerf = p.height! + KERF_ALLOWANCE;

            if (p.x !== undefined && p.y !== undefined) {
              actualUsedWidthOnSheet = Math.max(actualUsedWidthOnSheet, p.x + packedWidthWithKerf);
              actualUsedHeightOnSheet = Math.max(actualUsedHeightOnSheet, p.y + packedHeightWithKerf);
            }
        });
        const sheetArea = currentMaterialSheetWidth * currentMaterialSheetHeight;
        const efficiency = sheetArea > 0 ? (totalPartAreaOnSheet / sheetArea) * 100 : 0;

        allPackedSheets.push({
          id: globalSheetId++,
          dimensions: { w: currentMaterialSheetWidth, h: currentMaterialSheetHeight },
          parts: currentSheetParts,
          packedAreaWidth: actualUsedWidthOnSheet,
          packedAreaHeight: actualUsedHeightOnSheet,
          efficiency: parseFloat(efficiency.toFixed(1)),
          material: material,
        });
        sheetsUsedForMaterial++;
      } else if (allPartInstancesForMaterial.some(p => !p.packed)) {
          // No parts could be placed on a new sheet, implies remaining parts are too large for this material's sheet size
          break; 
      }
    } // End while for current material

    totalPartsNotPacked += allPartInstancesForMaterial.filter(p => !p.packed).length;
  } // End for (material of partsByMaterial)

  const finalMessage = `Server FFDH (Rotation, Grain, Material Sizes): Processed ${totalPartsProcessed} part instances. 
    ${allPackedSheets.length} sheets used. ${totalPartsNotPacked} parts could not be packed.`;
  
  if (totalPartsNotPacked > 0) {
    return { success: false, message: finalMessage, layout: allPackedSheets };
  }

  return {
    success: true,
    message: finalMessage,
    layout: allPackedSheets,
  };
}

    
