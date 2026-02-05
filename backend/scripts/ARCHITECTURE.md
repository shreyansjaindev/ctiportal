# CTI Portal Provider Architecture

## Unified Provider System

As of the latest refactor, CTI Portal uses a **single unified provider system** defined in `PROVIDER_METADATA.py`.

### Components

#### 1. SOURCE_REGISTRY (in PROVIDER_METADATA.py)
- **Purpose**: Function registry for bulk collection system in `engine.py`
- **Structure**: Flat dictionary mapping source IDs to function references and supported types
- **Used by**: `engine.py`'s `collect_data()` function for bulk intelligence collection
- **Format**:
```python
SOURCE_REGISTRY = {
    "provider_id": {
        "title": "Display Name",
        "function": callable_function,
        "supported_types": ["domain", "ipv4", "url", ...],
    }
}
```

#### 2. PROVIDER_METADATA (in PROVIDER_METADATA.py)
- **Purpose**: Category-based provider metadata for frontend and aggregator modules
- **Structure**: Nested dictionary organized by category → provider → metadata
- **Used by**: 
  - `api/views_aggregators.py` for API endpoints
  - Aggregator modules (`whois.py`, `reputation.py`, etc.)
  - Frontend for provider selection UI
- **Format**:
```python
PROVIDER_METADATA = {
    "category": {
        "provider_id": {
            "id": "provider_id",
            "name": "Display Name",
            "supported_indicators": ["domain", "ip", ...],
        }
    }
}
```

#### 3. PROVIDER_PRESETS (in PROVIDER_METADATA.py)
- **Purpose**: Pre-configured provider combinations for different use cases
- **Presets**: `basic`, `advanced`, `full`
- **Used by**: Frontend for quick provider selection

### Provider Import Strategy

All provider functions are imported with try/except blocks in `PROVIDER_METADATA.py`:
- Gracefully handles missing dependencies
- Sets function to `None` if import fails
- Logs debug message for unavailable providers
- Allows partial provider availability in production

### Aggregator Module Pattern

Each aggregator module (e.g., `whois.py`, `reputation.py`) follows this pattern:

1. **Import providers** with try/except and availability flags
2. **get_available_providers()** - Returns list of working provider IDs
3. **get_*()** functions - Accept optional `provider` parameter for targeted lookups
4. **Fallback chains** - Auto-try multiple providers if first fails

### Migration from Legacy System

**Before**: Dual system with redundancy
- `SOURCE_INFO` in `engine.py` (function registry)
- `PROVIDER_METADATA.py` (category metadata)
- Duplicate provider configurations

**After**: Unified single system
- `SOURCE_REGISTRY` in `PROVIDER_METADATA.py` (function registry)
- `PROVIDER_METADATA` in same file (category metadata)
- Single source of truth for all provider configuration
- `engine.py` imports `SOURCE_REGISTRY as SOURCE_INFO`

### Benefits

✅ **Single Source of Truth**: All provider metadata in one file  
✅ **No Redundancy**: Provider info defined once  
✅ **Graceful Degradation**: Missing providers don't break system  
✅ **Modular Design**: Category-based organization  
✅ **Type Safety**: Explicit supported types/indicators  
✅ **Easy Maintenance**: Add provider once, works everywhere  

### Adding a New Provider

1. **Create provider module** in `scripts/providers/`
2. **Add import** to `PROVIDER_METADATA.py` with try/except
3. **Add to SOURCE_REGISTRY** if bulk collection is supported
4. **Add to PROVIDER_METADATA** under appropriate category
5. **Update aggregator module** (if category-specific)
6. **Add to preset** (optional)

Example:
```python
# 1. Import in PROVIDER_METADATA.py
try:
    from .providers.newprovider import new_provider_func
except ImportError:
    logger.debug("New Provider not available")
    new_provider_func = None

# 2. Add to SOURCE_REGISTRY
SOURCE_REGISTRY = {
    "newprovider": {
        "title": "New Provider",
        "function": new_provider_func,
        "supported_types": ["domain", "ipv4"],
    },
    # ... existing providers
}

# 3. Add to PROVIDER_METADATA
PROVIDER_METADATA = {
    "reputation": {
        "newprovider": {
            "id": "newprovider",
            "name": "New Provider",
            "supported_indicators": ["domain", "ip"],
        },
        # ... existing providers
    }
}

# 4. Update aggregator module (scripts/reputation.py)
try:
    from .providers.newprovider import new_provider_func
except ImportError:
    NEW_PROVIDER_AVAILABLE = False
else:
    NEW_PROVIDER_AVAILABLE = True
```

### File Structure

```
scripts/
├── PROVIDER_METADATA.py       # Central provider registry (SOURCE_REGISTRY + PROVIDER_METADATA)
├── engine.py                  # Bulk collection system (imports SOURCE_REGISTRY)
├── whois.py                   # WHOIS aggregator module
├── reputation.py              # Reputation aggregator module
├── geolocation.py             # Geolocation aggregator module
└── providers/
    ├── virustotal.py
    ├── abuseipdb.py
    ├── ibm.py
    └── ...
```

### Best Practices

- **Always use try/except** when importing providers
- **Check availability flags** before calling provider functions
- **Use aggregator modules** for frontend/API (not direct provider calls)
- **Use SOURCE_REGISTRY** for bulk collection only
- **Keep PROVIDER_METADATA updated** when adding providers
- **Test with missing dependencies** to ensure graceful degradation
