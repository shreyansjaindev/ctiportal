# Components

React components organized by feature and purpose.

## Directory Structure

```
components/
├── ui/                          # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── intelligence-harvester/      # Feature-specific components
│   ├── IndicatorInput.tsx
│   ├── IndicatorList.tsx
│   ├── LookupConfiguration.tsx
│   └── LookupResults.tsx
├── app-shell.tsx               # App layout wrapper
├── app-sidebar.tsx             # Main navigation sidebar
├── login-form.tsx              # Login form component
├── logo.tsx                    # Application logo
├── nav-user.tsx                # User navigation menu
└── navigation.ts               # Navigation configuration
```

## Component Types

### Base UI Components (`/ui`)
Reusable, unstyled components from shadcn/ui. These are:
- Highly composable
- Accessible (ARIA compliant)
- Styled with Tailwind CSS
- Keyboard navigable

### Feature Components (`/intelligence-harvester`, etc.)
Domain-specific components that implement business features:
- Use base UI components
- Connect to hooks and services
- Handle feature-specific logic
- Organized by feature area

### Layout Components
Top-level layout and navigation components:
- `app-shell.tsx` - Main application wrapper
- `app-sidebar.tsx` - Collapsible sidebar navigation
- `nav-user.tsx` - User menu and profile

### Configuration
- `navigation.ts` - Navigation menu configuration

## Naming Conventions

- **Components:** PascalCase (e.g., `IndicatorInput.tsx`)
- **Feature folders:** kebab-case (e.g., `intelligence-harvester/`)
- **Config files:** kebab-case (e.g., `navigation.ts`)

## Best Practices

✅ **Single Responsibility** - Each component does one thing well  
✅ **Composition** - Build complex UIs from simple components  
✅ **Props Interface** - Define explicit props types  
✅ **Minimal Logic** - Keep business logic in hooks/services  
✅ **Accessibility** - Use semantic HTML and ARIA attributes  

## Example Component Structure

```typescript
// FeatureComponent.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useFeatureHook } from '@/hooks'

interface FeatureComponentProps {
  title: string
  onAction: () => void
}

export function FeatureComponent({ title, onAction }: FeatureComponentProps) {
  const { data, isLoading } = useFeatureHook()
  
  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  )
}
```

## Component Organization

Group by feature for better maintainability:

```
intelligence-harvester/
├── IndicatorInput.tsx       # Input component
├── IndicatorList.tsx        # List display
├── LookupConfiguration.tsx  # Configuration UI
└── index.ts                 # Barrel export
```

This keeps related components together and makes imports cleaner.
