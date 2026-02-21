# Lib

Core library modules for API communication, authentication, and third-party integrations.

## Files

### `api.ts`
Core HTTP client for API communication.

**Functions:**
- `apiGet<T>(endpoint, token)` - Perform GET request
- `apiPost<T>(endpoint, body, token)` - Perform POST request
- `getStoredTokens()` - Retrieve stored auth tokens
- `storeTokens(access, refresh?)` - Store auth tokens
- `clearTokens()` - Clear stored tokens

**Usage:**
```typescript
import { apiGet, apiPost } from '@/lib'

const data = await apiGet<MyType>('/endpoint', token)
const result = await apiPost<Result>('/endpoint', JSON.stringify(body), token)
```

### `aggregators.ts`
API client for intelligence harvester aggregator endpoints.

**Functions:**
- `identifyIndicators(indicators, token)` - Classify indicators by type
- `getWhois(indicator, provider, token)` - WHOIS lookup
- `getGeolocation(ip, provider, token)` - IP geolocation
- `getIPReputation(ip, provider, lite, token)` - IP reputation check
- `getDomainReputation(domain, provider, token)` - Domain reputation check
- `getVulnerability(cve, provider, token)` - CVE vulnerability lookup
- `getAllProviders(token)` - Get all available providers

**Types:**
- `ProvidersResponse` - Single provider type response
- `AllProvidersResponse` - All providers grouped by type
- `WhoisData`, `GeolocationData`, `ReputationData`, `VulnerabilityData` - Response types

### `indicator-utils.ts`
Utilities for indicator parsing and input handling.

**Functions:**
- `parseIndicators(raw)` - Parse comma/newline separated indicators
- `getInputPlaceholder()` - Get example placeholder text

### `auth.tsx`
Authentication context and hooks.

**Exports:**
- `AuthProvider` - Context provider for authentication
- `useAuth()` - Hook to access auth state and functions

### `utils.ts`
General utility functions.

**Functions:**
- `cn(...inputs)` - Tailwind class name merger (clsx + tailwind-merge)

## Purpose

The `lib` directory contains framework integrations and API clients. Unlike `utils` (pure functions) or `services` (business logic), `lib` modules typically:

- Wrap third-party libraries
- Handle HTTP communication
- Manage authentication state
- Provide low-level utilities

## Naming Convention

- Files use descriptive names without suffixes
- Use `.ts` for pure modules, `.tsx` for React components
- Group related functionality in single files
