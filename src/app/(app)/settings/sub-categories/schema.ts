
import * as z from "zod";

export const subCategorySchema = z.object({
  name: z.string().min(1, { message: "Sub-category name is required." }).max(100, { message: "Sub-category name must be 100 characters or less." }),
  categoryId: z.string().min(1, { message: "Parent category is required." }),
  code: z.string()
    .min(2, { message: "Code must be at least 2 characters." })
    .max(5, { message: "Code must be 5 characters or less." })
    .regex(/^[A-Z0-9]+$/, { message: "Code must be uppercase alphanumeric characters only."})
    .transform(val => val.toUpperCase()),
});

export type SubCategoryFormValues = z.infer<typeof subCategorySchema>;

    