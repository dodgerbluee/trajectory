-- Change tracking / audit history
-- Generic table for Visit, Illness, and future entities. Tracks who changed what and when
-- with field-level before/after values in JSONB.
-- Idempotent: uses IF NOT EXISTS for all objects.

CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('visit', 'illness')),
    entity_id INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    request_id UUID,
    changes JSONB NOT NULL,
    summary TEXT
);

-- Indexing recommendations:
--
-- 1. History for a single record: "all changes for this visit/illness, newest first"
--    Use: WHERE entity_type = $1 AND entity_id = $2 ORDER BY changed_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON audit_events (entity_type, entity_id, changed_at DESC);

-- 2. By user: "everything this user changed"
--    Use: WHERE user_id = $1 ORDER BY changed_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_events_user
    ON audit_events (user_id, changed_at DESC)
    WHERE user_id IS NOT NULL;

-- 3. By time: global timeline or retention/partitioning
CREATE INDEX IF NOT EXISTS idx_audit_events_changed_at
    ON audit_events (changed_at DESC);

-- 4. Query by field inside changes (e.g. "events where visit_date was changed")
--    Use: WHERE entity_type = 'visit' AND changes ? 'visit_date'
CREATE INDEX IF NOT EXISTS idx_audit_events_changes_gin
    ON audit_events USING GIN (changes);

-- Optional: idempotency for retries (dedupe by request_id per entity)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_request_id
--     ON audit_events (entity_type, entity_id, request_id)
--     WHERE request_id IS NOT NULL;

-- Example stored change record (for documentation; not inserted):
--
-- id: 1
-- entity_type: 'visit'
-- entity_id: 42
-- user_id: 5
-- action: 'updated'
-- changed_at: '2026-01-28T14:30:00.000Z'
-- request_id: null
-- changes: {
--   "visit_date":   { "before": "2026-01-15", "after": "2026-01-16" },
--   "weight_value": { "before": 24.5, "after": 25 },
--   "notes":        { "before": "Follow up in 2 weeks", "after": null }
-- }
-- summary: 'Updated visit_date, weight_value, notes'
