import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { getLogoPath } from "@/shared/utils/logo.utils"
import type { Provider, ProviderPreset } from "@/shared/types/intelligence-harvester"
import type { ProviderValue } from "@/shared/hooks"

interface LookupConfigurationProps {
  whoisProvider: ProviderValue
  setWhoisProvider: (value: ProviderValue) => void
  geoProvider: ProviderValue
  setGeoProvider: (value: ProviderValue) => void
  reputationProvider: ProviderValue
  setReputationProvider: (value: ProviderValue) => void
  dnsProvider: ProviderValue
  setDnsProvider: (value: ProviderValue) => void
  passiveDnsProvider: ProviderValue
  setPassiveDnsProvider: (value: ProviderValue) => void
  whoisHistoryProvider: ProviderValue
  setWhoisHistoryProvider: (value: ProviderValue) => void
  reverseDnsProvider: ProviderValue
  setReverseDnsProvider: (value: ProviderValue) => void
  screenshotProvider: ProviderValue
  setScreenshotProvider: (value: ProviderValue) => void
  emailValidationProvider: ProviderValue
  setEmailValidationProvider: (value: ProviderValue) => void
  vulnerabilityProvider: ProviderValue
  setVulnerabilityProvider: (value: ProviderValue) => void
  webSearchProvider: ProviderValue
  setWebSearchProvider: (value: ProviderValue) => void
  websiteStatusProvider: ProviderValue
  setWebsiteStatusProvider: (value: ProviderValue) => void
  providersByType: {
    whois?: Provider[]
    ip_info?: Provider[]
    reputation?: Provider[]
    dns?: Provider[]
    passive_dns?: Provider[]
    whois_history?: Provider[]
    reverse_dns?: Provider[]
    screenshot?: Provider[]
    email_validator?: Provider[]
    vulnerability?: Provider[]
    web_search?: Provider[]
    website_status?: Provider[]
  }
  presets?: Record<string, ProviderPreset>
}

type LookupType = {
  id: string
  label: string
  value: ProviderValue
  setValue: (v: ProviderValue) => void
  providers?: Provider[]
}

