
import * as z from "zod";

export const materialTypeFormSchema = z.object({
  name: z.string().min(1, "Material name is required.").max(100),
  type: z.enum(["panel", "edge_band", "other"]).default("panel"),
  costPerSqm: z.coerce.number().min(0).optional().nullable(),
  costPerMeter: z.coerce.number().min(0).optional().nullable(),
  thickness: z.coerce.number().min(0).optional().nullable(),
  defaultSheetWidth: z.coerce.number().min(0).optional().nullable(),
  defaultSheetHeight: z.coerce.number().min(0).optional().nullable(),
  hasGrain: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
}).refine(data => {
    if (data.type === "panel" && (data.costPerSqm === null || data.costPerSqm === undefined)) {
        return false;
    }
    return true;
}, { message: "Cost per Sqm is required for panel type materials.", path: ["costPerSqm"] })
.refine(data => {
    if (data.type === "edge_band" && (data.costPerMeter === null || data.costPerMeter === undefined)) {
        return false;
    }
    return true;
}, { message: "Cost per Meter is required for edge band type materials.", path: ["costPerMeter"] });

export type MaterialTypeFormValues = z.infer<typeof materialTypeFormSchema>;
