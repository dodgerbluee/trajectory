-- Trajectory database schema
-- PostgreSQL

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

-- Visits (wellness, sick, injury, vision)
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

-- Illnesses
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

CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_events_updated_at BEFORE UPDATE ON medical_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_illnesses_updated_at BEFORE UPDATE ON illnesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data
INSERT INTO children (name, date_of_birth, gender, notes) VALUES
    ('Emma Johnson', '2022-03-15', 'female', 'First child, no known allergies'),
    ('Liam Smith', '2020-07-22', 'male', 'Lactose intolerant'),
    ('Olivia Brown', '2023-11-08', 'female', NULL);

INSERT INTO measurements (child_id, measurement_date, label, weight_value, weight_ounces, weight_percentile, height_value, height_percentile, head_circumference_value, head_circumference_percentile) VALUES
    (1, '2022-03-15', 'Birth', 7, 3, 45.0, 19.50, 50.0, 13.80, 48.0),
    (1, '2022-04-15', '1 month checkup', 8, 13, 52.0, 21.25, 55.0, 14.50, 50.0),
    (1, '2022-06-15', '3 month checkup', 12, 8, 60.0, 23.75, 62.0, 15.80, 58.0),
    (1, '2022-09-15', '6 month checkup', 16, 3, 65.0, 26.00, 68.0, 17.00, 62.0),
    (1, '2023-03-15', '1 year checkup', 22, 0, 70.0, 30.00, 72.0, 18.20, 65.0),
    (1, '2024-03-15', '2 year checkup', 28, 8, 72.0, 34.50, 75.0, 19.00, 68.0),
    (2, '2020-07-22', 'Birth', 8, 2, 58.0, 20.50, 60.0, 14.20, 55.0),
    (2, '2021-07-22', '1 year checkup', 24, 0, 75.0, 31.00, 78.0, 18.50, 70.0),
    (2, '2022-07-22', '2 year checkup', 30, 8, 78.0, 36.00, 80.0, 19.50, 72.0),
    (2, '2023-07-22', '3 year checkup', 35, 0, 75.0, 39.50, 78.0, 20.00, 70.0),
    (2, '2024-07-22', '4 year checkup', 40, 8, 72.0, 42.00, 75.0, 20.30, 68.0),
    (3, '2023-11-08', 'Birth', 6, 13, 38.0, 19.00, 42.0, 13.50, 40.0),
    (3, '2023-12-08', '1 month checkup', 8, 3, 42.0, 20.50, 45.0, 14.20, 43.0),
    (3, '2024-02-08', '3 month checkup', 11, 13, 48.0, 23.00, 50.0, 15.50, 48.0),
    (3, '2024-05-08', '6 month checkup', 15, 8, 52.0, 25.50, 55.0, 16.80, 52.0),
    (3, '2024-11-08', '1 year checkup', 21, 0, 58.0, 29.50, 60.0, 18.00, 58.0);

INSERT INTO medical_events (child_id, event_type, start_date, end_date, description) VALUES
    (1, 'doctor_visit', '2022-03-15', NULL, 'Initial newborn checkup. All vitals normal. Received first Hepatitis B vaccine.'),
    (1, 'doctor_visit', '2022-04-15', NULL, '1-month wellness visit. Growing well, no concerns.'),
    (1, 'illness', '2022-05-10', '2022-05-14', 'Common cold. Mild congestion and cough. Resolved without medication.'),
    (1, 'doctor_visit', '2022-06-15', NULL, '3-month checkup. Received DTaP, Hib, IPV, PCV vaccines.'),
    (1, 'illness', '2023-01-20', '2023-01-27', 'Ear infection. Prescribed amoxicillin. Full recovery.'),
    (1, 'doctor_visit', '2023-03-15', NULL, '1-year wellness visit. Received MMR and Varicella vaccines.'),
    (2, 'doctor_visit', '2020-07-22', NULL, 'Birth checkup. Healthy newborn, APGAR scores 9/10.'),
    (2, 'illness', '2021-03-15', '2021-03-18', 'Mild fever and runny nose. Monitored at home, no intervention needed.'),
    (2, 'doctor_visit', '2021-07-22', NULL, '1-year wellness visit. All vaccinations up to date.'),
    (2, 'illness', '2022-11-05', '2022-11-12', 'Stomach bug. Vomiting and diarrhea. Maintained hydration, recovered fully.'),
    (2, 'doctor_visit', '2024-07-22', NULL, '4-year wellness visit. Vision and hearing screening passed.'),
    (3, 'doctor_visit', '2023-11-08', NULL, 'Birth checkup. Healthy delivery, no complications.'),
    (3, 'doctor_visit', '2023-12-08', NULL, '1-month wellness visit. Feeding well, gaining weight appropriately.'),
    (3, 'illness', '2024-06-15', '2024-06-18', 'Mild diaper rash. Treated with zinc oxide cream. Cleared up quickly.'),
    (3, 'doctor_visit', '2024-11-08', NULL, '1-year wellness visit. Developmental milestones on track.');
