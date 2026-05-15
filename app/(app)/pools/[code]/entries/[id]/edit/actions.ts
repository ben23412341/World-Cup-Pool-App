"use server";

import { createClient } from "@/lib/supabase/server";

type BonusAnswer = {
  question_index: number;
  answer_text: string | null;
  answer_number: number | null;
};

type UpdateEntryPayload = {
  selectedTeamIds: string[];
  tiebreakerGoals: number;
  tiebreakerMinute: number;
  bonusAnswers: BonusAnswer[];
};

// TODO: Wrap the three write operations below (entries update, entry_teams
// replace, entry_bonus_answers replace) in a Postgres RPC function so they
// execute atomically. A failure mid-way currently leaves the entry in a partial
// state (e.g. tiebreakers updated but teams not replaced). Acceptable for a
// small pool now; fix before any meaningful scale by creating a
// update_entry(entry_id, tiebreaker_goals, tiebreaker_minute, team_ids,
// bonus_answers) RPC in supabase/migrations/ and calling it via
// supabase.rpc('update_entry', { ... }).
export async function updateEntry(
  poolCode: string,
  entryId: string,
  payload: UpdateEntryPayload
): Promise<{ error: string } | { success: true; entryId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: pool } = await supabase
    .from("pools")
    .select("id, join_code, status, locks_at")
    .eq("join_code", poolCode.toUpperCase())
    .maybeSingle();

  if (!pool) return { error: "Pool not found." };

  // Pool must be 'open' and before its deadline to allow edits
  const canEdit =
    pool.status === "open" &&
    !(pool.locks_at != null && new Date(pool.locks_at) <= new Date());

  if (!canEdit) {
    return { error: "This pool is not accepting entries." };
  }

  // Ownership check — only the entry owner may update
  const { data: entry } = await supabase
    .from("entries")
    .select("id, user_id")
    .eq("id", entryId)
    .eq("pool_id", pool.id)
    .maybeSingle();

  if (!entry) return { error: "Entry not found." };
  if (entry.user_id !== user.id) return { error: "Not authorized." };

  const { selectedTeamIds, tiebreakerGoals, tiebreakerMinute, bonusAnswers } = payload;

  if (selectedTeamIds.length < 7) {
    return { error: "You must select at least 7 teams." };
  }

  // Validate budget server-side — same logic as submitEntry
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

  // Update the entry row
  const { error: updateError } = await supabase
    .from("entries")
    .update({
      tiebreaker_total_goals: tiebreakerGoals,
      tiebreaker_final_minute: tiebreakerMinute,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (updateError) return { error: "Failed to update entry. Please try again." };

  // Replace entry_teams
  await supabase.from("entry_teams").delete().eq("entry_id", entryId);
  const { error: teamsError } = await supabase.from("entry_teams").insert(
    selectedTeamIds.map((teamId) => ({ entry_id: entryId, team_id: teamId }))
  );
  if (teamsError) return { error: "Failed to save team selection." };

  // Replace entry_bonus_answers — skip blanks so partial participation is fine
  await supabase.from("entry_bonus_answers").delete().eq("entry_id", entryId);
  const filledAnswers = bonusAnswers.filter(
    (a) => a.answer_text !== null || a.answer_number !== null
  );
  if (filledAnswers.length > 0) {
    const { error: answersError } = await supabase
      .from("entry_bonus_answers")
      .insert(
        filledAnswers.map((a) => ({
          entry_id: entryId,
          question_index: a.question_index,
          answer_text: a.answer_text,
          answer_number: a.answer_number,
        }))
      );
    if (answersError) return { error: "Failed to save bonus answers." };
  }

  return { success: true, entryId };
}
