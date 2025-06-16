
import * as z from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a non-negative integer." }),
  unitCost: z.coerce.number().min(0, { message: "Unit cost must be a non-negative number." }),
  lowStock: z.boolean().default(false).optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  locationId: z.string().optional(),
  supplierId: z.string().optional(),
  unitId: z.string().optional(),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;
