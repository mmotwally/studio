
import * as z from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  category: z.string().optional(),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a non-negative integer." }),
  unitCost: z.coerce.number().min(0, { message: "Unit cost must be a non-negative number." }),
  location: z.string().optional(),
  supplier: z.string().optional(),
  lowStock: z.boolean().default(false).optional(),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;
