
import * as z from "zod";

export const unitOfMeasurementSchema = z.object({
  name: z.string().min(1, { message: "Unit name is required." }).max(50, { message: "Unit name must be 50 characters or less." }),
  abbreviation: z.string().max(10, { message: "Abbreviation must be 10 characters or less." }).optional().nullable(),
});

export type UnitOfMeasurementFormValues = z.infer<typeof unitOfMeasurementSchema>;
    