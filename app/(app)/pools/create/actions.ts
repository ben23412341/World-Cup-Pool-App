"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createPoolSchema = z.object({
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

const BONUS_QUESTIONS = [
  { id: 1, text: "Which team will win the World Cup?", type: "team" },
  { id: 2, text: "Which team will be the runner-up (lose the final)?", type: "team" },
  { id: 3, text: "Which team will finish in 3rd place?", type: "team" },
  { id: 4, text: "Who will win the Golden Boot (top scorer)?", type: "text" },
  { id: 5, text: "Who will win the Golden Ball (best player)?", type: "text" },
  { id: 6, text: "Which team will top their group with the most points?", type: "team" },
  { id: 7, text: "Which team will be the biggest surprise of the tournament?", type: "team" },
  { id: 8, text: "Which team will score the most goals in total?", type: "team" },
  { id: 9, text: "How many total goals will be scored across all 104 matches?", type: "number" },
  { id: 10, text: "How many matches will be decided by a penalty shootout?", type: "number" },
  { id: 11, text: "How many goals will be scored against USA throughout the tournament?", type: "number" },
];

export type CreatePoolState = { error: string } | null;

export async function createPool(
  _prevState: CreatePoolState,
  formData: FormData
): Promise<CreatePoolState> {
  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    locks_at: formData.get("locks_at") as string,
  };

  const parsed = createPoolSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      locks_at: new Date(parsed.data.locks_at).toISOString(),
      status: "draft",
    })
    .select("id, join_code")
    .single();

  if (poolError || !pool) {
    return { error: poolError?.message ?? "Failed to create pool" };
  }

  const { error: settingsError } = await supabase
    .from("pool_settings")
    .insert({ pool_id: pool.id, bonus_questions: BONUS_QUESTIONS });

  if (settingsError) {
    await supabase.from("pools").delete().eq("id", pool.id);
    return { error: settingsError.message };
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id");

  if (teamsError || !teams?.length) {
    await supabase.from("pools").delete().eq("id", pool.id);
    return { error: teamsError?.message ?? "No teams found in database" };
  }

  const { error: poolTeamsError } = await supabase
    .from("pool_teams")
    .insert(teams.map((t) => ({ pool_id: pool.id, team_id: t.id })));

  if (poolTeamsError) {
    await supabase.from("pools").delete().eq("id", pool.id);
    return { error: poolTeamsError.message };
  }

  redirect(`/pools/${pool.join_code}`);
}
