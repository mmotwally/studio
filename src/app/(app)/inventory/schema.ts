
import * as z from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().max(500, { message: "Description must be 500 characters or less." }).optional().nullable(),
  // imageUrl is now for the path, will be set server-side. No longer a direct URL input.
  imageUrl: z.string().max(2048, { message: "Image path too long."}).optional().nullable(),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a non-negative integer." }),
  unitCost: z.coerce.number().min(0, { message: "Unit cost must be a non-negative number." }),
  lowStock: z.boolean().default(false).optional(),
  minStockLevel: z.coerce.number().int().min(0, { message: "Min stock level must be a non-negative integer." }).optional().default(0),
  maxStockLevel: z.coerce.number().int().min(0, { message: "Max stock level must be a non-negative integer." }).optional().default(0),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  locationId: z.string().optional(),
  supplierId: z.string().optional(),
  unitId: z.string().optional(),
}).refine(data => {
  if (data.maxStockLevel !== undefined && data.maxStockLevel !== null && data.maxStockLevel > 0 &&
      data.minStockLevel !== undefined && data.minStockLevel !== null && data.minStockLevel > data.maxStockLevel) {
    return false;
  }
  return true;
}, {
  message: "Max stock level cannot be less than min stock level.",
  path: ["maxStockLevel"],
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

