import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"

import * as aggregators from "@/shared/lib/aggregators"
import { parseIndicators } from "@/shared/lib/indicator-utils"
import { useProviderSelection } from "@/shared/hooks"
import type { IndicatorResult, IndicatorType, LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"

import {
  buildProvidersPayloadForTypes,
  createEmptyProvidersByType,
  getChangedLookupTypes,
  loadStoredIndicators,
  mergeIndicatorResults,
  mergeResults,
  persistIndicators,
  requireProvidersPayload,
  removeIndicatorsFromMap,
} from "./page-utils"

export function useIntelligenceHarvesterPage() {
  const [indicators, setIndicators] = useState<string[]>(loadStoredIndicators)
  const [storedIndicatorTypes, setStoredIndicatorTypes] = useState<Map<string, IndicatorType>>(new Map())
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set())
  const [selectedActiveIndicator, setSelectedActiveIndicator] = useState<string | null>(null)
  const [allResults, setAllResults] = useState<Map<string, LookupResult[]>>(new Map())

  const { selections, setProviderForType, enabledTypes, getProviderForType } = useProviderSelection()
  const autoLoad = enabledTypes.size > 0
  const autoLoadedRef = useRef(new Set<string>())
  const previousSelectionsRef = useRef(selections)

  useEffect(() => {
    persistIndicators(indicators)
  }, [indicators])

  const activeIndicator = useMemo(() => {
    if (!selectedActiveIndicator) return null
    return indicators.includes(selectedActiveIndicator) ? selectedActiveIndicator : null
  }, [indicators, selectedActiveIndicator])

  const indicatorTypes = useMemo(() => {
    if (indicators.length === 0) return new Map<string, IndicatorType>()
    return storedIndicatorTypes
  }, [indicators.length, storedIndicatorTypes])

  useEffect(() => {
    if (indicators.length === 0) return
    const missingIndicators = indicators.filter((indicator) => !storedIndicatorTypes.has(indicator))
    if (missingIndicators.length === 0) return

    aggregators.identifyIndicators(missingIndicators)
      .then((results) => {
        if (!Array.isArray(results)) return
        setStoredIndicatorTypes((prev) => {
          const next = new Map(prev)
          results.forEach((result) => {
            if (result?.value && result?.type) {
              next.set(result.value, result.type)
            }
          })
          return next
        })
      })
      .catch((error) => console.error("Failed to identify indicators:", error))
  }, [indicators, storedIndicatorTypes])

  const allProvidersQuery = useQuery({
    queryKey: ["all-providers"],
    queryFn: () => aggregators.getAllProviders(),
  })

  const providersByType = useMemo<Record<LookupType, Provider[]>>(() => {
    return (allProvidersQuery.data?.providers_by_type as Record<LookupType, Provider[]>) ?? createEmptyProvidersByType()
  }, [allProvidersQuery.data?.providers_by_type])

  const handleResultsUpdate = useCallback((indicator: string, newResults: LookupResult[]) => {
    setAllResults((prev) => {
      const next = new Map(prev)
      next.set(indicator, mergeResults(next.get(indicator) ?? [], newResults))
      return next
    })
  }, [])

  const getProvidersPayloadForTypes = useCallback((types: Iterable<LookupType>) => {
    return buildProvidersPayloadForTypes(types, providersByType, getProviderForType)
  }, [getProviderForType, providersByType])

  const lookupMutation = useMutation({
    mutationFn: async (indicatorsToLookup: string[]) => {
      if (!indicatorsToLookup.length) throw new Error("No indicators to look up")
      const providersForLookup = requireProvidersPayload(
        enabledTypes,
        providersByType,
        getProviderForType,
        "No providers available for the requested lookup types"
      )

      return aggregators.performIndicatorLookups(indicatorsToLookup, providersForLookup)
    },
    onSuccess: (response) => {
      mergeIndicatorResults(response, handleResultsUpdate)
      setSelectedActiveIndicator((prev) => {
        if (prev && response.results.some((item) => item.indicator === prev)) return prev
        return response.results[0]?.indicator ?? null
      })
    },
    onError: (error) => {
      console.error("Lookup failed:", error)
    },
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (indicators.length === 0) throw new Error("No observables to export")
      const providersForExport = requireProvidersPayload(
        enabledTypes,
        providersByType,
        getProviderForType,
        "No provider categories enabled for export"
      )

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

  const lookupResults = useMemo<IndicatorResult[]>(() => {
    return Array.from(allResults.entries()).map(([indicator, results]) => ({ indicator, results }))
  }, [allResults])

  const addIndicators = useCallback((raw: string) => {
    const existing = new Set(indicators)
    const additions = parseIndicators(raw).filter((value) => !existing.has(value))
    if (!additions.length) return []
    setIndicators((prev) => [...prev, ...additions])
    return additions
  }, [indicators])

  const toggleIndicator = useCallback((indicator: string) => {
    setSelectedIndicators((prev) => {
      const next = new Set(prev)
      if (next.has(indicator)) {
        next.delete(indicator)
      } else {
        next.add(indicator)
      }
      return next
    })
  }, [])

  const toggleAllIndicators = useCallback((checked: boolean) => {
    setSelectedIndicators(checked ? new Set(indicators) : new Set())
  }, [indicators])

  const removeIndicatorData = useCallback((toRemove: Set<string>) => {
    setStoredIndicatorTypes((prev) => removeIndicatorsFromMap(prev, toRemove))
    setAllResults((prev) => removeIndicatorsFromMap(prev, toRemove))
    toRemove.forEach((indicator) => autoLoadedRef.current.delete(indicator))
  }, [])

  const reconcileActiveIndicatorAfterRemoval = useCallback((toRemove: Set<string>, remaining: string[]) => {
    if (remaining.length === 0) {
      setSelectedActiveIndicator(null)
      lookupMutation.reset()
    } else if (activeIndicator && toRemove.has(activeIndicator)) {
      setSelectedActiveIndicator(null)
    }
  }, [activeIndicator, lookupMutation])

  const removeIndicatorsFromState = useCallback((toRemove: Set<string>, remaining: string[]) => {
    removeIndicatorData(toRemove)
    reconcileActiveIndicatorAfterRemoval(toRemove, remaining)
  }, [reconcileActiveIndicatorAfterRemoval, removeIndicatorData])

  const removeIndicator = useCallback((indicator: string) => {
    const remaining = indicators.filter((value) => value !== indicator)
    setIndicators(remaining)
    setSelectedIndicators((prev) => {
      const next = new Set(prev)
      next.delete(indicator)
      return next
    })
    removeIndicatorsFromState(new Set([indicator]), remaining)
  }, [indicators, removeIndicatorsFromState])

  const removeSelectedIndicators = useCallback(() => {
    if (!selectedIndicators.size) return
    const remaining = indicators.filter((value) => !selectedIndicators.has(value))
    setIndicators(remaining)
    removeIndicatorsFromState(new Set(selectedIndicators), remaining)
    setSelectedIndicators(new Set())
  }, [indicators, removeIndicatorsFromState, selectedIndicators])

  const clearAllIndicators = useCallback(() => {
    setIndicators([])
    setStoredIndicatorTypes(new Map())
    setAllResults(new Map())
    setSelectedIndicators(new Set())
    setSelectedActiveIndicator(null)
    autoLoadedRef.current = new Set()
    lookupMutation.reset()
  }, [lookupMutation])

  useEffect(() => {
    if (!autoLoad || indicators.length === 0 || indicatorTypes.size !== indicators.length) return
    const unloaded = indicators.filter((indicator) => !autoLoadedRef.current.has(indicator))
    if (unloaded.length === 0) return
    unloaded.forEach((indicator) => autoLoadedRef.current.add(indicator))
    lookupMutation.mutate(unloaded)
  }, [autoLoad, indicators, indicatorTypes.size, lookupMutation])

  useEffect(() => {
    if (!autoLoad || indicators.length === 0 || indicatorTypes.size !== indicators.length) {
      previousSelectionsRef.current = selections
      return
    }

    const changedTypes = getChangedLookupTypes(previousSelectionsRef.current, selections)
    previousSelectionsRef.current = selections
    if (changedTypes.length === 0) return

    const enabledChanged = changedTypes.filter((type) => enabledTypes.has(type as LookupType)) as LookupType[]
    if (enabledChanged.length === 0) return

    const providersForLookup = getProvidersPayloadForTypes(enabledChanged)
    if (Object.keys(providersForLookup).length === 0) return

    async function reloadChangedTypes() {
      const response = await aggregators.performIndicatorLookups(indicators, providersForLookup)
      mergeIndicatorResults(response, handleResultsUpdate)
    }

    void reloadChangedTypes()
  }, [
    autoLoad,
    enabledTypes,
    getProvidersPayloadForTypes,
    handleResultsUpdate,
    indicatorTypes,
    indicators,
    selections,
  ])

  return {
    indicators,
    indicatorTypes,
    selectedIndicators,
    activeIndicator,
    setActiveIndicator: setSelectedActiveIndicator,
    lookupResults,
    selections,
    setProviderForType,
    enabledTypes,
    getProviderForType,
    providersByType,
    presets: allProvidersQuery.data?.presets,
    isLookupLoading: lookupMutation.isPending,
    isExporting: exportMutation.isPending,
    onResultsUpdate: handleResultsUpdate,
    addIndicators,
    toggleIndicator,
    toggleAllIndicators,
    removeSelectedIndicators,
    removeIndicator,
    clearAllIndicators,
    exportResults: () => exportMutation.mutate(),
  }
}
