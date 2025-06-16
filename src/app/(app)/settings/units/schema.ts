
import * as z from "zod";

export const unitOfMeasurementSchema = z.object({
  name: z.string().min(1, { message: "Unit name is required." }).max(50, { message: "Unit name must be 50 characters or less." }),
  abbreviation: z.string().max(10, { message: "Abbreviation must be 10 characters or less." }).optional().nullable(),
  baseUnitId: z.string().optional().nullable(),
  conversionFactor: z.coerce.number().positive({ message: "Conversion factor must be a positive number." }).default(1.0),
}).refine(data => {
  if (data.baseUnitId && (data.conversionFactor === undefined || data.conversionFactor === null || data.conversionFactor <= 0)) {
    return false; // Invalid if baseUnitId is set but conversionFactor is not positive
  }
  if (!data.baseUnitId && data.conversionFactor !== 1.0) {
    // If it's a base unit (no baseUnitId), factor should be 1.
    // We can enforce this or silently set it to 1 in the action.
    // For now, schema allows it, action can normalize. Or we can adjust default if baseUnitId is empty.
    // Let's allow schema to pass, and normalize in action.
  }
  return true;
}, {
  message: "If a base unit is selected, a positive conversion factor is required.",
  path: ["conversionFactor"], // Point error to conversionFactor field
});

export type UnitOfMeasurementFormValues = z.infer<typeof unitOfMeasurementSchema>;
    
