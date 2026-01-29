-- Migrate legacy visit_history rows into audit_events so they appear on the new history UI.
-- Each migrated row gets a placeholder in "changes" indicating detailed field-level data was not recorded.
-- Idempotent: skips rows that already have a matching audit_events row (same visit, same time).

-- Legacy placeholder shown in the changes section of the history UI.
-- Frontend can display this as "Legacy history entry — detailed changes were not recorded."
INSERT INTO audit_events (entity_type, entity_id, user_id, action, changed_at, changes, summary)
SELECT
  'visit'::VARCHAR(50),
  vh.visit_id,
  vh.user_id,
  CASE vh.action
    WHEN 'attachment_uploaded' THEN 'updated'::VARCHAR(20)
    ELSE vh.action::VARCHAR(20)
  END,
  vh.created_at,
  '{"_legacy": {"before": null, "after": "Legacy history entry — detailed changes were not recorded."}}'::jsonb,
  COALESCE(vh.description, 'Legacy history entry')
FROM visit_history vh
WHERE NOT EXISTS (
  SELECT 1
  FROM audit_events ae
  WHERE ae.entity_type = 'visit'
    AND ae.entity_id = vh.visit_id
    AND ae.changed_at = vh.created_at
);
