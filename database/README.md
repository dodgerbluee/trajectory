# Database

PostgreSQL schema for Trajectory. The app uses a single init script—no migrations.

## Setup

When you run `docker-compose up`, the database container mounts `init.sql` into `/docker-entrypoint-initdb.d/`. Postgres runs it on first startup and creates all tables, indexes, triggers, and seed data.

## Schema overview

- **children** — Kids (name, DOB, gender, avatar, birth stats, notes)
- **measurements** — Growth data per child (weight, height, head circumference, percentiles)
- **medical_events** — Doctor visits and illnesses per child (description-based)
- **visits** — Unified visits: wellness, sick, injury, vision (measurements, vaccines, prescriptions, etc.)
- **illnesses** — Illness tracking, optionally linked to visits (type, severity, dates)
- **measurement_attachments** / **visit_attachments** / **child_attachments** — File uploads, shared ID sequence

Seed data adds three sample children with measurements and medical events for local dev.
