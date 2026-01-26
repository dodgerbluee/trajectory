-- Visit History table to track all updates to visits
CREATE TABLE IF NOT EXISTS visit_history (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'attachment_uploaded')),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_history_visit_id ON visit_history(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_created_at ON visit_history(created_at DESC);

-- Migrate existing visit creation dates to history
INSERT INTO visit_history (visit_id, action, description, created_at)
SELECT id, 'created', 'Visit created', created_at
FROM visits
ON CONFLICT DO NOTHING;

-- Migrate existing visit update dates to history (if updated_at differs from created_at)
INSERT INTO visit_history (visit_id, action, description, created_at)
SELECT id, 'updated', 'Visit updated', updated_at
FROM visits
WHERE updated_at != created_at
ON CONFLICT DO NOTHING;
