import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { getLogoPath } from "@/shared/utils/logo.utils"
import type { LookupType, Provider, ProviderPreset } from "@/shared/types/intelligence-harvester"
import type { ProviderSelections, ProviderValue } from "@/shared/hooks"
import { LOOKUP_TYPE_CONFIG, ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"

type ProvidersByType = Partial<Record<LookupType, Provider[]>>

interface LookupConfigurationProps {
  selections: ProviderSelections
  setProviderForType: (type: LookupType, value: ProviderValue) => void
  providersByType: ProvidersByType
  presets?: Record<string, ProviderPreset>
}

type LookupTypeUIConfig = {
  id: LookupType
  label: string
  value: ProviderValue
  setValue: (v: ProviderValue) => void
  providers?: Provider[]
}

function ProviderPopover({ type }: { type: LookupTypeUIConfig }) {
  const [open, setOpen] = useState(false)
  
  // Always use arrays for provider selection
  const selectedProviders = type.value
  
  const toggleProvider = (providerId: string) => {
    const provider = type.providers?.find(p => p.id === providerId)

    if (!provider?.available) {
      return
    }

    if (selectedProviders.includes(providerId)) {
      // Remove provider
      const updated = selectedProviders.filter(id => id !== providerId)
      type.setValue(updated)
    } else {
      // Add provider
      type.setValue([...selectedProviders, providerId])
    }
  }
  
  const isProviderSelected = (providerId: string) => {
    return selectedProviders.includes(providerId)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" aria-label={`Select ${type.label} providers`}>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96" 
        align="end"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">{type.label} Providers</h4>
            <p className="text-xs text-muted-foreground">
              Select one or more providers for {type.label.toLowerCase()} lookups
            </p>
          </div>
          
          {/* Provider grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Individual providers */}
            {type.providers?.map((provider) => (
              <div
                key={provider.id}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  !provider.available
                    ? 'opacity-40 cursor-not-allowed'
                    : isProviderSelected(provider.id)
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : 'border-muted hover:border-muted-foreground/20 hover:bg-muted/50 cursor-pointer'
                }`}
                onClick={() => {
                  if (provider.available) {
                    toggleProvider(provider.id)
                  }
                }}
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  {(() => {
                    const logoPath = getLogoPath(provider.id)
                    return (
                      <img 
                        src={logoPath} 
                        alt={provider.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          // Fallback to letter icon on image load error
                          const container = e.currentTarget.parentElement
                          if (container) {
                            const firstLetter = provider.name.charAt(0).toUpperCase()
                            const fallback = document.createElement('div')
                            fallback.className = "flex items-center justify-center w-8 h-8 rounded-md bg-muted text-muted-foreground font-bold text-sm"
                            fallback.textContent = firstLetter
                            e.currentTarget.replaceWith(fallback)
                          }
                        }}
                      />
                    )
                  })()}
                  <span className="text-xs font-medium line-clamp-1">{provider.name}</span>
                  {provider.supported_indicators && provider.supported_indicators.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-0.5">
                      {provider.supported_indicators.map((indicator) => (
                        <span 
                          key={indicator}
                          className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  )}
                  {!provider.available && (
                    <span className="text-[10px] text-muted-foreground">Unavailable</span>
                  )}
                </div>
                {isProviderSelected(provider.id) && (
                  <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function LookupConfiguration({
  selections,
  setProviderForType,
  providersByType,
  presets,
}: LookupConfigurationProps) {
  const lookupTypes: LookupTypeUIConfig[] = LOOKUP_TYPE_CONFIG.map(c => ({
    id: c.id,
    label: c.label,
    value: selections[c.id],
    setValue: (v: ProviderValue) => setProviderForType(c.id, v),
    providers: providersByType[c.id],
  }))

  // Helper to check if enabled
  const isValueEnabled = (value: ProviderValue) => {
    return value.length > 0
  }

  const enabledCount = lookupTypes.filter(t => isValueEnabled(t.value)).length
  const totalCount = ALL_LOOKUP_TYPES.length

  const pickAvailable = (preferred: string[], providers?: Provider[]): ProviderValue => {
    if (!providers || providers.length === 0) return []
    const availableIds = new Set(providers.filter(p => p.available).map(p => p.id))
    const filtered = preferred.filter(id => availableIds.has(id))
    return filtered
  }

  const applyPreset = (presetName: string) => {
    const config = presets?.[presetName] as ProviderPreset | undefined
    if (!config?.providers) return
    const presetProviders = config.providers as Partial<Record<LookupType, string[]>>
    for (const c of LOOKUP_TYPE_CONFIG) {
      setProviderForType(c.id, pickAvailable(presetProviders[c.id] || [], providersByType[c.id]))
    }
  }

  const clearAllSelections = () => {
    ALL_LOOKUP_TYPES.forEach(type => setProviderForType(type, []))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Presets</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Apply a saved auto-load setup.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={clearAllSelections}>
            Clear All
          </Button>
          {presets && Object.entries(presets).map(([presetKey, presetData]: [string, ProviderPreset]) => (
            <Button
              key={presetKey}
              size="sm"
              variant="outline"
              onClick={() => applyPreset(presetKey)}
              title={presetData.description}
            >
              {presetData.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Provider Categories</span>
          <Badge variant="secondary" className="text-xs">
            {enabledCount} of {totalCount} enabled
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable categories, then choose providers.
        </p>
        <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(80px,1fr))]">
          {lookupTypes.map((type) => {
            const isEnabled = isValueEnabled(type.value)
            const hasProviders = type.providers && type.providers.length > 0
            const isDisabled = !hasProviders
            
            return (
              <button
                type="button"
                key={type.id}
                className={`relative group min-h-16 rounded-lg border px-2 py-2 transition-all ${
                  isDisabled
                    ? 'border-muted bg-muted/30 opacity-50 cursor-not-allowed'
                    : isEnabled 
                      ? 'border-primary bg-primary/5 hover:bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/20 hover:bg-muted/30'
                }`}
                disabled={isDisabled}
              >
                {/* Settings popover - show when has providers */}
                {hasProviders && (
                  <ProviderPopover type={type} />
                )}
                
                {/* Main card content */}
                <div
                  className="flex h-full items-center justify-center"
                >
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className={`text-xs font-medium leading-tight ${
                      isDisabled 
                        ? 'text-muted-foreground/50' 
                        : isEnabled 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                </div>

                {/* Active indicator dot */}
                {isEnabled && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

