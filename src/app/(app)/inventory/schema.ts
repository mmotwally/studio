
import * as z from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().max(500, { message: "Description must be 500 characters or less." }).optional().nullable(),
  // imageUrl is handled by file input, not direct Zod validation here for the string path itself in the form
  // The presence/absence of an image file is handled in the action.
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a non-negative integer." }),
  unitCost: z.coerce.number().min(0, { message: "Unit cost must be a non-negative number." }),
  lowStock: z.boolean().default(false).optional(),
  minStockLevel: z.coerce.number().int().min(0, { message: "Min stock level must be a non-negative integer." }).optional().default(0),
  maxStockLevel: z.coerce.number().int().min(0, { message: "Max stock level must be a non-negative integer." }).optional().default(0),
  
  categoryId: z.string().min(1, { message: "Category is required." }),
  subCategoryId: z.string().optional().nullable(), // Allow unsetting subcategory
  locationId: z.string().optional().nullable(), // Allow unsetting location
  supplierId: z.string().optional().nullable(), // Allow unsetting supplier
  unitId: z.string().min(1, { message: "Unit of Measurement is required."}),
  removeImage: z.boolean().optional().default(false), // For edit form, to signal image removal
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
    
