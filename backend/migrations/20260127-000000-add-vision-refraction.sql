-- Add vision_refraction JSONB column to visits
ALTER TABLE visits
ADD COLUMN vision_refraction JSONB;

-- Note: we keep the existing `vision_prescription` TEXT column for backward compatibility.
