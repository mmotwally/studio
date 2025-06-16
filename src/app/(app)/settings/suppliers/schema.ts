
import * as z from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, { message: "Supplier name is required." }).max(150),
  contactPerson: z.string().max(100).optional().nullable(),
  contactMail: z.string().email({ message: "Invalid email address." }).max(100).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
    