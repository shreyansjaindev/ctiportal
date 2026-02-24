# Intelligence Harvester Database Migration

## Changes Made

### Backend Model Changes

**File:** `backend/intelligence_harvester/models.py`

Changed the `Source.data` field from `TextField(max_length=10000)` to `JSONField()`:

**Why this change?**
- **No Size Limit**: The previous TextField had a 10,000 character limit which could cause issues with large datasets (e.g., Passive DNS with hundreds of records)
- **Better Performance**: JSONField stores data in binary format (JSONB in PostgreSQL), enabling faster queries and indexing
- **Type Safety**: Django handles JSON serialization/deserialization automatically, preventing JSON encoding errors
- **Native Queries**: Enables JSON-specific database queries using Django ORM

### Migration Files Created

1. **0002_convert_data_to_jsonfield.py**
   - Changes the field type from TextField to JSONField
   
2. **0003_migrate_existing_json_data.py**
   - Data migration that converts existing JSON strings to JSON objects
   - Handles backwards migration (converts JSON back to strings if needed)
   - Includes error handling for malformed JSON

### How to Apply

Run the migrations using the virtual environment:

```bash
cd backend
.venv\Scripts\python.exe manage.py migrate intelligence_harvester
```

### What This Solves

✅ **Large Data Support**: Passive DNS queries can return hundreds or thousands of records without hitting size limits
✅ **Cache Reliability**: Intelligence Harvester cache can now store complete results without truncation
✅ **Database Efficiency**: PostgreSQL can index and query JSON data more efficiently
✅ **Future Scalability**: No more worries about hitting character limits as data grows

### Code Changes

**File:** `backend/intelligence_harvester/views.py`

- Removed `json.dumps()` when storing cache data (JSONField handles it)
- Removed `json.loads()` when reading cache data (JSONField returns dicts)
- Removed `import json` (no longer needed)

### Notes

- The migration is **reversible** - you can rollback if needed
- Existing cached data will be automatically converted during migration
- If migration encounters invalid JSON, it logs a warning and skips that record
- No downtime required for the migration
