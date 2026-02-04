# Backend Structure Guide

This document explains the organization of the backend codebase.

## Directory Overview

```
backend/src/
├── routers/              # HTTP route handlers (Express routers)
├── features/             # Domain logic organized by feature
│   ├── auth/service/     # Authentication & registration
│   ├── admin/service/    # Admin configuration & instance settings
│   ├── families/service/ # Family access control
│   └── shared/service/   # Cross-cutting concerns (audit, settings)
├── middleware/           # Express middleware (auth, validation, error handling)
├── db/                   # Database connection & migrations
├── types/                # TypeScript type definitions
└── lib/                  # (deprecated - being phased out)
```

## Architecture Principles

### 1. Routers (HTTP Layer)

**Location:** `/routers/*.ts`

All HTTP route handlers are centralized in the `/routers` folder with unique, descriptive filenames:

- `auth.ts` - Login, logout, registration
- `admin.ts` - Admin configuration endpoints
- `children.ts` - Child CRUD operations
- `families.ts` - Family management
- `users.ts` - User preferences
- `measurements.ts` - Growth tracking
- `medical-events.ts` - Medical event tracking
- `visits.ts` - Wellness/sick/injury/vision/dental visits (large unified file)
- `illnesses.ts` - Standalone illness tracking
- `attachments.ts` - File upload/download for measurements/visits
- `avatars.ts` - Avatar management
- `invites.ts` - Family invite acceptance
- `export.ts` - Data export (ZIP with JSON/HTML)

**Responsibilities:**
- Route definitions and HTTP request/response handling
- Request validation (using middleware helpers)
- Calling domain logic from `features/*/service/`
- Returning API responses

**Import pattern:** Use `../` for shared resources (2 levels deep):
```typescript
import { query } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { canAccessChild } from '../features/families/service/family-access.js';
```

### 2. Features (Domain Layer)

**Location:** `/features/*/service/*.ts`

Domain-specific business logic is organized by feature area:

#### `auth/service/`
- `auth.ts` - Password hashing, token generation, user creation
- `registration-code.ts` - Registration code management

#### `admin/service/`
- `admin-config.ts` - Admin configuration (providers, vaccines, etc.)
- `instance-admin.ts` - Instance admin user management

#### `families/service/`
- `family-access.ts` - Family-based authorization (canAccessChild, canEditChild, etc.)

#### `shared/service/`
- `audit.ts` - Audit event persistence for visits/illnesses
- `field-diff.ts` - Field-level change tracking
- `instance-settings.ts` - Global instance settings (DB-backed)

**Responsibilities:**
- Business logic that can be reused across routes
- Authorization checks (family access control)
- Complex data transformations
- Audit logging

**Import pattern:** Use `../../../` to reach db/middleware (3 levels deep):
```typescript
import { query } from '../../../db/connection.js';
```

### 3. Middleware

**Location:** `/middleware/*.ts`

Express middleware for cross-cutting concerns:

- `auth.ts` - JWT authentication (authenticate, optionalAuth)
- `validation.ts` - Request validation helpers
- `error-handler.ts` - Centralized error handling
- `error-logger.ts` - Error logging
- `rate-limit.ts` - Rate limiting
- `query-parser.ts` - Query parameter parsing

### 4. Database

**Location:** `/db/*.ts`

- `connection.ts` - PostgreSQL connection pooling
- `migrations.ts` - Migration runner

### 5. Types

**Location:** `/types/*.ts`

TypeScript type definitions:

- `database.ts` - Database row types, input types
- `api.ts` - API response types, pagination helpers
- `audit.ts` - Audit event types
- `illness.ts` - Illness-specific types

## Conventions

### File Naming
- **Routers:** Plural noun matching resource (e.g., `children.ts`, `visits.ts`)
- **Services:** Descriptive name reflecting purpose (e.g., `family-access.ts`, `audit.ts`)
- **NO duplicate filenames** - every file has a unique name

### Import Paths
- Always use `.js` extension in imports (TypeScript requirement for ESM)
- Use relative paths (`../`, `../../`, etc.)
- Routers use `../` to reach shared resources
- Services use `../../../` to reach db/middleware

### Router Exports
- Named export for the router: `export const childrenRouter = Router();`
- Or default export: `export default router;`

### Service Exports
- Named exports for all functions
- Document with JSDoc comments

## Migration Notes

This structure was recently reorganized to:
1. **Eliminate duplicate `routes.ts` filenames** - all routers now have unique names in `/routers/`
2. **Separate HTTP from domain logic** - routers handle HTTP, services handle business logic
3. **Organize by feature** - related domain logic grouped in `features/*/service/`
4. **Remove empty folders** - no empty feature folders cluttering the structure

**Previous structure (deprecated):**
- Files in `/lib/` are being migrated to `/features/*/service/`
- Empty feature folders have been removed

## Best Practices

### When creating new features:

1. **Add router** in `/routers/feature-name.ts`
   - Handle HTTP requests
   - Validate input
   - Call service functions
   - Return responses

2. **Add service** in `/features/feature-name/service/logic.ts` (if needed)
   - Reusable business logic
   - Complex data operations
   - Authorization checks

3. **Add types** in `/types/feature-name.ts` (if needed)
   - Database row types
   - API input/output types

### Large routers:

Some routers have grown large due to comprehensive functionality. They have been documented for future refactoring:

**Large Routers:**
- `visits.ts` (1383 lines) - Has validation.ts and growth-data.ts extracted, full refactoring planned
  - See `/routers/visits/README.md` for refactoring plan
- `attachments.ts` (1266 lines) - Three resource types with collision detection
  - See `/routers/attachments/README.md` for structure details
- `illnesses.ts` (691 lines) - Well-organized, medium priority for splitting
  - See `/routers/illnesses/README.md` for details

**Example split structure:**
```
routers/visits/
├── index.ts          # Main router setup
├── validation.ts     # Validation helpers ✅ Created
├── growth-data.ts    # Growth data endpoint ✅ Created
├── handlers/         # Individual route handlers (planned)
│   ├── list.ts
│   ├── create.ts
│   ├── update.ts
│   ├── delete.ts
│   └── history.ts
└── README.md         # Refactoring documentation ✅ Created
```

**Refactoring Approach:**
1. Document current structure with README.md
2. Extract reusable modules (validation, calculations)
3. Keep main file working while building new structure
4. Gradually migrate to modular structure
5. Test thoroughly before removing old file

## Testing

Tests are co-located with the code:
- `/routers/__tests__/` - Router integration tests
- `/features/*/service/__tests__/` - Service unit tests
- `/lib/__tests__/` - Legacy tests (being migrated)
