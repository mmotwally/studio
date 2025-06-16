
import * as z from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, { message: "Department name is required." }).max(100, { message: "Department name must be 100 characters or less." }),
  code: z.string()
    .min(2, { message: "Code must be at least 2 characters." })
    .max(10, { message: "Code must be 10 characters or less." })
    .regex(/^[A-Z0-9]+$/, { message: "Code must be uppercase alphanumeric characters only."})
    .transform(val => val.toUpperCase()),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
