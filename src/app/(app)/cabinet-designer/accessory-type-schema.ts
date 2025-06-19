
import * as z from "zod";

export const accessoryTypeFormSchema = z.object({
  name: z.string().min(1, "Accessory name is required.").max(100),
  type: z.enum(["hinge", "drawer_slide", "handle", "shelf_pin", "leg", "screw", "other"]).default("other"),
  unitCost: z.coerce.number().min(0.01, "Unit cost must be at least $0.01."),
  description: z.string().max(500).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
});

export type AccessoryTypeFormValues = z.infer<typeof accessoryTypeFormSchema>;
