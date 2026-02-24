import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/shared/lib/auth"
import * as aggregators from "@/shared/lib/aggregators"
import { IntelligenceHarvesterSidebar, LookupConfiguration } from "./components"
import { parseIndicators } from "@/shared/lib/indicator-utils"
import { useProviderSelection } from "@/shared/hooks"
import { executeIndicatorLookups } from "@/shared/services"
import type { IndicatorResult, IndicatorType, LookupResult, LookupType } from "@/shared/types/intelligence-harvester"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet"
import { SearchIcon, SettingsIcon } from "lucide-react"

const PROVIDER_KEY_TO_LOOKUP_TYPE = {
  whois: "whois",
  geoLocation: "ip_info",
  reputation: "reputation",
  dns: "dns",
  passiveDns: "passive_dns",
  whoisHistory: "whois_history",
  reverseDns: "reverse_dns",
  screenshot: "screenshot",
  emailValidator: "email_validator",
  cveDetails: "cve_details",
  websiteStatus: "website_details",
} as const

function sameProviderSelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const aSorted = [...a].sort()
  const bSorted = [...b].sort()
  return aSorted.every((value, index) => value === bSorted[index])
}

function getLookupResultKey(result: LookupResult): string {
  return `${result._lookup_type}::${result._provider || "unknown"}`
}

