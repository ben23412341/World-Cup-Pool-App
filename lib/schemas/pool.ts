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

export const updatePoolSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Pool name is required")
    .max(100, "Pool name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  locks_at: z.string().nullable().optional(),
});

export type UpdatePoolSettingsInput = z.infer<typeof updatePoolSettingsSchema>;
