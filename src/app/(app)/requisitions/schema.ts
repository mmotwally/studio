
import * as z from "zod";

export const requisitionItemSchema = z.object({
  inventoryItemId: z.string().min(1, { message: "Inventory item must be selected." }),
  quantityRequested: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }),
  notes: z.string().max(255, { message: "Item notes must be 255 characters or less." }).optional().nullable(),
});

export const requisitionFormSchema = z.object({
  departmentId: z.string().min(1, { message: "Department is required." }),
  orderNumber: z.string().max(50, { message: "Order Number must be 50 characters or less."}).optional().nullable(),
  bomNumber: z.string().max(50, { message: "BOM Number must be 50 characters or less."}).optional().nullable(),
  dateNeeded: z.date().optional().nullable(),
  notes: z.string().max(500, { message: "Overall notes must be 500 characters or less." }).optional().nullable(),
  items: z.array(requisitionItemSchema).min(1, { message: "At least one item must be added to the requisition." }),
});

export type RequisitionItemFormValues = z.infer<typeof requisitionItemSchema>;
export type RequisitionFormValues = z.infer<typeof requisitionFormSchema>;
