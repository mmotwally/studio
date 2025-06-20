
'use server';

import type { InputPart, PackedPart, SheetLayout, SheetDimensionOption } from '@/types';

const KERF_ALLOWANCE = 3; 
const MAX_SHEETS_PER_JOB = 50; 


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


export async function performServerSideNestingAction(partsData: string): Promise<{ success: boolean; message: string; details?: string }> {
  console.log("Server-Side Nesting Action called with partsData:", partsData);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    message: "Server-side nesting calculation completed (conceptual).",
    details: "Layout data would be returned here (e.g., SVG, JSON coordinates)."
  };
}

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
        (part.material && typeof part.material !== 'string') ||
        (part.grainDirection && !['with', 'reverse', 'none'].includes(part.grainDirection))
      ) {
        throw new Error("Each part must have a 'name' (string), 'material' (string, optional), 'grainDirection' (optional 'with'/'reverse'/'none'), and positive numeric 'width', 'height', and 'qty'. Invalid part: " + JSON.stringify(part));
      }
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

    const allPartInstancesForMaterial: Array<InputPart & { id: string; packed: boolean }> = [];

    materialParts.forEach(part => {
      for (let i = 0; i < part.qty; i++) {
        allPartInstancesForMaterial.push({
          ...part, // spread all properties from InputPart
          id: `${part.originalName}_${i + 1}_${material.replace(/\s+/g, '_')}`, 
          packed: false,
        });
      }
    });
    totalPartsProcessed += allPartInstancesForMaterial.length;
    
    // Sort parts for FFDH: primarily by "effective height for grain" descending, then "effective width" descending
    allPartInstancesForMaterial.sort((a, b) => {
        const aEffectiveHeight = (a.grainDirection === 'reverse' && a.originalWidth && a.originalHeight && a.originalWidth > a.originalHeight) ? a.originalWidth : a.originalHeight;
        const bEffectiveHeight = (b.grainDirection === 'reverse' && b.originalWidth && b.originalHeight && b.originalWidth > b.originalHeight) ? b.originalWidth : b.originalHeight;
        
        const aEffectiveWidth = (a.grainDirection === 'reverse' && a.originalWidth && a.originalHeight && a.originalWidth > a.originalHeight) ? a.originalHeight : a.originalWidth;
        const bEffectiveWidth = (b.grainDirection === 'reverse' && b.originalWidth && b.originalHeight && b.originalWidth > b.originalHeight) ? b.originalHeight : b.originalWidth;

        if (bEffectiveHeight === aEffectiveHeight) {
            return (bEffectiveWidth || 0) - (aEffectiveWidth || 0);
        }
        return (bEffectiveHeight || 0) - (aEffectiveHeight || 0);
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
        
        const isSquare = part.originalWidth === part.originalHeight;
        
        // Determine if rotation is generally allowed for this part
        let rotationAllowed = (part.grainDirection === 'none' || !part.grainDirection || isSquare);
        if (part.grainDirection === 'with' && !isSquare) rotationAllowed = false;
        if (part.grainDirection === 'reverse' && !isSquare) rotationAllowed = false;


        // Candidate 1: Original orientation (or intended 'reverse' orientation)
        let candidateWidth1 = part.originalWidth!;
        let candidateHeight1 = part.originalHeight!;
        let isRotated1 = false;

        if (part.grainDirection === 'reverse') {
            candidateWidth1 = part.originalHeight!; // Width along sheet grain (sheet height)
            candidateHeight1 = part.originalWidth!;  // Height along sheet non-grain (sheet width)
            // This is the "natural" placement for 'reverse' grain, so isRotated relative to input might be considered false.
            // However, for consistency with 'width' and 'height' fields of PackedPart reflecting actual placed dims,
            // we'll track if the original WxH had to be swapped for the grain.
            isRotated1 = part.originalWidth !== candidateWidth1; 
        }

        const effWidth1 = candidateWidth1 + KERF_ALLOWANCE;
        const effHeight1 = candidateHeight1 + KERF_ALLOWANCE;

        if (currentX + effWidth1 <= currentMaterialSheetWidth && currentY + effHeight1 <= currentMaterialSheetHeight) {
          placedPartData = { ...part, x: currentX, y: currentY, width: candidateWidth1, height: candidateHeight1, isRotated: isRotated1, qty:1 };
          placedOnSheet = true;
        } else if (currentY + currentRowMaxHeight + effHeight1 <= currentMaterialSheetHeight && effWidth1 <= currentMaterialSheetWidth) {
          placedPartData = { ...part, x: 0, y: currentY + currentRowMaxHeight, width: candidateWidth1, height: candidateHeight1, isRotated: isRotated1, qty:1 };
          placedOnSheet = true;
        }

        // Candidate 2: Rotated orientation (if allowed and not already placed)
        if (!placedOnSheet && rotationAllowed && !isSquare) {
          let candidateWidth2 = part.originalHeight!;
          let candidateHeight2 = part.originalWidth!;
          // isRotated for candidate 2 will be true if it's different from original WxH, *unless* it was already 'reverse' and this is the original WxH
          let isRotated2 = true;
          if (part.grainDirection === 'reverse') { 
              // If original was reverse, this "rotation" brings it back to original CAD orientation
              isRotated2 = part.originalWidth !== candidateWidth2; 
          }


          const effWidth2 = candidateWidth2 + KERF_ALLOWANCE;
          const effHeight2 = candidateHeight2 + KERF_ALLOWANCE;
          
          if (currentX + effWidth2 <= currentMaterialSheetWidth && currentY + effHeight2 <= currentMaterialSheetHeight) {
            placedPartData = { ...part, x: currentX, y: currentY, width: candidateWidth2, height: candidateHeight2, isRotated: isRotated2, qty:1 };
            placedOnSheet = true;
          } else if (currentY + currentRowMaxHeight + effHeight2 <= currentMaterialSheetHeight && effWidth2 <= currentMaterialSheetWidth) {
            placedPartData = { ...part, x: 0, y: currentY + currentRowMaxHeight, width: candidateWidth2, height: candidateHeight2, isRotated: isRotated2, qty:1 };
            placedOnSheet = true;
          }
        }
        
        if (placedOnSheet && placedPartData) {
          part.packed = true;
          currentSheetParts.push(placedPartData);
          const packedEffectiveWidth = placedPartData.width! + KERF_ALLOWANCE;
          const packedEffectiveHeight = placedPartData.height! + KERF_ALLOWANCE;

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
            totalPartAreaOnSheet += (p.originalWidth! + KERF_ALLOWANCE) * (p.originalHeight! + KERF_ALLOWANCE);
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
          break; 
      }
    } 

    totalPartsNotPacked += allPartInstancesForMaterial.filter(p => !p.packed).length;
  } 

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
