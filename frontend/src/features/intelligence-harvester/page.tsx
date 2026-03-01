import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import * as aggregators from "@/shared/lib/aggregators"
import { IntelligenceHarvesterSidebar } from "./components/IntelligenceHarvesterSidebar"
import { LookupConfiguration } from "./components/LookupConfiguration"
import { parseIndicators } from "@/shared/lib/indicator-utils"
import { useProviderSelection } from "@/shared/hooks"
import { ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"
import type { IndicatorResult, IndicatorType, LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet"
import { DownloadIcon, SearchIcon, SettingsIcon } from "lucide-react"

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

function mergeIndicatorResults(
  response: aggregators.IndicatorLookupResponse,
  updateResults: (indicator: string, newResults: LookupResult[]) => void
) {
  response.results.forEach(({ indicator, results }) => {
    if (results.length > 0) {
      updateResults(indicator, results as LookupResult[])
    }
  })
}

export default function IntelligenceHarvesterPage() {
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

  useEffect(() => {
    if (indicators.length === 0) {
      setActiveIndicator(null)
    }
  }, [indicators])

  // --- Backend queries ---

  // Identify indicator types (IP, domain, hash, etc.) whenever the list changes.
  useEffect(() => {
    if (indicators.length === 0) { setIndicatorTypes(new Map()); return }
    aggregators.identifyIndicators(indicators)
      .then(results => {
        if (!Array.isArray(results)) return
        const types = new Map<string, IndicatorType>()
        results.forEach(r => { if (r?.value && r?.type) types.set(r.value, r.type) })
        setIndicatorTypes(types)
      })
      .catch(err => console.error("Failed to identify indicators:", err))
  }, [indicators])

  // Fetch the available providers per lookup type.
  const allProvidersQuery = useQuery({
    queryKey: ["all-providers"],
    queryFn: () => aggregators.getAllProviders(),
  })

  const providersByType = useMemo(() => {
    return allProvidersQuery.data?.providers_by_type || {
      whois: [], ip_info: [], reputation: [], dns: [], passive_dns: [],
      subdomains: [], whois_history: [], reverse_dns: [], screenshot: [], email_validator: [],
      cve_details: [], web_redirects: [], web_scan: [],
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

  const getProvidersPayloadForTypes = useCallback((types: Iterable<LookupType>) => {
    const providersForLookup: Record<string, string[]> = {}

    Array.from(types).forEach((type) => {
      const availableProviders: Provider[] = providersByType[type] ?? []
      const availableIds = new Set(availableProviders.map((provider) => provider.id))
      const selectedProviders = getProviderForType(type).filter((providerId) => availableIds.has(providerId))

      if (selectedProviders.length > 0) {
        providersForLookup[type] = selectedProviders
      }
    })

    return providersForLookup
  }, [getProviderForType, providersByType])

  // lookupMutation runs all enabled lookups for a given set of indicators at once.
  // Used only by auto-load; individual tab loads call handleResultsUpdate directly.
  const lookupMutation = useMutation({
    mutationFn: async (indicatorsToLookup: string[]) => {
      if (!indicatorsToLookup.length) throw new Error("No indicators to look up")
      const providersForLookup = getProvidersPayloadForTypes(enabledTypes)
      if (Object.keys(providersForLookup).length === 0) {
        throw new Error("No providers available for the requested lookup types")
      }

      return aggregators.performIndicatorLookups(indicatorsToLookup, providersForLookup)
    },
    onSuccess: (response) => {
      mergeIndicatorResults(response, handleResultsUpdate)
      setActiveIndicator(prev => {
        if (prev && response.results.some((item) => item.indicator === prev)) return prev
        return response.results[0]?.indicator ?? null
      })
    },
    onError: (error) => { console.error("Lookup failed:", error) },
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (indicators.length === 0) throw new Error("No observables to export")

      const providersForExport = getProvidersPayloadForTypes(enabledTypes)
      if (Object.keys(providersForExport).length === 0) {
        throw new Error("No provider categories enabled for export")
      }

      return aggregators.exportIndicatorLookupsExcel(indicators, providersForExport)
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "Intelligence_Harvester_Export.xlsx"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error("Export failed:", error)
    },
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
      setActiveIndicator(null)
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

    if (enabledChanged.length === 0) return

    const providersForLookup = getProvidersPayloadForTypes(enabledChanged)
    if (Object.keys(providersForLookup).length === 0) return

    async function reloadChangedTypes() {
      const response = await aggregators.performIndicatorLookups(indicators, providersForLookup)
      mergeIndicatorResults(response, handleResultsUpdate)
    }
    void reloadChangedTypes()
  }, [autoLoad, indicators, indicatorTypes, selections, enabledTypes, getProvidersPayloadForTypes, handleResultsUpdate])

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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mr-2 flex-shrink-0"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || indicators.length === 0}
          title="Export current observables to Excel"
        >
          <DownloadIcon className="h-4 w-4" />
          {exportMutation.isPending ? "Exporting..." : "Export"}
        </Button>

        {/* Provider configuration panel */}
        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="flex-shrink-0"
              title="Provider auto-load setup"
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
          getProviderForType={getProviderForType}
          providersByType={providersByType}
          onResultsUpdate={handleResultsUpdate}
        />
      </div>
    </div>
  )
}
