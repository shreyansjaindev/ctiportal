# Types

TypeScript type definitions and interfaces for the application.

## Files

### `intelligence-harvester.ts`
Type definitions for the Intelligence Harvester feature.

**Core Types:**

- **`LookupType`** - Available lookup operations
  ```typescript
  type LookupType = 
    | "whois" | "ip_info" | "reputation" | "dns" 
    | "passive_dns" | "whois_history" | "reverse_dns"
    | "screenshot" | "email_validator" | "vulnerability"
    | "website_details"
  ```

- **`IndicatorType`** - Backend indicator classification
  ```typescript
  type IndicatorType = 
    | "ipv4" | "ipv6" | "domain" | "email" | "url"
    | "sha256" | "sha1" | "md5" | "cve" | "keyword"
  ```

- **`IndicatorKind`** - Frontend indicator categorization
  ```typescript
  type IndicatorKind = "ip" | "domain" | "email" | "cve" | "hash" | "unknown"
  ```

- **`LookupResult`** - Single lookup operation result
  ```typescript
  type LookupResult = Record<string, any> & {
    _provider?: string
    _lookupType?: LookupType
    error?: string
  }
  ```

- **`IndicatorResult`** - All results for one indicator
  ```typescript
  type IndicatorResult = {
    indicator: string
    results: LookupResult[]
  }
  ```

- **`Provider`** - Provider configuration
  ```typescript
  interface Provider {
    id: string
    name: string
    icon: string
    available: boolean
    supported_indicators?: string[]
    type?: "free" | "paid"
    cost?: string
    rate_limit?: string
    description?: string
  }
  ```

## Purpose

Type definitions provide:
- **Type Safety** - Catch errors at compile time
- **IntelliSense** - Better autocomplete in editors
- **Documentation** - Self-documenting code
- **Refactoring** - Safer code changes

## Organization

Types are grouped by feature/domain:
- `intelligence-harvester.ts` - Intelligence Harvester types
- Future: `domain-monitoring.ts`, `threatstream.ts`, etc.

## Best Practices

✅ **Prefer `interface` for objects** - Better for extension and merging  
✅ **Use `type` for unions** - Clearer for union types  
✅ **Export all types** - Make them available for reuse  
✅ **Document complex types** - Add JSDoc for clarity  
✅ **Use discriminated unions** - When modeling variants  

## Naming Conventions

- **Interfaces:** PascalCase with `I` prefix optional (e.g., `Provider`)
- **Types:** PascalCase (e.g., `LookupType`)
- **Type unions:** Descriptive names (e.g., `IndicatorKind`)
- **Generics:** Single uppercase letter or PascalCase (e.g., `T`, `TData`)

## Example Usage

```typescript
import type { LookupType, Provider, IndicatorResult } from '@/types/intelligence-harvester'

function processResults(
  type: LookupType,
  provider: Provider,
  results: IndicatorResult[]
): void {
  // Type-safe processing
}
```

## Type vs Interface

**Use `type` when:**
- Defining unions or intersections
- Using primitives or tuples
- Creating utility types

**Use `interface` when:**
- Defining object shapes
- Need declaration merging
- Modeling public APIs

```typescript
// ✅ Use type for unions
type Status = 'pending' | 'success' | 'error'

// ✅ Use interface for objects
interface User {
  id: string
  name: string
}
```
