"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  pool_id: z.string().uuid("Invalid pool"),
  pool_code: z.string().length(6),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or fewer"),
  referred_by_first_name: z
    .string()
    .min(1, "Referrer's first name is required")
    .max(50, "First name must be 50 characters or fewer"),
  referred_by_last_name: z
    .string()
    .min(1, "Referrer's last name is required")
    .max(50, "Last name must be 50 characters or fewer"),
  first_name: z
    .string()
    .min(1, "Your first name is required")
    .max(50, "First name must be 50 characters or fewer"),
  last_name: z
    .string()
    .min(1, "Your last name is required")
    .max(50, "Last name must be 50 characters or fewer"),
});

export type JoinPoolState = { error: string } | null;

export async function joinPool(
  _prevState: JoinPoolState,
  formData: FormData
): Promise<JoinPoolState> {
  const raw = {
    pool_id: formData.get("pool_id") as string,
    pool_code: formData.get("pool_code") as string,
    display_name: ((formData.get("display_name") as string) ?? "").trim(),
    referred_by_first_name: ((formData.get("referred_by_first_name") as string) ?? "").trim(),
    referred_by_last_name: ((formData.get("referred_by_last_name") as string) ?? "").trim(),
    first_name: ((formData.get("first_name") as string) ?? "").trim(),
    last_name: ((formData.get("last_name") as string) ?? "").trim(),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: pool } = await supabase
    .from("pools")
    .select("id, status")
    .eq("join_code", parsed.data.pool_code)
    .maybeSingle();

  if (!pool || pool.id !== parsed.data.pool_id) {
    return { error: "Pool not found" };
  }
  if (pool.status !== "open") {
    if (pool.status === "draft") return { error: "This pool isn't open yet." };
    return { error: "This pool is no longer accepting entries." };
  }

  const { data: nameConflict } = await supabase
    .from("entries")
    .select("id")
    .eq("pool_id", parsed.data.pool_id)
    .ilike("display_name", parsed.data.display_name)
    .maybeSingle();

  if (nameConflict) {
    return { error: "That display name is already taken in this pool. Please choose a different one." };
  }

  const { error } = await supabase.from("entries").insert({
    pool_id: parsed.data.pool_id,
    user_id: user.id,
    display_name: parsed.data.display_name,
    referred_by_first_name: parsed.data.referred_by_first_name,
    referred_by_last_name: parsed.data.referred_by_last_name,
    paid: true,
    submitted_at: null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You are already a member of this pool" };
    }
    return { error: error.message };
  }

  await supabase.auth.updateUser({
    data: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    },
  });

  redirect(`/pools/${parsed.data.pool_code}/entries/new`);
}