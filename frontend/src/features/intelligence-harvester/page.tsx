import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/shared/lib/auth"
import * as aggregators from "@/shared/lib/aggregators"
import { IntelligenceHarvesterSidebar, LookupConfiguration } from "./components"
import { parseIndicators } from "@/shared/lib/indicator-utils"
import { useProviderSelection } from "@/shared/hooks"
import { ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"
import { executeIndicatorLookups } from "@/shared/services"
import type { IndicatorResult, IndicatorType, LookupResult, LookupType } from "@/shared/types/intelligence-harvester"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet"
import { SearchIcon, SettingsIcon } from "lucide-react"

/**
 * Merges incoming results into an existing array.
 * Results with the same type+provider key overwrite older ones.
 */
function mergeResults(existing: LookupResult[], incoming: LookupResult[]): LookupResult[] {
  const byKey = new Map<string, LookupResult>()
  existing.forEach(r => byKey.set(`${r._lookup_type}::${r._provider ?? "unknown"}`, r))
  incoming.forEach(r => byKey.set(`${r._lookup_type}::${r._provider ?? "unknown"}`, r))
  return Array.from(byKey.values())
}

export default function IntelligenceHarvesterPage() {
  const { token } = useAuth()
  const [quickInput, setQuickInput] = useState("")
  const [indicators, setIndicators] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem("ih.indicators")
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

  // Single source of truth for all lookup results, keyed by indicator value.
  // Both auto-load and manual tab loads write here via handleResultsUpdate.
  const [allResults, setAllResults] = useState<Map<string, LookupResult[]>>(new Map())

  const { selections, setProviderForType, enabledTypes, getProviderForType } = useProviderSelection()
  const autoLoad = enabledTypes.size > 0
  // Tracks which indicators have already been submitted to auto-load.
  // Using a ref (not state) so updates don't trigger re-renders.
  // Kept separate from allResults so that manually-loaded indicators
  // (from tab clicks) are still picked up when auto-load is turned on.
  const autoLoadedRef = useRef(new Set<string>())
  // Stores the provider selections from the previous render so the effect below can
  // diff them against the current selections. A ref is used instead of state because
  // updating it should not trigger a re-render — it's purely bookkeeping.
  const previousSelectionsRef = useRef(selections)

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("ih.indicators", JSON.stringify(indicators))
  }, [indicators])

  // Auto-select the first indicator for display when the list changes.
  useEffect(() => {
    if (indicators.length > 0 && !activeIndicator) {
      setActiveIndicator(indicators[0])
    } else if (indicators.length === 0) {
      setActiveIndicator(null)
    }
  }, [indicators, activeIndicator])

  // --- Backend queries ---

  // Identify indicator types (IP, domain, hash, etc.) whenever the list changes.
  useEffect(() => {
    if (!token || indicators.length === 0) { setIndicatorTypes(new Map()); return }
    aggregators.identifyIndicators(indicators, token)
      .then(results => {
        if (!Array.isArray(results)) return
        const types = new Map<string, IndicatorType>()
        results.forEach(r => { if (r?.value && r?.type) types.set(r.value, r.type) })
        setIndicatorTypes(types)
      })
      .catch(err => console.error("Failed to identify indicators:", err))
  }, [token, indicators])

  // Fetch the available providers per lookup type.
  const allProvidersQuery = useQuery({
    queryKey: ["all-providers"],
    queryFn: () => aggregators.getAllProviders(token!),
    enabled: !!token,
  })

  const providersByType = useMemo(() => {
    return allProvidersQuery.data?.providers_by_type || {
      whois: [], ip_info: [], reputation: [], dns: [], passive_dns: [],
      whois_history: [], reverse_dns: [], screenshot: [], email_validator: [],
      cve_details: [], website_status: [], web_scan: [],
    }
  }, [allProvidersQuery.data?.providers_by_type])

  // --- Lookup execution ---

  // Merges new results from any source (auto-load or tab click) into allResults.
  const handleResultsUpdate = useCallback((indicator: string, newResults: LookupResult[]) => {
    setAllResults(prev => {
      const next = new Map(prev)
      next.set(indicator, mergeResults(next.get(indicator) ?? [], newResults))
      return next
    })
  }, [])

  // lookupMutation runs all enabled lookups for a given set of indicators at once.
  // Used only by auto-load; individual tab loads call handleResultsUpdate directly.
  const lookupMutation = useMutation({
    mutationFn: async (indicatorsToLookup: string[]) => {
      if (!token) throw new Error("Not authenticated")
      if (!indicatorsToLookup.length) throw new Error("No indicators to look up")

      const tasks = indicatorsToLookup.map(async (indicator) => {
        const indicatorType = indicatorTypes.get(indicator)
        if (!indicatorType) {
          console.warn(`No type found for "${indicator}"`)
          return { indicator, results: [] }
        }
        const results = await executeIndicatorLookups({
          indicator, indicatorType, selectedTypes: enabledTypes,
          providers_by_type: providersByType, getProviderForType, token,
        })
        return { indicator, results }
      })

      return Promise.all(tasks)
    },
    onSuccess: (data: IndicatorResult[]) => {
      data.forEach(({ indicator, results }) => {
        if (results.length > 0) handleResultsUpdate(indicator, results)
      })
      setActiveIndicator(prev => {
        if (prev && data.some(d => d.indicator === prev)) return prev
        return data[0]?.indicator ?? null
      })
    },
    onError: (error) => { console.error("Lookup failed:", error) },
  })

  // Flat array consumed by IntelligenceHarvesterSidebar.
  const lookupResults = useMemo<IndicatorResult[]>(() => {
    return Array.from(allResults.entries()).map(([indicator, results]) => ({ indicator, results }))
  }, [allResults])

  // --- Indicator management ---

  const addIndicators = (raw: string) => {
    const existing = new Set(indicators)
    const additions = parseIndicators(raw).filter(v => !existing.has(v))
    if (!additions.length) return []
    setIndicators(prev => [...prev, ...additions])
    return additions
  }

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators(prev => {
      const next = new Set(prev)
      if (next.has(indicator)) { next.delete(indicator) } else { next.add(indicator) }
      return next
    })
  }

  const toggleAllIndicators = (checked: boolean) => {
    setSelectedIndicators(checked ? new Set(indicators) : new Set())
  }

  /**
   * Shared cleanup for removing indicators from all derived state.
   * Called by removeIndicator, removeSelectedIndicators, and clearAllIndicators.
   */
  function removeIndicatorsFromState(toRemove: Set<string>, remaining: string[]) {
    setIndicatorTypes(prev => { const m = new Map(prev); toRemove.forEach(i => m.delete(i)); return m })
    setAllResults(prev => { const m = new Map(prev); toRemove.forEach(i => m.delete(i)); return m })
    toRemove.forEach(i => autoLoadedRef.current.delete(i))
    if (remaining.length === 0) {
      setActiveIndicator(null)
      lookupMutation.reset()
    } else if (activeIndicator && toRemove.has(activeIndicator)) {
      setActiveIndicator(remaining[0] ?? null)
    }
  }

  const removeIndicator = (indicator: string) => {
    const remaining = indicators.filter(v => v !== indicator)
    setIndicators(remaining)
    setSelectedIndicators(prev => { const s = new Set(prev); s.delete(indicator); return s })
    removeIndicatorsFromState(new Set([indicator]), remaining)
  }

  const removeSelectedIndicators = () => {
    if (!selectedIndicators.size) return
    const remaining = indicators.filter(v => !selectedIndicators.has(v))
    setIndicators(remaining)
    removeIndicatorsFromState(new Set(selectedIndicators), remaining)
    setSelectedIndicators(new Set())
  }

  const clearAllIndicators = () => {
    setIndicators([])
    setIndicatorTypes(new Map())
    setAllResults(new Map())
    setSelectedIndicators(new Set())
    setActiveIndicator(null)
    autoLoadedRef.current = new Set()
    lookupMutation.reset()
  }

  // --- Auto-load effects ---

  // Trigger auto-load for newly added indicators once all indicator types are identified.
  // Uses autoLoadedRef (not allResults) so indicators with partial manual results
  // are still batch-loaded when auto-load is turned on later.
  useEffect(() => {
    if (!autoLoad || indicators.length === 0 || indicatorTypes.size !== indicators.length) return
    const unloaded = indicators.filter(i => !autoLoadedRef.current.has(i))
    if (unloaded.length === 0) return
    // Mark synchronously before mutating so re-runs of this effect don't double-submit.
    unloaded.forEach(i => autoLoadedRef.current.add(i))
    lookupMutation.mutate(unloaded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, indicators, indicatorTypes.size])

  // Re-run lookups for any lookup types whose provider selection changed.
  useEffect(() => {
    if (!autoLoad || indicators.length === 0 || indicatorTypes.size !== indicators.length) {
      previousSelectionsRef.current = selections
      return
    }

    // Diff current vs previous selections to find changed types.
    const changedTypes = ALL_LOOKUP_TYPES.filter(type => {
      const prev = [...(previousSelectionsRef.current[type] ?? [])].sort().join(",")
      const curr = [...(selections[type] ?? [])].sort().join(",")
      return prev !== curr
    })

    previousSelectionsRef.current = selections
    if (changedTypes.length === 0) return

    const enabledChanged = changedTypes.filter(t => enabledTypes.has(t as LookupType)) as LookupType[]
    const disabledChanged = changedTypes.filter(t => !enabledTypes.has(t as LookupType))

    // Drop stale results for types that were just disabled.
    if (disabledChanged.length > 0) {
      const disabledSet = new Set(disabledChanged)
      setAllResults(prev => {
        const next = new Map<string, LookupResult[]>()
        prev.forEach((results, indicator) => {
          next.set(indicator, results.filter(r => r._lookup_type && !disabledSet.has(r._lookup_type)))
        })
        return next
      })
    }

    if (enabledChanged.length === 0 || !token) return
    // Capture token here - TypeScript can't narrow it inside an inner function.
    const tok = token

    // Re-fetch only the changed types for every loaded indicator.
    // Named inner function so the async logic reads clearly without an IIFE.
    async function reloadChangedTypes() {
      await Promise.all(indicators.map(async (indicator) => {
        const indicatorType = indicatorTypes.get(indicator)
        if (!indicatorType) return
        const results = await executeIndicatorLookups({
          indicator, indicatorType, selectedTypes: new Set(enabledChanged),
          providers_by_type: providersByType, getProviderForType, token: tok,
        })
        handleResultsUpdate(indicator, results)
      }))
    }
    void reloadChangedTypes()
  }, [autoLoad, indicators, indicatorTypes, selections, enabledTypes, token, providersByType, getProviderForType, handleResultsUpdate])

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-card overflow-hidden">
      {/* Search bar */}
      <div className="flex-shrink-0 border-b bg-background flex items-center px-4 py-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Enter observables: IPs, domains, URLs, hashes, CVEs..."
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
          className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent px-3"
        />

        {/* Provider configuration panel */}
        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              title="Provider configuration"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Provider Auto-Load Setup</SheetTitle>
              <SheetDescription>
                Choose which lookup categories should auto-run and which providers should be used for each one.
              </SheetDescription>
            </SheetHeader>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <LookupConfiguration
                selections={selections}
                setProviderForType={setProviderForType}
                providersByType={providersByType}
                presets={allProvidersQuery.data?.presets}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results panel */}
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
