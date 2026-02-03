# Production Deployment Guide

## Architecture

Trajectory uses a **unified container** approach - a single pre-built container serves both the frontend UI and backend API. This simplifies deployment and configuration.

**Services:**
- `app` - Pre-built unified container (frontend + backend) on port 3001
- `database` - PostgreSQL database

**Image Source:**
- Images are built automatically on merge to `main` and published to GitHub Container Registry
- Production uses pre-built images - no build step required

## Deployment Options

- **Direct Port Access**: Expose app port directly
- **Nginx Proxy Manager**: Recommended - configure a reverse proxy to your app URL

## Portainer Deployment

### Prerequisites
- Portainer instance with Docker/Compose support
- Git repository access (or upload files manually)
- Strong database password

### Setup Steps

1. **Prepare Environment File**
   ```bash
   cp .env.prod.example .env
   # Edit .env and set strong passwords
   ```

2. **In Portainer:**
   - Navigate to **Stacks** → **Add Stack**
   - Name: `trajectory`
   - Build Method: **Web editor** (recommended) or **Repository**
   - If using Web editor: Copy contents of `docker-compose.prod.yml`
   - If using Repository: Repository URL and Compose path: `docker-compose.prod.yml`
   - Environment variables: Upload `.env` file or configure in Portainer
   - **Important**: Set `IMAGE` variable to your image location (e.g., `ghcr.io/your-org/trajectory:latest`)

3. **Deploy Stack**
   - Click **Deploy the stack**
   - Monitor logs in Portainer

### Resource limits (optional)

You can limit the app container's CPU and memory to avoid runaway usage. Example in your compose or stack:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

Adjust values for your host. The database container can be limited similarly (e.g. 256M–1G depending on data size).

### Environment Variables

Required in `.env`:
- `IMAGE` - Docker image location (e.g., `ghcr.io/your-org/trajectory:latest`)
  - Defaults to `ghcr.io/${GITHUB_REPOSITORY}:latest` if `GITHUB_REPOSITORY` is set
  - Use `:latest` for production, `:dev` for latest dev build, or specific version tags
- `DB_PASSWORD` - Strong password for PostgreSQL
- `POSTGRES_DB` - Database name (default: `trajectory`)
- `POSTGRES_USER` - Database user (default: `trajectory_user`)
- `JWT_SECRET` - Strong random secret for access tokens (e.g. `openssl rand -base64 32`). The app refuses to start in production if this is unset or still the placeholder value.
- `JWT_REFRESH_SECRET` - Strong random secret for refresh tokens. Same requirement as `JWT_SECRET`.

Optional:
- `PORT` - App port (default: `3001`) - Only needed for direct access
- `LOG_LEVEL` - Log level: `error`, `warn`, `info`, or `debug` (default: `info`). Reduces noise in production.
- `TZ` - Timezone for the app and database (e.g. `America/New_York`, `Europe/London`). Default: `UTC`. Used for server-side dates and for the UI display timezone (exposed via `/health`).
- `GITHUB_REPOSITORY` - Auto-populated in GitHub Actions, set manually if needed (e.g., `your-org/trajectory`)

### Access

**Direct Port Access:**
- App (UI + API): `http://your-host:${PORT:-3001}`
- Frontend UI: `http://your-host:${PORT:-3001}/`
- Backend API: `http://your-host:${PORT:-3001}/api`

**Nginx Proxy Manager:**
- Configure a reverse proxy to your app URL (e.g. `https://yourdomain.com/trajectory` or your path)

**TLS:** The app does not terminate TLS. Configure your reverse proxy to use **TLS 1.2 or newer** and strong ciphers. Disable TLS 1.0/1.1 for production.

**Clock / NTP:** Dates and times are stored in the database and used for visits, illnesses, and measurements. Ensure the host (and containers) use NTP or a time sync service so clocks do not drift; incorrect time can affect sorting and reporting.

**Timezone:** Set `TZ` in your compose environment (e.g. `TZ=America/New_York`) so the app and database use a consistent timezone for dates and times. The UI fetches the configured timezone from `/health` and uses it for formatting. Default is UTC.

### Volumes
Data is persisted in Docker volumes:
- `trajectory_data` - PostgreSQL data
- `trajectory_uploads` - File uploads (backend uses `UPLOAD_DIR`, default `/app/uploads` in container)
- `trajectory_avatars` - Avatar images (backend uses `AVATAR_DIR`, default `/app/avatars` in container)

You can override `UPLOAD_DIR` and `AVATAR_DIR` in the app environment if your compose mounts volumes to different paths inside the container.

### Backup

**Stop the app before backing up** so the database and files are consistent.

