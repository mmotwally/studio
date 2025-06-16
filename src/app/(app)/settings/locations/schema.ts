
import * as z from "zod";

export const locationSchema = z.object({
  store: z.string().min(1, { message: "Store name/identifier is required." }).max(100),
  rack: z.string().max(50).optional().nullable(),
  shelf: z.string().max(50).optional().nullable(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
    