-- Self-record prompt: per-user flag indicating the user has dismissed (or
-- accepted) the "do you want a profile for yourself?" prompt that fires on
-- first login when they have no self-row in `children`.
--
-- - FALSE (default) means the prompt should fire when the user has no
--   children row with user_id = users.id.
-- - TRUE means the user explicitly chose "not now" or already created their
--   self-row. We never re-prompt; the Family page exposes an "Add yourself"
--   entry as the manual fallback.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS self_record_prompt_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: if a user already has a self-row (from the 20260429 migration's
-- backfill of personal_record_enabled users, or from any prior auto-create),
-- treat the prompt as already handled.
UPDATE users u
   SET self_record_prompt_dismissed = TRUE
  FROM children c
 WHERE c.user_id = u.id
   AND u.self_record_prompt_dismissed = FALSE;

COMMIT;