1. Stop the stack (Portainer: **Stacks** → **trajectory** → **Stop**, or `docker compose down`).
2. Back up all three volumes. Example (from host, adjust paths for your setup):
   ```bash
   # Create a backup directory
   mkdir -p backup
   # PostgreSQL data
   docker run --rm -v trajectory_data:/data -v "$(pwd)/backup:/backup" alpine tar czf /backup/trajectory_data.tar.gz -C /data .
   # Uploads
   docker run --rm -v trajectory_uploads:/data -v "$(pwd)/backup:/backup" alpine tar czf /backup/trajectory_uploads.tar.gz -C /data .
   # Avatars
   docker run --rm -v trajectory_avatars:/data -v "$(pwd)/backup:/backup" alpine tar czf /backup/trajectory_avatars.tar.gz -C /data .
   ```
3. Start the stack again.

**Backup encryption:** The app does not encrypt backups. You can encrypt the backup files or volume yourself (e.g. encrypt the tar with GPG, or use an encrypted volume/backup tool). Store encryption keys securely; key management is the operator's responsibility.

**Encryption at rest:** The app does not encrypt data at rest in the database or uploads. For production, use an encrypted volume or disk for the DB and uploads if desired (e.g. LUKS, BitLocker, or your cloud's encrypted volume). A longer-term strategy doc is in [implementation/encryption-at-rest-strategy.md](implementation/encryption-at-rest-strategy.md) (deferred).

### Restore

For a templated approach to testing and (optionally) automating restore, see [implementation/restore-process-template.md](implementation/restore-process-template.md).

1. Stop the stack.
2. Restore each volume from your backup (use the **same image version** or one compatible with the backup). Example:
   ```bash
   # Restore PostgreSQL data (creates/overwrites volume content)
   docker run --rm -v trajectory_data:/data -v "$(pwd)/backup:/backup" alpine sh -c "rm -rf /data/* /data/..?* 2>/dev/null; tar xzf /backup/trajectory_data.tar.gz -C /data"
   # Restore uploads
   docker run --rm -v trajectory_uploads:/data -v "$(pwd)/backup:/backup" alpine sh -c "rm -rf /data/* /data/..?* 2>/dev/null; tar xzf /backup/trajectory_uploads.tar.gz -C /data"
   # Restore avatars
   docker run --rm -v trajectory_avatars:/data -v "$(pwd)/backup:/backup" alpine sh -c "rm -rf /data/* /data/..?* 2>/dev/null; tar xzf /backup/trajectory_avatars.tar.gz -C /data"
   ```
3. Set `IMAGE` to the app version that matches the backup (see [Versioning](VERSIONING.md)).
4. Start the stack. Migrations run on startup.

### Upgrade

1. Pull the new image (or set `IMAGE` to the new version tag): e.g. `docker pull ghcr.io/your-org/trajectory:latest` or use a specific tag.
2. Stop the stack.
3. Start the stack. The app runs migrations on startup (forward-only; see [Versioning](VERSIONING.md)).
4. Verify the app and health endpoint (e.g. `GET /health`).

Prefer a versioned tag over `latest` so you can roll back to a known good version if needed.

### Rollback

There are **no database downgrades**. Migrations are forward-only (fail forward).

- **Revert app only:** Set `IMAGE` back to the previous tag (e.g. `dev-YYYYMMDD-SHORTSHA` or last known good), redeploy the stack. The previous app version runs against the current DB (safe if migrations are additive).
- **Revert app and data:** If the DB was left in a bad state, restore from a backup (see **Restore** above), then run the previous image.

### Schema (for operators)

The database schema is defined in **`backend/migrations/schema.sql`** (source of truth). The app applies migrations on startup via `backend/src/db/migrations.ts`.

**Key tables:**

| Table | Purpose |
|-------|--------|
| `users` | Accounts; passwords hashed with bcrypt. |
| `families`, `family_members` | Family membership; used for access control. |
| `children` | Child profiles (name, DOB, notes, etc.); `family_id` links to family. |
| `visits` | Doctor visits (date, type, notes, measurements, vaccines, prescriptions, etc.). |
| `illnesses` | Illness entries (type, dates, symptoms, severity). |
| `measurements` | Growth (weight, height, head circumference). |
| `medical_events` | Generic medical events (doctor_visit, illness). |
| `visit_attachments`, `measurement_attachments`, `child_attachments` | File metadata; files stored on disk (uploads/avatars volumes). |
| `audit_events` | Audit trail for visit/illness changes. |
| `migrations` | Tracks applied migration files. |

For backup/restore and export, the important data lives in the tables above plus the upload/avatar files on disk.

### Updates (image tags)

**Automatic Updates (using latest tag):**
- Images tagged as `latest` are updated when you promote a dev build.
- In Portainer: **Stacks** → **trajectory** → **Editor** → **Update the stack**
- Or pull new image: `docker pull ghcr.io/your-org/trajectory:latest` then restart stack

**Manual Version Selection:**
- Set `IMAGE` to specific version: `ghcr.io/your-org/trajectory:dev-20250125-abc1234`
- Update stack to use the specific version

**Image Tags Available:**
- `latest` - Production-ready (promoted manually from dev)
- `dev` - Latest development build (updated on every merge to main)
- `dev-YYYYMMDD-SHORTSHA` - Specific dev release (e.g., `dev-20250125-abc1234`)
