# CI/CD Implementation Strategy

## Overview
Set up GitHub Actions workflows for PR validation, merge builds, and dev releases.

## Phase 1: Core Workflows

### 1. PR Validation (`.github/workflows/pr-validation.yml`)
- **Purpose**: Validate commits and PR titles, build components
- **Triggers**: PR opened/updated
- **Jobs**:
  - Validate conventional commits
  - Validate PR title format
  - Build & lint backend/frontend (matrix)
  - Build all components

### 2. Merge Build (`.github/workflows/merge-build.yml`)
- **Purpose**: Build artifacts on merge to main
- **Triggers**: Push to main
- **Actions**: Build all, upload artifacts (7-day retention)

### 3. Dev Release (`.github/workflows/dev-release.yml`)
- **Purpose**: Build Docker image and create dev release on merge to main
- **Triggers**: Push to main
- **Actions**:
  - Build unified Docker image (frontend + backend)
  - Push to GitHub Container Registry (ghcr.io)
  - Tag with version: `dev-YYYYMMDD-SHORTSHA` (e.g., `dev-20250125-abc1234`)
  - Tag with: `dev` (always points to latest dev build)
  - Create GitHub release with image information
- **Image Location**: `ghcr.io/<org>/trajectory:<tag>`

## Setup Steps

1. **Create directory structure**
   ```bash
   mkdir -p .github/workflows
   ```

2. **Add commitlint config** (`commitlint.config.js`)
   - Conventional commit format validation

3. **Install dependencies**
   ```bash
   npm install --save-dev @commitlint/cli @commitlint/config-conventional
   ```

4. **Create workflow files**
   - Copy workflow YAML files to `.github/workflows/`

5. **Commit and push**
   ```bash
   git add .github/ commitlint.config.js package.json package-lock.json
   git commit -m "ci: add GitHub Actions workflows"
   git push
   ```

### 4. Promote to Latest (`.github/workflows/promote-to-latest.yml`)
- **Purpose**: Promote dev image to production `latest` tag on demand
- **Triggers**: Manual workflow dispatch
- **Inputs**:
  - `dev_tag`: Optional specific dev tag to promote (e.g., `dev-20250125-abc1234`)
    - If empty, promotes current `dev` tag
- **Actions**:
  - Pull specified dev image (or `dev` tag if not specified)
  - Tag as `latest`
  - Push `latest` tag to registry
  - Create GitHub release documenting the promotion
- **Usage**: 
  - Go to Actions → "Promote to Latest" → "Run workflow"
  - Optionally specify a dev tag, or leave empty to promote current `dev`

## Docker Image Strategy

### Image Tags
- `dev-YYYYMMDD-SHORTSHA`: Specific dev release (e.g., `dev-20250125-abc1234`)
- `dev`: Always points to latest dev build (updated on every merge to main)
- `latest`: Production-ready image (promoted manually from dev)

### Image Location
All images are published to GitHub Container Registry:
```
ghcr.io/<org>/trajectory:<tag>
```

### Production Deployment
Production deployments use pre-built images from the registry:
- Default: `ghcr.io/<org>/trajectory:latest`
- Override with `IMAGE` environment variable for specific versions
- No build step required in production - just pull and run

### Promotion Workflow
1. **Automatic**: Every merge to `main` creates a new `dev-*` tagged image and updates `dev`
2. **Manual**: When ready for production:
   - Go to GitHub Actions → "Promote to Latest"
   - Optionally specify a dev tag to promote, or use current `dev`
   - Workflow tags the image as `latest` and pushes to registry
   - Production deployments using `latest` tag will get the new image

## Future Enhancements
- Automated testing before image build
- Security scanning (Dependabot, CodeQL, Trivy)
- Automated deployment hooks
- Image signing and verification
