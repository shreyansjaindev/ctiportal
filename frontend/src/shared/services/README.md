# Services

Business logic layer for the intelligence harvester module.

## Files

### `lookup.service.ts`
Orchestrates indicator lookups across multiple providers.

**Key Functions:**
- `isLookupApplicable(type, kind)` - Determines if a lookup type can be applied to an indicator kind
- `resolveProviders(type, value, available)` - Resolves provider configuration to specific provider IDs
- `executeIndicatorLookups(request)` - Executes all applicable lookups for an indicator

**Usage:**
```typescript
import { executeIndicatorLookups } from '@/services'

const results = await executeIndicatorLookups({
  indicator: '8.8.8.8',
  kind: 'ip',
  selectedTypes: new Set(['ip_info', 'reputation']),
  providersByType: {...},
  getProviderForType: (type) => providers[type],
  token: 'auth-token'
})
```

## Architecture

Services follow the single responsibility principle and are provider-agnostic. They:
1. Handle business logic without UI concerns
2. Are fully unit-testable
3. Accept dependencies via parameters (dependency injection)
4. Return typed results

## Naming Convention

- Files use `*.service.ts` suffix
- Functions use camelCase
- Exports are explicit (no default exports)
