-- Track when a pool's status last changed and what it was before,
-- to support a 5-minute undo window for status transitions.
ALTER TABLE pools
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_status    text;

-- Backfill existing rows so the columns are non-null where possible.
-- previous_status stays null (no history before this migration).
UPDATE pools
SET status_changed_at = created_at
WHERE status_changed_at IS NULL;
