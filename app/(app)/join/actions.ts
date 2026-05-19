"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  code: z
    .string()
    .length(6, "Join code must be exactly 6 characters")
    .regex(/^[A-Z0-9]{6}$/, "Join code must contain only letters and numbers"),
});

export type FindPoolState = { error: string } | null;

export async function findPool(
  _prevState: FindPoolState,
  formData: FormData
): Promise<FindPoolState> {
  const raw = formData.get("code") as string;
  const code = (raw ?? "").toUpperCase().trim();

  const parsed = schema.safeParse({ code });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    // Use admin client — non-members can't read pools via the RLS client.
    const admin = createAdminClient();
    const { data } = await admin
      .from("pools")
      .select("join_code")
      .eq("join_code", parsed.data.code)
      .maybeSingle();

    if (!data) {
      return { error: "No pool found with that code" };
    }
  } catch (e: unknown) {
    console.error("findPool error:", e);
    return { error: "Something went wrong looking up that pool. Please try again." };
  }

  redirect(`/pools/${parsed.data.code}/join`);
}
