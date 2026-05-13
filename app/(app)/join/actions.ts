"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pools")
    .select("join_code")
    .eq("join_code", parsed.data.code)
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong looking up that pool" };
  }
  if (!data) {
    return { error: "No pool found with that code" };
  }

  redirect(`/pools/${parsed.data.code}/join`);
}