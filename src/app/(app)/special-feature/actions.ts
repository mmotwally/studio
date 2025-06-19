
'use server';

// Potpack is NO LONGER USED by runDeepnestAlgorithmAction. It IS still used by the client-side version in page.tsx.
// We keep it here if other server actions might potentially use it, but for now, runDeepnestAlgorithmAction will use a custom heuristic.
// import potpack from 'potpack'; 

import type { InputPart, PackedPart, SheetLayout, PotpackBox, PotpackStats } from '@/types';


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

// "Deepnest Algorithm" simulation using a basic FFDH-like heuristic
export async function runDeepnestAlgorithmAction(partsDataString: string): Promise<{ success: boolean; message: string; layout?: SheetLayout[] }> {
  console.log("runDeepnestAlgorithmAction (Server-Side FFDH Simulation) called.");
  
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

  const allPartInstances: Array<InputPart & { id: string, packed: boolean, originalName: string, originalWidth: number, originalHeight: number }> = [];
  inputParts.forEach(part => {
    for (let i = 0; i < part.qty; i++) {
      allPartInstances.push({
        ...part, // spread original part data
        id: `${part.name}_${i + 1}`, // Unique ID for this instance
        width: part.width + KERF_ALLOWANCE,  // Effective width with kerf
        height: part.height + KERF_ALLOWANCE, // Effective height with kerf
        originalName: part.name,             // Store original name for display/material mapping
        originalWidth: part.width,           // Store original width for drawing
        originalHeight: part.height,         // Store original height for drawing
        packed: false,
      });
    }
  });

  // Sort parts for FFDH: typically by height descending, then width descending
  allPartInstances.sort((a, b) => {
    if (b.height === a.height) {
      return b.width - a.width;
    }
    return b.height - a.height;
  });

  const packedSheetsServer: SheetLayout[] = [];
  let sheetId = 1;

  while (allPartInstances.some(p => !p.packed) && sheetId <= MAX_SHEETS_PER_JOB) {
    const currentSheetParts: PackedPart[] = [];
    let currentX = 0;
    let currentY = 0;
    let currentRowMaxHeight = 0;

    for (const part of allPartInstances) {
      if (part.packed) continue;

      // Try to place in current row
      if (currentX + part.width <= DEFAULT_SHEET_WIDTH && currentY + part.height <= DEFAULT_SHEET_HEIGHT) {
         // Check if part fits within the current row's established max height or if it can establish a new one
        if (part.height <= (DEFAULT_SHEET_HEIGHT - currentY)) { // Basic height check for current Y
            currentSheetParts.push({
                name: part.id,
                width: part.originalWidth, // Draw with original dimensions
                height: part.originalHeight,
                qty: 1,
                x: currentX,
                y: currentY,
                material: part.originalName, // Use original name for color mapping
                originalName: part.originalName,
                originalWidth: part.originalWidth,
                originalHeight: part.originalHeight,
            });
            part.packed = true;
            currentX += part.width; // Move X by kerf-included width
            currentRowMaxHeight = Math.max(currentRowMaxHeight, part.height); // Update current row height
        }
      } 
      // If part didn't fit horizontally, try starting a new row on the sheet
      else if (currentY + currentRowMaxHeight + part.height <= DEFAULT_SHEET_HEIGHT && part.width <= DEFAULT_SHEET_WIDTH) { 
        currentX = 0;
        currentY += currentRowMaxHeight;
        currentRowMaxHeight = 0; // Reset for new row

        // Retry placing in the new row
        if (currentX + part.width <= DEFAULT_SHEET_WIDTH && currentY + part.height <= DEFAULT_SHEET_HEIGHT) { // Check again with new X,Y
            currentSheetParts.push({
                name: part.id,
                width: part.originalWidth,
                height: part.originalHeight,
                qty: 1,
                x: currentX,
                y: currentY,
                material: part.originalName,
                originalName: part.originalName,
                originalWidth: part.originalWidth,
                originalHeight: part.originalHeight,
            });
            part.packed = true;
            currentX += part.width;
            currentRowMaxHeight = Math.max(currentRowMaxHeight, part.height);
        }
      }
    } // End for (part of allPartInstances)

    if (currentSheetParts.length > 0) {
      let actualUsedWidthOnSheet = 0;
      let actualUsedHeightOnSheet = 0;
      let totalPartAreaOnSheet = 0;
      currentSheetParts.forEach(p => {
        const packedWidth = p.originalWidth! + KERF_ALLOWANCE;
        const packedHeight = p.originalHeight! + KERF_ALLOWANCE;
        if (p.x !== undefined && p.y !== undefined) {
          actualUsedWidthOnSheet = Math.max(actualUsedWidthOnSheet, p.x! + packedWidth);
          actualUsedHeightOnSheet = Math.max(actualUsedHeightOnSheet, p.y! + packedHeight);
          totalPartAreaOnSheet += packedWidth * packedHeight;
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
        efficiency: efficiency,
      });
      sheetId++;
    } else if (allPartInstances.some(p => !p.packed)) {
      // No parts were packed on this sheet attempt, but parts remain.
      const remainingUnpacked = allPartInstances.filter(p => !p.packed);
      const largestRemaining = remainingUnpacked.reduce((max, p) => (p.width * p.height > max.width * max.height) ? p : max, { width: 0, height: 0, name: '', originalName: '', originalWidth:0, originalHeight:0, qty:0, material:'', id:'', packed:false });
      const message = `Server FFDH-Sim: Could not pack ${remainingUnpacked.length} remaining parts. Largest: ${largestRemaining.originalName} (${largestRemaining.originalWidth}x${largestRemaining.originalHeight}). All parts might be too large for a new sheet. Sheet ${sheetId}.`;
      console.warn(message);
      // Return success false but with potentially partially filled layout
      return { success: false, message, layout: packedSheetsServer }; 
    }
  } // End while

  const unpackedCount = allPartInstances.filter(p => !p.packed).length;
  if (unpackedCount > 0 && sheetId > MAX_SHEETS_PER_JOB) {
    return { success: false, message: `Server FFDH-Sim: Max sheets (${MAX_SHEETS_PER_JOB}) reached. ${unpackedCount} parts remain unpacked.`, layout: packedSheetsServer };
  }
  if (unpackedCount > 0) {
    return { success: false, message: `Server FFDH-Sim: Finished packing, but ${unpackedCount} parts could not be placed (possibly too large or no fit found).`, layout: packedSheetsServer };
  }

  return {
    success: true,
    message: `Server FFDH-Sim: Processed ${allPartInstances.length} part instances onto ${packedSheetsServer.length} sheets.`,
    layout: packedSheetsServer,
  };
}
    
