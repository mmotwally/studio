
'use server';

import type { InputPart, PackedPart, SheetLayout } from '@/types';

// Constants for nesting, could be configurable in a real app
const KERF_ALLOWANCE = 3; // mm
const DEFAULT_SHEET_WIDTH = 2440; // mm
const DEFAULT_SHEET_HEIGHT = 1220; // mm
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


// Simulated FFDH (First Fit Decreasing Height) with 90-degree rotation
export async function runDeepnestAlgorithmAction(partsDataString: string): Promise<{ success: boolean; message: string; layout?: SheetLayout[] }> {
  console.log("runDeepnestAlgorithmAction (Server-Side FFDH Simulation with Rotation) called.");
  
  let inputParts: InputPart[];
  try {
    inputParts = JSON.parse(partsDataString);
    if (!Array.isArray(inputParts)) throw new Error("Input must be a JSON array.");
    for (const part of inputParts) {
      if (
        typeof part.name !== 'string' ||
        typeof part.width !== 'number' || !(part.width > 0) ||
        typeof part.height !== 'number' || !(part.height > 0) ||
        typeof part.qty !== 'number' || !(part.qty > 0)
      ) {
        throw new Error("Each part must have a 'name' (string), and positive numeric 'width', 'height', and 'qty'. Invalid part: " + JSON.stringify(part));
      }
    }
  } catch (e: any) {
    console.error("Error parsing partsDataString in server action (FFDH-Sim):", e.message);
    return { success: false, message: `Server-side parsing error (FFDH-Sim): ${e.message}` };
  }

  if (inputParts.length === 0) {
    return { success: false, message: "No parts provided for server-side FFDH-Sim nesting." };
  }

  const allPartInstances: Array<{
    id: string;
    originalName: string;
    originalWidth: number;
    originalHeight: number;
    packed: boolean;
    material?: string;
  }> = [];

  inputParts.forEach(part => {
    for (let i = 0; i < part.qty; i++) {
      allPartInstances.push({
        id: `${part.name}_${i + 1}`,
        originalName: part.name,
        originalWidth: part.width,
        originalHeight: part.height,
        packed: false,
        material: part.material,
      });
    }
  });

  // Sort parts for FFDH: primarily by height descending, then width descending
  allPartInstances.sort((a, b) => {
    if (b.originalHeight === a.originalHeight) {
      return b.originalWidth - a.originalWidth;
    }
    return b.originalHeight - a.originalHeight;
  });

  const packedSheetsServer: SheetLayout[] = [];
  let sheetId = 1;

  while (allPartInstances.some(p => !p.packed) && sheetId <= MAX_SHEETS_PER_JOB) {
    const currentSheetParts: PackedPart[] = [];
    let currentX = 0;
    let currentY = 0;
    let currentRowMaxHeight = 0; // Effective height of parts in current row (with kerf)

    for (const part of allPartInstances) {
      if (part.packed) continue;

      let placedOnSheet = false;
      let placedPartData: PackedPart | null = null;

      // Try placing in original orientation
      const effWidthOrig = part.originalWidth + KERF_ALLOWANCE;
      const effHeightOrig = part.originalHeight + KERF_ALLOWANCE;

      // Try current row, original orientation
      if (currentX + effWidthOrig <= DEFAULT_SHEET_WIDTH && currentY + effHeightOrig <= DEFAULT_SHEET_HEIGHT) {
         placedPartData = {
            ...part, x: currentX, y: currentY, width: part.originalWidth, height: part.originalHeight, isRotated: false, qty:1
         };
         placedOnSheet = true;
      }
      // Try new row, original orientation
      else if (currentY + currentRowMaxHeight + effHeightOrig <= DEFAULT_SHEET_HEIGHT && effWidthOrig <= DEFAULT_SHEET_WIDTH) {
         placedPartData = {
            ...part, x: 0, y: currentY + currentRowMaxHeight, width: part.originalWidth, height: part.originalHeight, isRotated: false, qty:1
         };
         placedOnSheet = true;
      }

      // If not placed, try rotated orientation (if part is not square, to avoid redundant checks if already tried)
      if (!placedOnSheet && part.originalWidth !== part.originalHeight) {
        const effWidthRot = part.originalHeight + KERF_ALLOWANCE;
        const effHeightRot = part.originalWidth + KERF_ALLOWANCE;

        // Try current row, rotated orientation
        if (currentX + effWidthRot <= DEFAULT_SHEET_WIDTH && currentY + effHeightRot <= DEFAULT_SHEET_HEIGHT) {
          placedPartData = {
            ...part, x: currentX, y: currentY, width: part.originalHeight, height: part.originalWidth, isRotated: true, qty:1
          };
          placedOnSheet = true;
        }
        // Try new row, rotated orientation
        else if (currentY + currentRowMaxHeight + effHeightRot <= DEFAULT_SHEET_HEIGHT && effWidthRot <= DEFAULT_SHEET_WIDTH) {
          placedPartData = {
            ...part, x: 0, y: currentY + currentRowMaxHeight, width: part.originalHeight, height: part.originalWidth, isRotated: true, qty:1
          };
          placedOnSheet = true;
        }
      }
      
      if (placedOnSheet && placedPartData) {
        part.packed = true;
        currentSheetParts.push(placedPartData);

        // Update packing position
        const packedEffectiveWidth = (placedPartData.isRotated ? part.originalHeight : part.originalWidth) + KERF_ALLOWANCE;
        const packedEffectiveHeight = (placedPartData.isRotated ? part.originalWidth : part.originalHeight) + KERF_ALLOWANCE;

        if (placedPartData.y! > currentY) { // New row was started
            currentY = placedPartData.y!;
            currentX = packedEffectiveWidth;
            currentRowMaxHeight = packedEffectiveHeight;
        } else { // Placed in current row
            currentX += packedEffectiveWidth;
            currentRowMaxHeight = Math.max(currentRowMaxHeight, packedEffectiveHeight);
        }
      }
    } // End for (part of allPartInstances)

    if (currentSheetParts.length > 0) {
      let actualUsedWidthOnSheet = 0;
      let actualUsedHeightOnSheet = 0;
      let totalPartAreaOnSheet = 0;
      currentSheetParts.forEach(p => {
          // Area calculation for efficiency uses original dimensions + kerf
          totalPartAreaOnSheet += (p.originalWidth! + KERF_ALLOWANCE) * (p.originalHeight! + KERF_ALLOWANCE);
          // Used area for sheet dimensions:
          const packedWidthWithKerf = (p.isRotated ? p.originalHeight! : p.originalWidth!) + KERF_ALLOWANCE;
          const packedHeightWithKerf = (p.isRotated ? p.originalWidth! : p.originalHeight!) + KERF_ALLOWANCE;
          if (p.x !== undefined && p.y !== undefined) {
            actualUsedWidthOnSheet = Math.max(actualUsedWidthOnSheet, p.x + packedWidthWithKerf);
            actualUsedHeightOnSheet = Math.max(actualUsedHeightOnSheet, p.y + packedHeightWithKerf);
          }
      });
      const sheetArea = DEFAULT_SHEET_WIDTH * DEFAULT_SHEET_HEIGHT;
      const efficiency = (totalPartAreaOnSheet / sheetArea) * 100;

      packedSheetsServer.push({
        id: sheetId,
        dimensions: { w: DEFAULT_SHEET_WIDTH, h: DEFAULT_SHEET_HEIGHT },
        parts: currentSheetParts,
        packedAreaWidth: actualUsedWidthOnSheet,
        packedAreaHeight: actualUsedHeightOnSheet,
        efficiency: parseFloat(efficiency.toFixed(1)),
      });
      sheetId++;
    } else if (allPartInstances.some(p => !p.packed)) {
      const remainingUnpacked = allPartInstances.filter(p => !p.packed);
      const largestRemaining = remainingUnpacked.reduce((max, p) => (p.originalWidth * p.originalHeight > max.originalWidth * max.originalHeight) ? p : max, { originalWidth: 0, originalHeight: 0, originalName: 'N/A', id:'', packed:false });
      const message = `Server FFDH-Sim (Rotation): Could not pack ${remainingUnpacked.length} remaining parts. Largest: ${largestRemaining.originalName} (${largestRemaining.originalWidth}x${largestRemaining.originalHeight}). Sheet ${sheetId}.`;
      console.warn(message);
      return { success: false, message, layout: packedSheetsServer }; 
    }
  } // End while

  const unpackedCount = allPartInstances.filter(p => !p.packed).length;
  if (unpackedCount > 0 && sheetId > MAX_SHEETS_PER_JOB) {
    return { success: false, message: `Server FFDH-Sim (Rotation): Max sheets (${MAX_SHEETS_PER_JOB}) reached. ${unpackedCount} parts remain unpacked.`, layout: packedSheetsServer };
  }
  if (unpackedCount > 0) {
    return { success: false, message: `Server FFDH-Sim (Rotation): Finished packing, but ${unpackedCount} parts could not be placed.`, layout: packedSheetsServer };
  }

  return {
    success: true,
    message: `Server FFDH-Sim (Rotation): Processed ${allPartInstances.length} part instances onto ${packedSheetsServer.length} sheets.`,
    layout: packedSheetsServer,
  };
}
