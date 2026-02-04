# Backend Scripts

Utility scripts for development and maintenance.

## Mock Data Seeder

Creates mock data for development and testing.

### Usage

#### Docker (Recommended)

```bash
# From project root - seed with defaults (username: dev / password: devpass123)
npm run docker:seed

# Clear existing data and reseed
npm run docker:seed:clear

# With custom options
docker compose exec app node dist/scripts/seed-mock-data.js --username admin --password secret

# Show help
docker compose exec app node dist/scripts/seed-mock-data.js --help
```

#### Local Development

```bash
# From backend directory
cd backend

npm run db:seed
npm run db:seed:clear

# With custom options
npx tsx src/scripts/seed-mock-data.ts --username myuser --password mypass
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--clear` | Clear all existing data before seeding | false |
| `--username <user>` | Custom username for login | `dev` |
| `--password <pass>` | Custom password | `devpass123` |
| `--help` | Show help message | - |

### Default Login Credentials

- **Username:** `dev`
- **Password:** `devpass123`

### What Gets Created

#### User & Family
- One user account (login with username + password)
- One family ("Development Family")
- User is set as family owner

#### Children (5)
| Name | Gender | Age | Born |
|------|--------|-----|------|
| Ella | Female | 8 years | 2017-02-02 |
| Matthew | Male | 10 years | 2015-02-02 |
| Miguel | Male | 7 years | 2018-02-02 |
| Charlie | Male | 4 years | 2021-02-02 |
| Chekov | Male | 8 months | 2024-06-02 |

#### Health Data
- **Wellness Visits**: At pediatric milestones (newborn through 10 years)
- **Vaccines**: CDC schedule vaccines at appropriate visits
- **Vision Exams**: Annual exams starting at age 3
- **Dental Visits**: Biannual checkups starting at age 2
- **Sick Visits**: 2-4 per year of life with various illness types
- **Illnesses**: Standalone illness records with severity tracking
- **Measurements**: Growth data (monthly <2yo, quarterly after)

### Troubleshooting

| Error | Solution |
|-------|----------|
| "relation does not exist" | App hasn't started yet (runs migrations on startup) |
| "connection refused" | Database not running - `docker compose up -d` |
| "duplicate key" | Use `--clear` flag to remove existing data |
| "password authentication failed" | Check DATABASE_URL in docker-compose.yml |

---

## Other Scripts

| File | Description |
|------|-------------|
| `make-admin.sql` | SQL to make a user an instance admin |
| `seed-mock-data.sql` | Simple SQL seed (legacy) |
| `seed-mock-data-*.js` | Legacy JavaScript versions (deprecated) |
