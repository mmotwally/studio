
import * as z from "zod";
import type { CabinetPartType, CabinetTypeContext } from "./types"; // Assuming types are exported from here

const cabinetPartTypesForValidation = [
  'Side Panel', 'Bottom Panel', 'Top Panel', 'Back Panel', 'Double Back Panel',
  'Door', 'Doors', 'Drawer Front', 'Drawer Back', 'Drawer Side', 'Drawer Counter Front',
  'Drawer Bottom', 'Mobile Shelf', 'Fixed Shelf', 'Upright', 'Front Panel',
  'Top Rail (Front)', 'Top Rail (Back)', 'Bottom Rail (Front)', 'Bottom Rail (Back)',
  'Stretcher', 'Toe Kick'
] as const;

const cabinetTypeContextsForValidation = ['Base', 'Wall', 'Drawer', 'General'] as const;

export const customFormulaSchema = z.object({
  name: z.string().min(1, "Formula name is required.").max(100),
  formulaString: z.string().min(1, "Formula string is required."),
  dimensionType: z.enum(["Width", "Height", "Quantity", "Thickness"]),
  description: z.string().max(500).optional().nullable(),
  partType: z.enum(cabinetPartTypesForValidation).optional().nullable(),
  context: z.enum(cabinetTypeContextsForValidation).optional().nullable(),
});

export type CustomFormulaFormValues = z.infer<typeof customFormulaSchema>;
