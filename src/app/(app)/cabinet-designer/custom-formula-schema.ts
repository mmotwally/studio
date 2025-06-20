
import * as z from "zod";

export const customFormulaSchema = z.object({
  name: z.string().min(1, "Formula name is required.").max(100),
  formulaString: z.string().min(1, "Formula string is required."),
  dimensionType: z.enum(["Width", "Height", "Quantity", "Thickness"]),
  description: z.string().max(500).optional().nullable(),
});

export type CustomFormulaFormValues = z.infer<typeof customFormulaSchema>;
