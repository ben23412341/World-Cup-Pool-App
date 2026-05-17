-- =============================================================================
-- 0005_bonus_pool_scoring.sql
-- Bonus pool scoring: per-answer correctness marks, owner's reference answers,
-- and a finalization flag that reveals the winner on the leaderboard.
-- =============================================================================

-- Nullable correctness mark on each bonus answer
-- null = unmarked, true = correct, false = incorrect
ALTER TABLE entry_bonus_answers ADD COLUMN is_correct boolean;

-- Pool owner needs UPDATE access to set is_correct on entries in their pool
CREATE POLICY "entry_bonus_answers_pool_owner_update" ON entry_bonus_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM entries e
      WHERE e.id = entry_id AND is_pool_owner(e.pool_id)
    )
  );

-- Finalization flag — when true, the winner is shown on the leaderboard
ALTER TABLE pools ADD COLUMN bonus_finalized boolean NOT NULL DEFAULT false;

-- Owner's reference correct answer per question per pool.
-- answer_text covers both text-type and team-type answers (team UUID stored as text),
-- mirroring how entry_bonus_answers stores team answers.
CREATE TABLE bonus_correct_answers (
  pool_id        uuid    NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  question_index integer NOT NULL CHECK (question_index BETWEEN 1 AND 11),
  answer_text    text,
  answer_number  integer,
  PRIMARY KEY (pool_id, question_index)
);

ALTER TABLE bonus_correct_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bonus_correct_answers_owner_all" ON bonus_correct_answers
  FOR ALL
  USING (is_pool_owner(pool_id))
  WITH CHECK (is_pool_owner(pool_id));

CREATE POLICY "bonus_correct_answers_member_read" ON bonus_correct_answers
  FOR SELECT
  USING (is_pool_member(pool_id));
