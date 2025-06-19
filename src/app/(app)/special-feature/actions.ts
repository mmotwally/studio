
'use server';

import potpack from 'potpack';
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


// Placeholder for Server-Side Nesting Action
export async function performServerSideNestingAction(partsData: string): Promise<{ success: boolean; message: string; details?: string }> {
  console.log("Server-Side Nesting Action called with partsData:", partsData);
  // Simulate server processing
  await new Promise(resolve => setTimeout(resolve, 1500));

  // In a real implementation:
  // 1. Parse partsData (e.g., from JSON or CSV string)
  // 2. Run a complex nesting algorithm.
  // 3. Return layout data, sheet count, waste percentage, etc.

  // For now, return a placeholder success message
  return {
    success: true,
    message: "Server-side nesting calculation completed (conceptual).",
    details: "Layout data would be returned here (e.g., SVG, JSON coordinates)."
  };
}

// Placeholder for Export Cut List Action
export async function exportCutListForDesktopAction(partsData: string): Promise<{ success: boolean; message: string; data?: string, fileName?: string }> {
  console.log("Export Cut List Action called with partsData:", partsData);
  // Simulate server processing to generate a file content
  await new Promise(resolve => setTimeout(resolve, 700));

  // In a real implementation:
  // 1. Parse partsData.
  // 2. Format it as CSV, XML, or other target format.
  // 3. Return the file content (e.g., as a base64 string or direct string) and a suggested filename.

  // For now, return a placeholder success message and conceptual CSV data URI
  const conceptualCsvData = "Part Name,Width,Height,Material,Quantity\nSide Panel,700,500,Plywood,2\nTop Panel,600,500,Plywood,1";
  const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(conceptualCsvData)}`;

  return {
    success: true,
    message: "Cut list for desktop software prepared (conceptual CSV).",
    data: dataUri,
    fileName: "conceptual_cutlist.csv"
  };
}


export async function runDeepnestAlgorithmAction(partsDataString: string): Promise<{ success: boolean; message: string; layout?: SheetLayout[] }> {
  console.log("runDeepnestAlgorithmAction (server-side potpack) called with partsDataString:", partsDataString);
  
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
        throw new Error("Each part must have a 'name' (string), and positive numeric 'width', 'height', and 'qty'.");
      }
    }
  } catch (e: any) {
    console.error("Error parsing partsDataString in server action:", e.message);
    return { success: false, message: `Server-side parsing error: ${e.message}` };
  }

  if (inputParts.length === 0) {
    return { success: false, message: "No parts provided for server-side nesting." };
  }

  const allPartsToPack: PotpackBox[] = [];
  inputParts.forEach(part => {
    for (let i = 0; i < part.qty; i++) {
      allPartsToPack.push({
        w: part.width + KERF_ALLOWANCE,
        h: part.height + KERF_ALLOWANCE,
        name: `${part.name}_${i + 1}`, // Unique name for each instance
        originalName: part.name,
        originalWidth: part.width,
        originalHeight: part.height,
      });
    }
  });

  const packedSheetsServer: SheetLayout[] = [];
  let remainingPartsToPack = [...allPartsToPack];
  let sheetId = 1;

  while (remainingPartsToPack.length > 0 && sheetId <= MAX_SHEETS_PER_JOB) {
    const partsForCurrentSheetAttempt = [...remainingPartsToPack];
    const stats: PotpackStats = potpack(partsForCurrentSheetAttempt); // potpack modifies partsForCurrentSheetAttempt

    const currentSheetParts: PackedPart[] = [];
    const stillRemainingAfterSheet: PotpackBox[] = [];

    for (const packedBox of partsForCurrentSheetAttempt) {
      if (packedBox.x !== undefined && packedBox.y !== undefined &&
          (packedBox.x + packedBox.w) <= DEFAULT_SHEET_WIDTH &&
          (packedBox.y + packedBox.h) <= DEFAULT_SHEET_HEIGHT) {
        currentSheetParts.push({
          name: packedBox.name!, // Potpack assigns x,y, use its name
          width: packedBox.originalWidth!,
          height: packedBox.originalHeight!,
          qty: 1, // Each box is a single instance
          x: packedBox.x,
          y: packedBox.y,
          material: packedBox.originalName, // For color mapping on client
          originalName: packedBox.originalName,
          originalWidth: packedBox.originalWidth,
          originalHeight: packedBox.originalHeight,
        });
      } else {
        // This part was not packed by potpack onto the current conceptual bin
        // or it overflowed the standard sheet. Reset and add to remaining.
        delete packedBox.x;
        delete packedBox.y;
        stillRemainingAfterSheet.push(packedBox);
      }
    }
    
    if (currentSheetParts.length > 0) {
      let actualUsedWidthOnSheet = 0;
      let actualUsedHeightOnSheet = 0;
      let totalPartAreaOnSheet = 0;

      currentSheetParts.forEach(p => {
        if (p.x !== undefined && p.y !== undefined) {
          actualUsedWidthOnSheet = Math.max(actualUsedWidthOnSheet, p.x + p.originalWidth! + KERF_ALLOWANCE);
          actualUsedHeightOnSheet = Math.max(actualUsedHeightOnSheet, p.y + p.originalHeight! + KERF_ALLOWANCE);
          totalPartAreaOnSheet += (p.originalWidth! + KERF_ALLOWANCE) * (p.originalHeight! + KERF_ALLOWANCE);
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
    } else if (stillRemainingAfterSheet.length > 0) {
      // No parts could be packed on a new sheet, likely oversized parts
      // This indicates an issue, as potpack should always try to pack if parts are smaller than the bin
      console.warn("Server-side potpack: No parts packed onto a new sheet, but parts remain. Remaining:", stillRemainingAfterSheet.length);
      return { success: false, message: `Server-side nesting: Could not pack remaining ${stillRemainingAfterSheet.length} parts. Check part sizes.`, layout: packedSheetsServer };
    }
    remainingPartsToPack = stillRemainingAfterSheet;
  }
  
  if (remainingPartsToPack.length > 0 && sheetId > MAX_SHEETS_PER_JOB) {
    return { success: false, message: `Server-side nesting: Max sheets (${MAX_SHEETS_PER_JOB}) reached. ${remainingPartsToPack.length} parts remain unpacked.`, layout: packedSheetsServer };
  }

  return {
    success: true,
    message: `Deepnest (Conceptual Backend Call using potpack) processed ${allPartsToPack.length} part instances onto ${packedSheetsServer.length} sheets.`,
    layout: packedSheetsServer,
  };
}
    
