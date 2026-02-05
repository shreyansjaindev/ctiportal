# Hooks

Custom React hooks for state management and side effects.

## Files

### `use-provider-selection.ts`
Manages provider selection state for all lookup types in the intelligence harvester.

**Exports:**
- `useProviderSelection()` - Main hook for provider state management
- Types: `ProviderValue`, `ProviderSelection`, `ProviderSelectionSetters`

**Features:**
- Centralized state for 12 provider types
- Automatic computation of enabled lookup types
- Provider availability checking
- Type-safe setters and getters

**Usage:**
```typescript
import { useProviderSelection } from '@/hooks'

function Component() {
  const { selections, setters, enabledTypes } = useProviderSelection()
  
  // Set providers
  setters.setWhois(['free_whois', 'whoisxml'])
  
  // Check enabled types
  console.log(enabledTypes) // Set { 'whois' }
  
  return <div>...</div>
}
```

## Naming Convention

- Files use `use-*.ts` prefix (kebab-case)
- Hook functions use `use` prefix (camelCase)
- Co-locate hook-specific types in same file
