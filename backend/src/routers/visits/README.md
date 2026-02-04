# Visits Router Module

**Status:** Needs refactoring (1383 lines - too large)

## Current Structure

`visits.ts` - Monolithic file containing:
- 13 validation helper functions (lines 25-245)
- Growth data endpoint with complex age/BMI calculations (lines 254-498)
- List visits endpoint (lines 499-565)
- Get visit by ID (lines 570-602)
- Create visit (lines 607-829)
- Update visit with optimistic locking (lines 834-1261)
- Get audit history (lines 1266-1352)
- Delete visit (lines 1357-1382)

## Recommended Future Split

```
routers/visits/
├── index.ts              # Router setup & route definitions
├── validation.ts         # All 13 validation helpers ✅ Created
├── growth-data.ts        # Growth data endpoint ✅ Created  
├── handlers/
│   ├── list.ts          # GET / - List with filters
│   ├── get.ts           # GET /:id - Get by ID
│   ├── create.ts        # POST / - Create new visit
│   ├── update.ts        # PUT /:id - Update with optimistic locking
│   ├── history.ts       # GET /:id/history - Audit trail
│   └── delete.ts        # DELETE /:id - Delete visit
└── README.md            # This file
```

## Why It's Large

1. **Comprehensive validation** - Handles 5 visit types (wellness, sick, injury, vision, dental)
2. **Complex growth data** - Age calculations, BMI validation, birth data points
3. **Full CRUD + audit** - Create, read, update, delete with field-level change tracking
4. **Multiple specialized fields**:
   - Wellness: growth measurements, percentiles, BMI
   - Vision: acuity, refraction data
   - Dental: procedures, cavities, fluoride
   - Sick: illnesses array, prescriptions

## Files Created (Ready for Migration)

- ✅ `validation.ts` - All validation functions extracted and working
- ✅ `growth-data.ts` - Growth chart endpoint extracted and working

These can be used once the main file is ready to be split.

## Migration Plan (Future)

1. Keep current `visits.ts` working (don't break production)
2. Gradually extract handlers to `handlers/` folder
3. Update imports in`index.ts`
4. Test each extraction
5. Remove old `visits.ts` when complete

## Notes

- **Optimistic locking** used in UPDATE to prevent concurrent modification conflicts
- **Audit logging** tracks all field-level changes
- **BMI calculation** has validation to fix historically bad data
- **Birth data points** included in growth charts at age 0
