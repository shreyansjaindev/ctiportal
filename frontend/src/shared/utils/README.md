# Utilities

Pure utility functions for data transformation and formatting.

## Files

### `indicator.utils.ts`
Functions for indicator type detection and UI formatting.

**Functions:**
- `getIndicatorKind(type)` - Convert backend type to frontend kind
- `getKindLabel(kind)` - Get display label for indicator kind
- `getKindColor(kind)` - Get Tailwind color class for kind
- `getKindBadgeVariant(kind)` - Get badge variant for kind

**Usage:**
```typescript
import { getIndicatorKind, getKindLabel } from '@/utils'

const kind = getIndicatorKind('ipv4') // 'ip'
const label = getKindLabel(kind) // 'IP Address'
```

## Characteristics

All utility functions are:
- **Pure** - Same input always produces same output
- **Side-effect free** - Don't modify external state
- **Synchronous** - No async operations
- **Testable** - Easy to unit test

## Naming Convention

- Files use `*.utils.ts` suffix
- Functions use camelCase
- Prefer explicit over clever naming
