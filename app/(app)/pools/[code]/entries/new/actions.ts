"use server";

import { createClient } from "@/lib/supabase/server";

type BonusAnswer = {
  question_index: number;
  answer_text: string | null;
  answer_number: number | null;
};

type SubmitEntryPayload = {
  selectedTeamIds: string[];
  tiebreakerGoals: number;
  tiebreakerMinute: number;
  bonusAnswers: BonusAnswer[];
};

export async function submitEntry(
  poolCode: string,
  payload: SubmitEntryPayload
): Promise<{ error: string } | { success: true; entryId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: pool } = await supabase
    .from("pools")
    .select("id, join_code")
    .eq("join_code", poolCode.toUpperCase())
    .maybeSingle();
  if (!pool) return { error: "Pool not found." };

  const { data: entry } = await supabase
    .from("entries")
    .select("id")
    .eq("pool_id", pool.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entry) return { error: "Entry not found. Join the pool first." };

  const { selectedTeamIds, tiebreakerGoals, tiebreakerMinute, bonusAnswers } =
    payload;

  if (selectedTeamIds.length < 7) {
    return { error: "You must select at least 7 teams." };
  }

  // Validate cost via DB so the server is the authority
  const { data: teamRows } = await supabase
    .from("pool_teams")
    .select("team_id, cost_override, teams!inner(id, cost)")
    .eq("pool_id", pool.id)
    .in("team_id", selectedTeamIds);

  if (!teamRows || teamRows.length !== selectedTeamIds.length) {
    return { error: "Invalid team selection — some teams not found in this pool." };
  }

  const totalCost = teamRows.reduce((sum, row) => {
    const t = row.teams as unknown as { id: string; cost: number };
    return sum + (row.cost_override ?? t.cost);
  }, 0);

  if (totalCost > 30) {
    return {
      error: `Selection exceeds the 30 Pesodollar budget (${totalCost} used).`,
    };
  }

  // Stamp the entry as submitted
  const { error: updateError } = await supabase
    .from("entries")
    .update({
      tiebreaker_total_goals: tiebreakerGoals,
      tiebreaker_final_minute: tiebreakerMinute,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", entry.id);

  if (updateError) return { error: "Failed to save entry. Please try again." };

  // Replace entry_teams
  await supabase.from("entry_teams").delete().eq("entry_id", entry.id);
  const { error: teamsError } = await supabase.from("entry_teams").insert(
    selectedTeamIds.map((teamId) => ({ entry_id: entry.id, team_id: teamId }))
  );
  if (teamsError) return { error: "Failed to save team selection." };

  // Replace entry_bonus_answers — skip blanks so partial participation is fine
  await supabase.from("entry_bonus_answers").delete().eq("entry_id", entry.id);
  const filledAnswers = bonusAnswers.filter(
    (a) => a.answer_text !== null || a.answer_number !== null
  );
  if (filledAnswers.length > 0) {
    const { error: answersError } = await supabase
      .from("entry_bonus_answers")
      .insert(
        filledAnswers.map((a) => ({
          entry_id: entry.id,
          question_index: a.question_index,
          answer_text: a.answer_text,
          answer_number: a.answer_number,
        }))
      );
    if (answersError) return { error: "Failed to save bonus answers." };
  }

  return { success: true, entryId: entry.id };
}
