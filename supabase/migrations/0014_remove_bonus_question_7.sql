-- Remove "biggest surprise" question (id=7) from all pools' bonus_questions JSON.
UPDATE pool_settings
SET bonus_questions = (
  SELECT jsonb_agg(q ORDER BY (q->>'id')::int)
  FROM jsonb_array_elements(bonus_questions) q
  WHERE (q->>'id')::int != 7
)
WHERE bonus_questions @> '[{"id": 7}]';