function ProviderPopover({ type }: { type: LookupType }) {
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
  whoisProvider,
  setWhoisProvider,
  geoProvider,
  setGeoProvider,
  reputationProvider,
  setReputationProvider,
  dnsProvider,
  setDnsProvider,
  passiveDnsProvider,
  setPassiveDnsProvider,
  whoisHistoryProvider,
  setWhoisHistoryProvider,
  reverseDnsProvider,
  setReverseDnsProvider,
  screenshotProvider,
  setScreenshotProvider,
  emailValidationProvider,
  setEmailValidationProvider,
  vulnerabilityProvider,
  setVulnerabilityProvider,
  webSearchProvider,
  setWebSearchProvider,
  websiteStatusProvider,
  setWebsiteStatusProvider,
  providersByType,
  presets,
}: LookupConfigurationProps) {
  const lookupTypes: LookupType[] = [
    { id: 'whois', label: 'WHOIS', value: whoisProvider, setValue: setWhoisProvider, providers: providersByType.whois },
    { id: 'dns', label: 'DNS', value: dnsProvider, setValue: setDnsProvider, providers: providersByType.dns },
    { id: 'ip_info', label: 'IP Info', value: geoProvider, setValue: setGeoProvider, providers: providersByType.ip_info },
    { id: 'reputation', label: 'Reputation', value: reputationProvider, setValue: setReputationProvider, providers: providersByType.reputation },
    { id: 'passive_dns', label: 'Passive DNS', value: passiveDnsProvider, setValue: setPassiveDnsProvider, providers: providersByType.passive_dns },
    { id: 'whois_history', label: 'WHOIS History', value: whoisHistoryProvider, setValue: setWhoisHistoryProvider, providers: providersByType.whois_history },
    { id: 'reverse_dns', label: 'Reverse DNS', value: reverseDnsProvider, setValue: setReverseDnsProvider, providers: providersByType.reverse_dns },
    { id: 'screenshot', label: 'Screenshot', value: screenshotProvider, setValue: setScreenshotProvider, providers: providersByType.screenshot },
    { id: 'email', label: 'Email Validator', value: emailValidationProvider, setValue: setEmailValidationProvider, providers: providersByType.email_validator },
    { id: 'vuln', label: 'Vulnerability', value: vulnerabilityProvider, setValue: setVulnerabilityProvider, providers: providersByType.vulnerability },
    { id: 'web_search', label: 'Web Search', value: webSearchProvider, setValue: setWebSearchProvider, providers: providersByType.web_search },
    { id: 'website_status', label: 'Website Status', value: websiteStatusProvider, setValue: setWebsiteStatusProvider, providers: providersByType.website_status },
  ]

  // Helper to check if enabled
  const isValueEnabled = (value: ProviderValue) => {
    return value.length > 0
  }

  const enabledCount = lookupTypes.filter(t => isValueEnabled(t.value)).length

  const pickAvailable = (preferred: string[], providers?: Provider[]): ProviderValue => {
    if (!providers || providers.length === 0) return []
    const availableIds = new Set(providers.filter(p => p.available).map(p => p.id))
    const filtered = preferred.filter(id => availableIds.has(id))
    return filtered
  }

  const applyPreset = (presetName: string) => {
    const config = presets?.[presetName] as ProviderPreset | undefined
    if (!config?.providers) return

    const providers = config.providers
    
    setWhoisProvider(pickAvailable(providers.whois || [], providersByType.whois))
    setDnsProvider(pickAvailable(providers.dns || [], providersByType.dns))
    setGeoProvider(pickAvailable(providers.ip_info || [], providersByType.ip_info))
    setReputationProvider(pickAvailable(providers.reputation || [], providersByType.reputation))
    setPassiveDnsProvider(pickAvailable(providers.passive_dns || [], providersByType.passive_dns))
    setWhoisHistoryProvider(pickAvailable(providers.whois_history || [], providersByType.whois_history))
    setReverseDnsProvider(pickAvailable(providers.reverse_dns || [], providersByType.reverse_dns))
    setScreenshotProvider(pickAvailable(providers.screenshot || [], providersByType.screenshot))
    setEmailValidationProvider(pickAvailable(providers.email_validator || [], providersByType.email_validator))
    setVulnerabilityProvider(pickAvailable(providers.vulnerability || [], providersByType.vulnerability))
    setWebSearchProvider(pickAvailable(providers.web_search || [], providersByType.web_search))
    setWebsiteStatusProvider(pickAvailable(providers.website_status || [], providersByType.website_status))
  }

  const clearAllSelections = () => {
    setWhoisProvider([])
    setDnsProvider([])
    setGeoProvider([])
    setReputationProvider([])
    setPassiveDnsProvider([])
    setWhoisHistoryProvider([])
    setReverseDnsProvider([])
    setScreenshotProvider([])
    setEmailValidationProvider([])
    setVulnerabilityProvider([])
    setWebSearchProvider([])
    setWebsiteStatusProvider([])
  }

  return (
    <Card className="rounded-tr-lg rounded-tl-none rounded-b-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Configure Lookup
            <Badge variant="secondary" className="text-xs">
              {enabledCount} of 12 active
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearAllSelections}
            >
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
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Lookup type cards with inline config */}
        <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(80px,1fr))]">
          {lookupTypes.map((type) => {
            const isEnabled = isValueEnabled(type.value)
            const hasProviders = type.providers && type.providers.length > 0
            const isDisabled = !hasProviders
            
            return (
              <div 
                key={type.id}
                className={`relative group rounded-lg border transition-all ${
                  isDisabled
                    ? 'border-muted bg-muted/30 opacity-50'
                    : isEnabled 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground/20'
                }`}
              >
                {/* Settings popover - show when has providers */}
                {hasProviders && (
                  <ProviderPopover type={type} />
                )}
                
                {/* Main card content */}
                <div
                  className={`p-2 h-full flex items-center justify-center ${
                    isDisabled 
                      ? 'cursor-not-allowed' 
                      : 'cursor-pointer hover:bg-primary/5'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <span className={`text-[11px] font-medium leading-tight ${
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
              </div>
            )
          })}
        </div>

      </CardContent>
    </Card>
  )
}

