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
- **Nginx Proxy Manager**: Recommended - see [NPM_SETUP.md](./NPM_SETUP.md)

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

### Environment Variables

Required in `.env`:
- `IMAGE` - Docker image location (e.g., `ghcr.io/your-org/trajectory:latest`)
  - Defaults to `ghcr.io/${GITHUB_REPOSITORY}:latest` if `GITHUB_REPOSITORY` is set
  - Use `:latest` for production, `:dev` for latest dev build, or specific version tags
- `DB_PASSWORD` - Strong password for PostgreSQL
- `POSTGRES_DB` - Database name (default: `trajectory`)
- `POSTGRES_USER` - Database user (default: `trajectory_user`)

Optional:
- `PORT` - App port (default: `3001`) - Only needed for direct access
- `GITHUB_REPOSITORY` - Auto-populated in GitHub Actions, set manually if needed (e.g., `your-org/trajectory`)

### Access

**Direct Port Access:**
- App (UI + API): `http://your-host:${PORT:-3001}`
- Frontend UI: `http://your-host:${PORT:-3001}/`
- Backend API: `http://your-host:${PORT:-3001}/api`

**Nginx Proxy Manager:**
- See [NPM_SETUP.md](./NPM_SETUP.md) for detailed configuration
- Access via: `https://yourdomain.com/trajectory` (or your configured path)

### Volumes
Data is persisted in Docker volumes:
- `trajectory_data` - PostgreSQL data
- `trajectory_uploads` - File uploads
- `trajectory_avatars` - Avatar images

### Backup
Backup volumes using Portainer or:
```bash
docker run --rm -v trajectory_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

### Updates

**Automatic Updates (using latest tag):**
- Images tagged as `latest` are automatically updated when you promote a dev build
- In Portainer: **Stacks** → **trajectory** → **Editor** → **Update the stack**
- Or pull new image: `docker pull ghcr.io/your-org/trajectory:latest` then restart stack

**Manual Version Selection:**
- Set `IMAGE` to specific version: `ghcr.io/your-org/trajectory:dev-20250125-abc1234`
- Update stack to use the specific version

**Image Tags Available:**
- `latest` - Production-ready (promoted manually from dev)
- `dev` - Latest development build (updated on every merge to main)
- `dev-YYYYMMDD-SHORTSHA` - Specific dev release (e.g., `dev-20250125-abc1234`)
