
import * as z from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, { message: "Category name is required." }).max(100, { message: "Category name must be 100 characters or less." }),
  code: z.string()
    .min(2, { message: "Code must be at least 2 characters." })
    .max(5, { message: "Code must be 5 characters or less." })
    .regex(/^[A-Z0-9]+$/, { message: "Code must be uppercase alphanumeric characters only."})
    .transform(val => val.toUpperCase()),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

    