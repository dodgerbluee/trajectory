# Versioning and releases

## Current version: 0.x (beta)

The **first released version is 0.1.0** (beta). This follows common practice: 0.x indicates pre–1.0 / beta; 1.0.0 is reserved for when the project is considered stable for general use.

- **0.x** – Beta; API and schema may still change. Upgrade with care; check release notes.
- **1.0.0** – First stable release; see "1.x compatibility" below.

## Release notes

Release notes live in **GitLab Releases** (or GitHub Releases if you host there). There is no `CHANGELOG.md` in the repo; use the Releases UI for each version.

## Version from commit messages

Versions are derived from **commit message headers** (conventional commits):

- `fix:` or `fix(scope):` → **patch** (e.g. 0.1.0 → 0.1.1)
- `feat:` or `feat(scope):` → **minor** (e.g. 0.1.0 → 0.2.0)
- Breaking changes (e.g. `BREAKING CHANGE:` in footer, or `feat!:` / `fix!:`) → **major** (e.g. 0.1.0 → 1.0.0, or 1.0.0 → 2.0.0)

Your CI can use this to tag images or create releases (e.g. with semantic-release or a simple script that reads the latest merge commit).

## Image tags

- **`latest`** – Production-ready image (promoted manually from dev). Prefer pinning to a version tag for upgrades.
- **`dev`** – Latest development build (updated on every merge to main).
- **`dev-YYYYMMDD-SHORTSHA`** – Specific dev build (e.g. `dev-20250125-abc1234`).

Version tags (e.g. `v0.1.0`, `v1.0.0`) follow the version scheme above.

## 1.x compatibility (when 1.0.0 is released)

Once at 1.0.0, within a major version (e.g. 1.x) we avoid breaking API or schema changes without a major bump. Fixes and new features are backward-compatible where possible. If a breaking change is required, it will be documented and reflected in the version (e.g. 2.0.0).

---

## Trajectory Release Flow (How it works)

Every merge to `main`:
- Build & push `trajectory:dev`
- Build & push `trajectory:sha-<commit>`

When semantic-release cuts a release (from main, with proper commit messages):
- Build & push `trajectory:vX.Y.Z`
- Move `trajectory:latest` to this release
- Create a GitHub Release

### User Choices
- **Stable:** `image: trajectory:latest`
- **Pin:** `image: trajectory:v0.6.0`
- **Living dangerously:** `image: trajectory:dev`

**Best Practice:**
> Never push `latest` from main without a version tag. Only move `latest` when a real, tagged release is cut. This prevents accidental breakage for users tracking `latest`.

This flow is simple, familiar, and trusted. It ensures that only tested, tagged releases are promoted to `latest`, while development builds remain isolated under `dev` tags.

---
