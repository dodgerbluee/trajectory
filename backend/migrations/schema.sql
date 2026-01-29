-- Trajectory database schema (setup / configuration)
-- Idempotent: safe to run on fresh install or existing DB (IF NOT EXISTS / no-op when objects exist)
-- Applied by the app on startup (backend db setup runner).

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Children
CREATE TABLE IF NOT EXISTS children (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female')),
    avatar VARCHAR(255),
    notes TEXT,
    due_date DATE,
    birth_weight DECIMAL(5,2),
    birth_weight_ounces INTEGER,
    birth_height DECIMAL(6,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_birth_weight_ounces CHECK (birth_weight_ounces IS NULL OR (birth_weight_ounces >= 0 AND birth_weight_ounces < 16))
);

-- Measurements
CREATE TABLE IF NOT EXISTS measurements (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    label VARCHAR(255),
    weight_value DECIMAL(5,2),
    weight_ounces INTEGER,
    weight_percentile DECIMAL(5,2),
    height_value DECIMAL(6,2),
    height_percentile DECIMAL(5,2),
    head_circumference_value DECIMAL(6,2),
    head_circumference_percentile DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_has_measurement CHECK (
        weight_value IS NOT NULL OR height_value IS NOT NULL OR head_circumference_value IS NOT NULL
    ),
    CONSTRAINT check_percentile_range CHECK (
        (weight_percentile IS NULL OR (weight_percentile >= 0 AND weight_percentile <= 100)) AND
        (height_percentile IS NULL OR (height_percentile >= 0 AND height_percentile <= 100)) AND
        (head_circumference_percentile IS NULL OR (head_circumference_percentile >= 0 AND head_circumference_percentile <= 100))
    ),
    CONSTRAINT check_weight_ounces_range CHECK (weight_ounces IS NULL OR (weight_ounces >= 0 AND weight_ounces < 16))
);

-- Medical events
CREATE TABLE IF NOT EXISTS medical_events (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('doctor_visit', 'illness')),
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Visits (current schema: no illness_type, no follow_up_date; has vision_refraction, ordered_glasses/contacts, illness_start_date)
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50) NOT NULL CHECK (visit_type IN ('wellness', 'sick', 'injury', 'vision')),
    location VARCHAR(255),
    doctor_name VARCHAR(255),
    title VARCHAR(255),
    weight_value DECIMAL(5,2),
    weight_ounces INTEGER,
    weight_percentile DECIMAL(5,2),
    height_value DECIMAL(6,2),
    height_percentile DECIMAL(5,2),
    head_circumference_value DECIMAL(6,2),
    head_circumference_percentile DECIMAL(5,2),
    bmi_value DECIMAL(5,2),
    bmi_percentile DECIMAL(5,2),
    blood_pressure VARCHAR(20),
    heart_rate INTEGER,
    symptoms TEXT,
    temperature DECIMAL(4,2),
    illness_start_date DATE,
    end_date DATE,
    injury_type VARCHAR(100),
    injury_location VARCHAR(255),
    treatment TEXT,
    vision_prescription TEXT,
    needs_glasses BOOLEAN,
    ordered_glasses BOOLEAN,
    ordered_contacts BOOLEAN,
    vision_refraction JSONB,
    vaccines_administered TEXT,
    prescriptions JSONB,
    tags TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_visits_weight_ounces CHECK (weight_ounces IS NULL OR (weight_ounces >= 0 AND weight_ounces < 16)),
    CONSTRAINT check_visits_percentile CHECK (
        (weight_percentile IS NULL OR (weight_percentile >= 0 AND weight_percentile <= 100)) AND
        (height_percentile IS NULL OR (height_percentile >= 0 AND height_percentile <= 100)) AND
        (head_circumference_percentile IS NULL OR (head_circumference_percentile >= 0 AND head_circumference_percentile <= 100)) AND
        (bmi_percentile IS NULL OR (bmi_percentile >= 0 AND bmi_percentile <= 100))
    ),
    CONSTRAINT check_visits_temperature CHECK (temperature IS NULL OR (temperature >= 95.0 AND temperature <= 110.0)),
    CONSTRAINT check_visits_illness_start_date CHECK (illness_start_date IS NULL OR illness_start_date <= visit_date),
    CONSTRAINT check_visits_end_date CHECK (end_date IS NULL OR end_date >= COALESCE(illness_start_date, visit_date)),
    CONSTRAINT check_heart_rate_range CHECK (heart_rate IS NULL OR (heart_rate >= 40 AND heart_rate <= 250))
);

-- Visit–illness join (illnesses recorded at a visit)
CREATE TABLE IF NOT EXISTS visit_illnesses (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    illness_type VARCHAR(100) NOT NULL
);

-- Illnesses (standalone records)
CREATE TABLE IF NOT EXISTS illnesses (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    illness_type VARCHAR(100) NOT NULL CHECK (illness_type IN (
        'flu', 'strep', 'rsv', 'covid', 'cold', 'stomach_bug',
        'ear_infection', 'hand_foot_mouth', 'croup', 'pink_eye', 'other'
    )),
    start_date DATE NOT NULL,
    end_date DATE,
    symptoms TEXT,
    temperature DECIMAL(4,2) CHECK (temperature IS NULL OR (temperature >= 95.0 AND temperature <= 110.0)),
    severity INTEGER CHECK (severity IS NULL OR (severity >= 1 AND severity <= 10)),
    visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT check_illnesses_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Attachments
CREATE SEQUENCE IF NOT EXISTS attachment_id_seq;

CREATE TABLE IF NOT EXISTS measurement_attachments (
    id INTEGER PRIMARY KEY DEFAULT nextval('attachment_id_seq'),
    measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visit_attachments (
    id INTEGER PRIMARY KEY DEFAULT nextval('attachment_id_seq'),
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS child_attachments (
    id INTEGER PRIMARY KEY DEFAULT nextval('attachment_id_seq'),
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL DEFAULT 'vaccine_report',
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Auth (users, sessions, reset tokens, login attempts)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit (change history for visits/illnesses)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_measurements_child_date ON measurements(child_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_events_child_date ON medical_events(child_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_child_date ON visits(child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);
CREATE INDEX IF NOT EXISTS idx_visits_injury_type ON visits(injury_type) WHERE injury_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_illnesses_visit ON visit_illnesses(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_illnesses_type ON visit_illnesses(illness_type);
CREATE INDEX IF NOT EXISTS idx_illnesses_child_date ON illnesses(child_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_illnesses_severity ON illnesses(severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_measurement_attachments_measurement ON measurement_attachments(measurement_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_child_attachments_child ON child_attachments(child_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ip ON login_attempts(email, ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted ON login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events (entity_type, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events (user_id, changed_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_events_changed_at ON audit_events (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_changes_gin ON audit_events USING GIN (changes);

-- Triggers (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_children_updated_at') THEN
        CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_measurements_updated_at') THEN
        CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_events_updated_at') THEN
        CREATE TRIGGER update_medical_events_updated_at BEFORE UPDATE ON medical_events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_visits_updated_at') THEN
        CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_illnesses_updated_at') THEN
        CREATE TRIGGER update_illnesses_updated_at BEFORE UPDATE ON illnesses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
