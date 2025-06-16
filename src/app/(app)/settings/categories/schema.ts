
import * as z from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, { message: "Category name is required." }).max(100, { message: "Category name must be 100 characters or less." }),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
