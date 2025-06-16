
import * as z from "zod";

export const subCategorySchema = z.object({
  name: z.string().min(1, { message: "Sub-category name is required." }).max(100, { message: "Sub-category name must be 100 characters or less." }),
  categoryId: z.string().min(1, { message: "Parent category is required." }),
});

export type SubCategoryFormValues = z.infer<typeof subCategorySchema>;
