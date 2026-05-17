"use server";

import { createClient } from "@/lib/supabase/server";

export async function removeEntry(
  entryId: string
): Promise<{ error: string } | { redirectTo: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Fetch the entry and verify caller is the pool owner
  const { data: entry } = await supabase
    .from("entries")
    .select("id, pool_id, user_id, pools!inner(owner_id, join_code)")
    .eq("id", entryId)
    .single();

  if (!entry) return { error: "Entry not found." };

  const pool = entry.pools as unknown as { owner_id: string; join_code: string };

  if (pool.owner_id !== user.id) return { error: "Only the pool owner can remove entries." };
  if (entry.user_id === user.id) return { error: "You cannot remove your own entry this way." };

  const { error } = await supabase.from("entries").delete().eq("id", entryId);

  if (error) return { error: "Failed to remove entry: " + error.message };

  return { redirectTo: `/pools/${pool.join_code}` };
}