export default function IntelligenceHarvesterPage() {
  const { token } = useAuth()
  const [quickInput, setQuickInput] = useState("")
  const [indicators, setIndicators] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem("ih.indicators")
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch (error) {
      console.error("Failed to parse stored indicators from localStorage:", error)
      return []
    }
  })
  const [indicatorTypes, setIndicatorTypes] = useState<Map<string, IndicatorType>>(new Map())
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set())
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [manualResults, setManualResults] = useState<Map<string, LookupResult[]>>(new Map())

  // Use custom hook for provider selection
  const { selections, setters, enabledTypes, getProviderForType } = useProviderSelection()

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("ih.indicators", JSON.stringify(indicators))
  }, [indicators])

  // Auto-select first indicator for display when indicators list changes
  useEffect(() => {
    if (indicators.length > 0 && !activeIndicator) {
      setActiveIndicator(indicators[0])
    } else if (indicators.length === 0) {
      setActiveIndicator(null)
    }
  }, [indicators, activeIndicator])

  // Identifier mutation - separate from the effect
  const identifierMutation = useMutation({
    mutationFn: async (indicatorsToIdentify: string[]) => {
      if (!token) throw new Error("Not authenticated")
      if (indicatorsToIdentify.length === 0) return []
      
      const results = await aggregators.identifyIndicators(indicatorsToIdentify, token)
      
      // Validate response structure
      if (!Array.isArray(results)) {
        console.error("Invalid identifier response structure. Expected array, got:", typeof results)
        return []
      }
      
      return results
    },
    onSuccess: (results) => {
      setIndicatorTypes(() => {
        const next = new Map<string, IndicatorType>()
        results.forEach((result) => {
          if (result?.value && result?.type) {
            next.set(result.value, result.type)
          }
        })
        return next
      })
    },
    onError: (error) => {
      console.error("Failed to identify indicators:", error)
    },
  })

  // Auto-identify indicators when the list changes
  useEffect(() => {
    if (!token || indicators.length === 0) {
      setIndicatorTypes(new Map())
      return
    }
    identifierMutation.mutate(indicators)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, indicators])

  // Fetch all providers in a single call
  const allProvidersQuery = useQuery({
    queryKey: ["all-providers"],
    queryFn: () => aggregators.getAllProviders(token!),
    enabled: !!token,
  })

  // Get current providers list
  const providersByType = useMemo(() => {
    return allProvidersQuery.data?.providers_by_type || {
      whois: [],
      ip_info: [],
      reputation: [],
      dns: [],
      passive_dns: [],
      whois_history: [],
      reverse_dns: [],
      screenshot: [],
      email_validator: [],
      cve_details: [],
      website_details: [],
    }
  }, [allProvidersQuery.data?.providers_by_type])

  const filteredIndicators = useMemo(() => {
    return indicators
  }, [indicators])

  const addIndicators = (raw: string) => {
    const indicatorSet = new Set(indicators)
    const additions = parseIndicators(raw).filter(
      (value) => !indicatorSet.has(value)
    )
    if (!additions.length) return []

    setIndicators((prev) => [...prev, ...additions])
    return additions
  }

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators((prev) => {
      const next = new Set(prev)
      if (next.has(indicator)) {
        next.delete(indicator)
      } else {
        next.add(indicator)
      }
      return next
    })
  }

  const toggleAllIndicators = (checked: boolean) => {
    if (checked) {
      setSelectedIndicators(new Set(filteredIndicators))
    } else {
      setSelectedIndicators(new Set())
    }
  }

  const removeIndicator = (indicator: string) => {
    const updatedIndicators = indicators.filter((value) => value !== indicator)
    setIndicators(updatedIndicators)
    setIndicatorTypes((prev) => {
      const next = new Map(prev)
      next.delete(indicator)
      return next
    })
    setSelectedIndicators((prev) => {
      const next = new Set(prev)
      next.delete(indicator)
      return next
    })
    setLoadedIndicators((prev) => {
      const next = new Set(prev)
      next.delete(indicator)
      return next
    })
    // Clear activeIndicator if we're removing it or if no indicators remain
    if (activeIndicator === indicator || updatedIndicators.length === 0) {
      setActiveIndicator(null)
    }
    // Reset lookup results if no indicators remain
    if (updatedIndicators.length === 0) {
      lookupMutation.reset()
    }
  }

  const removeSelectedIndicators = () => {
    if (!selectedIndicators.size) return
    const updatedIndicators = indicators.filter((value) => !selectedIndicators.has(value))
    setIndicators(updatedIndicators)
    setIndicatorTypes((prev) => {
      const next = new Map(prev)
      selectedIndicators.forEach((indicator) => next.delete(indicator))
      return next
    })
    setLoadedIndicators((prev) => {
      const next = new Set(prev)
      selectedIndicators.forEach((indicator) => next.delete(indicator))
      return next
    })
    setSelectedIndicators(new Set())
    // Clear activeIndicator if it's being removed or if no indicators remain
    if ((activeIndicator && selectedIndicators.has(activeIndicator)) || updatedIndicators.length === 0) {
      setActiveIndicator(null)
    }
    // Reset lookup results if no indicators remain
    if (updatedIndicators.length === 0) {
      lookupMutation.reset()
    }
  }

  const clearAllIndicators = () => {
    setIndicators([])
    setIndicatorTypes(new Map())
    setSelectedIndicators(new Set())
    setLoadedIndicators(new Set())
    setActiveIndicator(null)
    lookupMutation.reset()
  }

  // Perform lookup mutation
  const lookupMutation = useMutation({
    mutationFn: async (indicatorsToLookup: string[]) => {
      if (!token) throw new Error("Not authenticated")

      if (!indicatorsToLookup.length) {
        throw new Error("No indicators selected")
      }

      const tasks = indicatorsToLookup.map(async (indicator) => {
        const indicatorType = indicatorTypes.get(indicator)
        
        if (!indicatorType) {
          console.warn(`No indicator type found for: "${indicator}"`)
          return { indicator, results: [] }
        }
        
        console.log(`[Page] Running lookup for ${indicator} (${indicatorType}), enabledTypes:`, Array.from(enabledTypes))
        
        const results = await executeIndicatorLookups({
          indicator,
          indicatorType,
          selectedTypes: enabledTypes,
          providers_by_type: providersByType,
          getProviderForType,
          token,
        })

        return { indicator, results }
      })

      return Promise.all(tasks)
    },
    onSuccess: (data) => {
      const results = data as IndicatorResult[]
      const first = results[0]?.indicator ?? null
      setActiveIndicator((prev) => {
        if (prev && results.some((item) => item.indicator === prev)) {
          return prev
        }
        return first
      })
    },
    onError: (error) => {
      console.error("Lookup failed:", error)
    },
  })

  const lookupResults = useMemo<IndicatorResult[]>(() => {
    const baseResults = Array.isArray(lookupMutation.data) 
      ? lookupMutation.data.filter(item => item?.indicator && Array.isArray(item.results))
      : []
    
    // Create a map of indicators from base results
    const resultMap = new Map<string, IndicatorResult>()
    
    // Add base results first
    baseResults.forEach(item => {
      const baseFiltered = item.results
      const additionalResults = manualResults.get(item.indicator) || []

      if (additionalResults.length === 0) {
        resultMap.set(item.indicator, { ...item, results: baseFiltered })
        return
      }

      // Merge by lookup type + provider to preserve all provider tabs
      const mergedByTypeAndProvider = new Map<string, LookupResult>()
      baseFiltered.forEach((result) => mergedByTypeAndProvider.set(getLookupResultKey(result), result))
      additionalResults.forEach((result) => mergedByTypeAndProvider.set(getLookupResultKey(result), result))

      resultMap.set(item.indicator, {
        ...item,
        results: Array.from(mergedByTypeAndProvider.values())
      })
    })
    
    // Add indicators that only have manual results (no auto-load data)
    manualResults.forEach((results, indicator) => {
      if (!resultMap.has(indicator)) {
        resultMap.set(indicator, {
          indicator,
          results
        })
      }
    })
    
    return Array.from(resultMap.values())
  }, [lookupMutation.data, manualResults])

  // Handle individual tab lookup results (merge with existing results)
  const handleResultsUpdate = useCallback((indicator: string, newResults: LookupResult[]) => {
    setManualResults(prev => {
      const next = new Map(prev)
      const existing = next.get(indicator) || []

      // Merge by lookup type + provider so ad-hoc tabs keep all providers
      const mergedByTypeAndProvider = new Map<string, LookupResult>()
      existing.forEach((result) => mergedByTypeAndProvider.set(getLookupResultKey(result), result))
      newResults.forEach((result) => mergedByTypeAndProvider.set(getLookupResultKey(result), result))

      next.set(indicator, Array.from(mergedByTypeAndProvider.values()))
      return next
    })
  }, [])

  // Auto-load lookups when indicators are identified (if enabled)
  const [autoLoad, setAutoLoad] = useState(() => {
    try {
      const stored = localStorage.getItem("intelligenceHarvester_autoLoad")
      return stored ? JSON.parse(stored) : false
    } catch {
      return false
    }
  })
  const [loadedIndicators, setLoadedIndicators] = useState<Set<string>>(new Set())
  const previousSelectionsRef = useRef(selections)
  
  // Save autoLoad setting to localStorage
  useEffect(() => {
    localStorage.setItem("intelligenceHarvester_autoLoad", JSON.stringify(autoLoad))
  }, [autoLoad])
  
  useEffect(() => {
    // Only trigger lookup for indicators that haven't been loaded yet
    if (!autoLoad || indicators.length === 0 || indicatorTypes.size !== indicators.length) {
      return
    }
    
    const newIndicators = indicators.filter(ind => !loadedIndicators.has(ind))
    if (newIndicators.length > 0) {
      setLoadedIndicators(prev => new Set([...prev, ...newIndicators]))
      lookupMutation.mutate(newIndicators)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, indicators, indicatorTypes.size])

  // Re-run only changed lookup types when provider configuration changes (auto-load mode)
  useEffect(() => {
    if (!autoLoad || indicators.length === 0 || indicatorTypes.size !== indicators.length) {
      previousSelectionsRef.current = selections
      return
    }

    const previousSelections = previousSelectionsRef.current
    const changedTypes = new Set<string>()

    ;(Object.keys(PROVIDER_KEY_TO_LOOKUP_TYPE) as Array<keyof typeof PROVIDER_KEY_TO_LOOKUP_TYPE>).forEach((key) => {
      const previousValue = previousSelections[key] || []
      const currentValue = selections[key] || []
      if (!sameProviderSelection(previousValue, currentValue)) {
        changedTypes.add(PROVIDER_KEY_TO_LOOKUP_TYPE[key])
      }
    })

    if (changedTypes.size === 0) {
      return
    }

    previousSelectionsRef.current = selections

    const enabledChangedTypes = new Set(
      Array.from(changedTypes).filter((type) => enabledTypes.has(type as LookupType))
    ) as Set<LookupType>
    const disabledChangedTypes = new Set(
      Array.from(changedTypes).filter((type) => !enabledTypes.has(type as LookupType))
    ) as Set<LookupType>

    // Remove stale manual results for disabled lookup types
    if (disabledChangedTypes.size > 0) {
      setManualResults(prev => {
        const next = new Map<string, LookupResult[]>()
        prev.forEach((results, indicator) => {
          next.set(
            indicator,
            results.filter(result => result._lookup_type && !disabledChangedTypes.has(result._lookup_type))
          )
        })
        return next
      })
    }

    if (enabledChangedTypes.size === 0 || !token) {
      return
    }

    void (async () => {
      const tasks = indicators.map(async (indicator) => {
        const indicatorType = indicatorTypes.get(indicator)
        if (!indicatorType) return

        const results = await executeIndicatorLookups({
          indicator,
          indicatorType,
          selectedTypes: enabledChangedTypes,
          providers_by_type: providersByType,
          getProviderForType,
          token,
        })

        if (results.length > 0) {
          handleResultsUpdate(indicator, results)
        }
      })

      await Promise.all(tasks)
      setLoadedIndicators(new Set(indicators))
    })()
  }, [autoLoad, indicators, indicatorTypes, selections, enabledTypes, token, providersByType, getProviderForType, handleResultsUpdate])

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-card overflow-hidden">
      {/* Simple Search Bar */}
      <div className="flex-shrink-0 border-b bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter indicators: IPs, domains, URLs, hashes..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (quickInput.trim()) {
                    addIndicators(quickInput)
                    setQuickInput("")
                  }
                }
              }}
              className="pl-10"
            />
          </div>

          {/* Advanced Settings Sheet */}
          <Sheet open={configOpen} onOpenChange={setConfigOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                title="Advanced provider settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] overflow-y-auto">
              <SheetHeader className="sr-only">
                <SheetTitle>Provider Configuration</SheetTitle>
                <SheetDescription>
                  Configure lookup providers and auto-load behavior for intelligence harvesting.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">Provider Configuration</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize which providers to use for each lookup type. By default, all available providers are used.
                </p>
                <LookupConfiguration
                  whoisProvider={selections.whois}
                  setWhoisProvider={setters.setWhois}
                  geoProvider={selections.geoLocation}
                  setGeoProvider={setters.setGeoLocation}
                  reputationProvider={selections.reputation}
                  setReputationProvider={setters.setReputation}
                  dnsProvider={selections.dns}
                  setDnsProvider={setters.setDns}
                  passiveDnsProvider={selections.passiveDns}
                  setPassiveDnsProvider={setters.setPassiveDns}
                  whoisHistoryProvider={selections.whoisHistory}
                  setWhoisHistoryProvider={setters.setWhoisHistory}
                  reverseDnsProvider={selections.reverseDns}
                  setReverseDnsProvider={setters.setReverseDns}
                  screenshotProvider={selections.screenshot}
                  setScreenshotProvider={setters.setScreenshot}
                  emailValidationProvider={selections.emailValidator}
                  setEmailValidationProvider={setters.setEmailValidator}
                  cveDetailsProvider={selections.cveDetails}
                  setCveDetailsProvider={setters.setCveDetails}
                  websiteStatusProvider={selections.websiteStatus}
                  setWebsiteStatusProvider={setters.setWebsiteStatus}
                  providersByType={providersByType}
                  presets={allProvidersQuery.data?.presets}
                  autoLoad={autoLoad}
                  setAutoLoad={setAutoLoad}
                  className="border-0 shadow-none"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Panel - Full Width Below */}
      <div className="flex-1 min-h-0">
        <IntelligenceHarvesterSidebar 
          indicators={indicators}
          indicatorTypes={indicatorTypes}
          selectedIndicators={selectedIndicators}
          activeIndicator={activeIndicator}
          lookupResults={lookupResults}
          isLoading={lookupMutation.isPending}
          onToggleIndicator={toggleIndicator}
          onToggleAll={toggleAllIndicators}
          onRemoveSelected={removeSelectedIndicators}
          onRemoveIndicator={removeIndicator}
          onClearAll={clearAllIndicators}
          onIndicatorClick={setActiveIndicator}
          token={token ?? undefined}
          getProviderForType={getProviderForType}
          providersByType={providersByType}
          onResultsUpdate={handleResultsUpdate}
        />
      </div>
    </div>
  )
}

