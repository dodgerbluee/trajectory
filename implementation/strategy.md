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
- **Purpose**: Create dev release tags on merge
- **Triggers**: Push to main
- **Format**: `dev-YYYYMMDD-SHORTSHA` (e.g., `dev-20250125-abc1234`)

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

## Future Enhancements
- Docker image builds & registry pushes
- Automated testing
- Security scanning (Dependabot, CodeQL)
- Production release automation
- Deployment automation
