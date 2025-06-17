
import * as z from "zod";

export const purchaseOrderItemSchema = z.object({
  inventoryItemId: z.string().min(1, { message: "Inventory item must be selected." }),
  description: z.string().max(255, "Description must be 255 characters or less.").optional().nullable(),
  quantityOrdered: z.coerce.number().int().min(1, { message: "Quantity ordered must be at least 1." }),
  unitCost: z.coerce.number().min(0, { message: "Unit cost must be a non-negative number." }),
});

export const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, { message: "Supplier is required." }),
  orderDate: z.date({ required_error: "Order date is required." }),
  expectedDeliveryDate: z.date().optional().nullable(),
  notes: z.string().max(1000, "Notes must be 1000 characters or less.").optional().nullable(),
  shippingAddress: z.string().max(500, "Shipping address must be 500 characters or less.").optional().nullable(),
  billingAddress: z.string().max(500, "Billing address must be 500 characters or less.").optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, { message: "At least one item must be added to the purchase order." }),
});

export type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemSchema>;
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
