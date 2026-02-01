-- Onboarding completed flag: when true, user has finished or skipped the Welcome flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
