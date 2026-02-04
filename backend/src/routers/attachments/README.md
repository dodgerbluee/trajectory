# Attachments Router Module

**Status:** Needs refactoring (1266 lines - too large)

## Current Structure

`attachments.ts` - Monolithic file containing:
- Utility functions (lines 31-182): collision detection, file verification
- POST /measurements/:mid/attachments - Upload attachment to measurement (lines 187-385)
- GET /measurements/:mid/attachments - List measurement attachments (lines 390-443)
- GET /measurements/:mid/attachments/:id - Download measurement attachment (lines 448-551)
- DELETE /measurements/:mid/attachments/:id - Delete measurement attachment (lines 556-657)
- POST /visits/:vid/attachments - Upload visit attachment (lines 662-874)
- GET /visits/:vid/attachments - List visit attachments (lines 879-933)
- PUT /attachments/:id - Update attachment metadata (lines 938-1014)
- POST /children/:child_id/attachments - Upload child attachment (lines 1019-1211)
- GET /children/:child_id/attachments - List/download child attachments (lines 1212-1263)

## Functionality

### File Upload with Multer
- Configurable storage with collision detection
- Filename sanitization and UUID generation
- Size limits and file type filtering

### Three Attachment Types
1. **Measurement Attachments** - Photos/files for growth measurements
2. **Visit Attachments** - Documents from doctor visits
3. **Child Attachments** - General child files (photos, documents)

### Collision Detection
- `checkStoredFilenameExists()` - Check if filename already in DB
- `checkFileExistsOnDisk()` - Verify file exists on filesystem
- `verifyStoredFilenameUniqueAfterInsert()` - Post-insert validation
- Retry logic with timestamps to handle race conditions

### Security
- Authorization checks via `canAccessChild()` and `canEditChild()`
- File download with proper headers
- Audit logging for deletions

## Recommended Future Split

```
routers/attachments/
├── index.ts              # Router setup
├── utils.ts              # Collision detection, verification helpers
├── multer-config.ts      # Multer storage configuration
├── handlers/
│   ├── measurements.ts   # Measurement attachment CRUD
│   ├── visits.ts         # Visit attachment CRUD
│   ├── children.ts       # Child attachment CRUD
│   └── shared.ts         # Update metadata endpoint
└── README.md             # This file
```

## Why It's Large

1. **Three separate resource types** - measurements, visits, children (each with upload/list/download/delete)
2. **Collision detection logic** - Complex retry and verification system
3. **Multer configuration** - File upload middleware with validation
4. **Duplicate code patterns** - Similar CRUD operations repeated for each resource type
5. **Audit logging** - Tracks deletions with full change history

## Refactoring Notes

- **DRY opportunity**: Extract common upload/download/delete logic
- **Type safety**: Shared types for attachment metadata across all three types
- **Storage abstraction**: Could support S3/cloud storage in future
- **Validation**: File type whitelist/blacklist could be centralized

## Files to Create (Future)

- `utils.ts` - getChildIdForAttachment, collision detection, verification
- `multer-config.ts` - Storage, filename generation, filters
- `measurements.ts` - 4 endpoints for measurement attachments
- `visits.ts` - 2 endpoints for visit attachments  
- `children.ts` - 2 endpoints for child attachments
- `shared.ts` - Update attachment metadata (works across all types)
