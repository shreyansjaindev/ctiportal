import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { ProviderLogo } from "@/shared/components/ProviderLogo"
import { cn } from "@/shared/lib/utils"
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

function ProviderPopover({
  type,
  children,
}: {
  type: LookupTypeUIConfig
  children: React.ReactNode
}) {
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
      <PopoverTrigger asChild>{children}</PopoverTrigger>
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
                className={`relative p-3 rounded-lg border transition-colors ${
                  !provider.available
                    ? 'opacity-40 cursor-not-allowed'
                    : isProviderSelected(provider.id)
                    ? 'border-primary bg-primary text-primary-foreground cursor-pointer'
                    : 'border-border bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer'
                }`}
                onClick={() => {
                  if (provider.available) {
                    toggleProvider(provider.id)
                  }
                }}
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-black shadow-sm">
                    <ProviderLogo
                      providerId={provider.id}
                      providerName={provider.name}
                      size="lg"
                    />
                  </span>
                  <span className="text-xs font-medium line-clamp-1">{provider.name}</span>
                  {provider.supported_indicators && provider.supported_indicators.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-0.5">
                      {provider.supported_indicators.map((indicator) => (
                        <span 
                          key={indicator}
                          className={cn(
                            "text-[9px] px-1 py-0.5 rounded",
                            isProviderSelected(provider.id)
                              ? "bg-primary-foreground/15 text-primary-foreground/80"
                              : "bg-muted text-muted-foreground"
                          )}
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
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(88px,1fr))]">
          {lookupTypes.map((type) => {
            const isEnabled = isValueEnabled(type.value)
            const hasProviders = type.providers && type.providers.length > 0
            const isDisabled = !hasProviders
            const selectedCount = type.value.length
            
            return (
              (() => {
                const tile = (
                  <Button
                    key={type.id}
                    type="button"
                    variant={isEnabled ? "secondary" : "outline"}
                    className={cn(
                      "h-auto min-h-20 w-full justify-center px-3 py-3 text-center whitespace-normal",
                      isEnabled && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                    disabled={isDisabled}
                  >
                    <div className="flex h-full items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <span className={cn(
                          "text-xs font-medium leading-tight",
                          isDisabled
                            ? "text-muted-foreground/70"
                            : isEnabled
                              ? "text-primary-foreground"
                              : "text-foreground"
                        )}>
                          {type.label}
                        </span>
                        {isEnabled && (
                          <span className="text-[11px] text-primary-foreground/80">
                            {selectedCount} provider{selectedCount === 1 ? "" : "s"} selected
                          </span>
                        )}
                      </div>
                    </div>
                  </Button>
                )

                if (!hasProviders) {
                  return tile
                }

                return (
                  <ProviderPopover key={type.id} type={type}>
                    {tile}
                  </ProviderPopover>
                )
              })()
            )
          })}
        </div>
      </div>
    </div>
  )
}

