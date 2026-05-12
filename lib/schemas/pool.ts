import { z } from "zod";

export const createPoolSchema = z.object({
  name: z.string().min(3, "Pool name must be at least 3 characters"),
  description: z.string().optional(),
  locks_at: z.string().refine(
    (val) => {
      const d = new Date(val);
      return !isNaN(d.getTime()) && d > new Date();
    },
    { message: "Entry deadline must be a future date" }
  ),
});

export type CreatePoolInput = z.infer<typeof createPoolSchema>;
