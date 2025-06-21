import * as z from "zod";

export const roleSchema = z.object({
  name: z.string().min(1, { message: "Role name is required." }).max(100, { message: "Role name must be 100 characters or less." }),
  description: z.string().max(255, { message: "Description must be 255 characters or less." }).optional().nullable(),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
