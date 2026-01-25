-- Initial Trajectory database schema
-- This migration creates all tables, indexes, constraints, and functions
-- Idempotent: Uses IF NOT EXISTS for all objects

-- Helper function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Children table
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

-- Measurements table
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

-- Medical events table
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

-- Visits table (wellness, sick, injury, vision)
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
    illness_type VARCHAR(100),
    symptoms TEXT,
    temperature DECIMAL(4,2),
    end_date DATE,
    injury_type VARCHAR(100),
    injury_location VARCHAR(255),
    treatment TEXT,
    follow_up_date DATE,
    vision_prescription TEXT,
    needs_glasses BOOLEAN,
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
    CONSTRAINT check_visits_end_date CHECK (end_date IS NULL OR end_date >= visit_date),
    CONSTRAINT check_heart_rate_range CHECK (heart_rate IS NULL OR (heart_rate >= 40 AND heart_rate <= 250)),
    CONSTRAINT check_illness_type_for_sick CHECK (
        (visit_type = 'sick' AND illness_type IS NOT NULL) OR (visit_type IN ('wellness', 'injury', 'vision'))
    )
);

-- Illnesses table
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

-- Shared sequence for attachment IDs
CREATE SEQUENCE IF NOT EXISTS attachment_id_seq;

-- Measurement attachments table
CREATE TABLE IF NOT EXISTS measurement_attachments (
    id INTEGER PRIMARY KEY DEFAULT nextval('attachment_id_seq'),
    measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Visit attachments table
CREATE TABLE IF NOT EXISTS visit_attachments (
    id INTEGER PRIMARY KEY DEFAULT nextval('attachment_id_seq'),
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Child attachments table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_child_date ON measurements(child_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_events_child_date ON medical_events(child_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_child_date ON visits(child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);
CREATE INDEX IF NOT EXISTS idx_visits_illness ON visits(illness_type) WHERE illness_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_injury_type ON visits(injury_type) WHERE injury_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_illnesses_child_date ON illnesses(child_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_illnesses_severity ON illnesses(severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_measurement_attachments_measurement ON measurement_attachments(measurement_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_child_attachments_child ON child_attachments(child_id);

-- Triggers for automatic updated_at timestamps
-- Create triggers only if they don't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_children_updated_at'
    ) THEN
        CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_measurements_updated_at'
    ) THEN
        CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_events_updated_at'
    ) THEN
        CREATE TRIGGER update_medical_events_updated_at BEFORE UPDATE ON medical_events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_visits_updated_at'
    ) THEN
        CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_illnesses_updated_at'
    ) THEN
        CREATE TRIGGER update_illnesses_updated_at BEFORE UPDATE ON illnesses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
