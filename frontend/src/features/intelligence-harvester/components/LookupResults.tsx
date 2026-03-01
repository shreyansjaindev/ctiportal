import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { cn } from "@/shared/lib/utils"
import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { Info, Loader2 } from "lucide-react"
import * as aggregators from "@/shared/lib/aggregators"
import type { IndicatorResult, LookupResult, IndicatorType, LookupType, Provider } from "@/shared/types/intelligence-harvester"
import { isLookupApplicable, executeIndicatorLookups } from "@/shared/services/lookup.service"
import { detectIndicatorType } from "@/shared/lib/indicator-utils"
import { ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"

import { LookupResultsCategoryView } from "./LookupResultsCategoryView"
import { LookupTypeCard } from "./LookupTypeCard"

interface LookupResultsProps {
  indicators?: string[]
  results: IndicatorResult[]
  activeIndicator: string | null
  activeIndicatorTypeFilter?: IndicatorType | null
  indicatorTypes?: Map<string, IndicatorType>
  isLoading?: boolean
  className?: string
  getProviderForType?: (type: LookupType) => string[]
  providersByType?: Record<string, Provider[]>
  onResultsUpdate?: (indicator: string, newResults: LookupResult[]) => void
}

function mergeBulkLookupResponse(
  response: aggregators.IndicatorLookupResponse,
  updateResults: (indicator: string, newResults: LookupResult[]) => void
) {
  response.results.forEach(({ indicator, results }) => {
    if (results.length > 0) {
      updateResults(indicator, results as LookupResult[])
    }
  })
}

export function LookupResults({
  indicators = [], results, activeIndicator, indicatorTypes,
  activeIndicatorTypeFilter = null,
  isLoading = false, className,
  getProviderForType, providersByType, onResultsUpdate,
}: LookupResultsProps) {
  const [activeCategory, setActiveCategory] = useState<LookupType | null>(null)
  const [loadingTypes, setLoadingTypes] = useState<Set<LookupType>>(new Set())
  const [loadingTargets, setLoadingTargets] = useState<Map<LookupType, string | null>>(new Map())
  const [fetchedKeys, setFetchedKeys] = useState<Set<string>>(new Set())
  const [typeErrors, setTypeErrors] = useState<Map<LookupType, string>>(new Map())
  const [detailType, setDetailType] = useState<LookupType | null>(null)
  const categoryAutoLoadedRef = useRef(new Set<string>())

  const activeResult = results.find(item => item.indicator === activeIndicator)

  const activeIndicatorType = useMemo(() => {
    if (!activeIndicator) return undefined
    return indicatorTypes?.get(activeIndicator) ?? detectIndicatorType(activeIndicator)
  }, [activeIndicator, indicatorTypes])

  const resultsByType = useMemo(() => {
    const grouped: Record<string, LookupResult[]> = {}
    activeResult?.results.forEach(r => {
      const type = r._lookup_type || "unknown"
      grouped[type] = [...(grouped[type] ?? []), r]
    })
    return grouped
  }, [activeResult])

  const lookupTypes = useMemo(() => {
    if (!activeIndicatorType) {
      return Object.keys(resultsByType).filter(t => resultsByType[t].length > 0) as LookupType[]
    }
    return ALL_LOOKUP_TYPES.filter(type => isLookupApplicable(type, activeIndicatorType))
  }, [activeIndicatorType, resultsByType])

  const typeScopedLookupTypes = useMemo(() => {
    if (!activeIndicatorTypeFilter) return []
    return ALL_LOOKUP_TYPES.filter((type) => isLookupApplicable(type, activeIndicatorTypeFilter))
  }, [activeIndicatorTypeFilter])

  useEffect(() => {
    if (!activeIndicatorTypeFilter) {
      setActiveCategory(null)
      return
    }
    setActiveCategory((prev) => (prev && typeScopedLookupTypes.includes(prev) ? prev : null))
  }, [activeIndicatorTypeFilter, typeScopedLookupTypes])

  useEffect(() => {
    setDetailType(null)
  }, [activeIndicator])

  useEffect(() => {
    if (
      !activeIndicatorTypeFilter ||
      !activeCategory ||
      !getProviderForType ||
      !providersByType ||
      !onResultsUpdate ||
      indicators.length === 0
    ) {
      return
    }

    const lookupType = activeCategory
    const providerLookup = getProviderForType
    const providerMap = providersByType
    const resultUpdater = onResultsUpdate
    const selectedProviders = providerLookup(lookupType)
    if (selectedProviders.length === 0) return

    const availableProviderIds = new Set((providerMap[lookupType] ?? []).map((provider) => provider.id))
    const resolvedProviders = selectedProviders.filter((providerId) => availableProviderIds.has(providerId))
    if (resolvedProviders.length === 0) return

    const indicatorResultsMap = new Map(results.map((item) => [item.indicator, item.results]))
    const indicatorsToLoad = indicators.filter((indicator) => {
      const indicatorType = indicatorTypes?.get(indicator) ?? detectIndicatorType(indicator)
      if (!isLookupApplicable(activeCategory, indicatorType)) return false

      const existingResults = indicatorResultsMap.get(indicator) ?? []
      const hasAllSelectedProviders = resolvedProviders.every((providerId) =>
        existingResults.some(
          (result) => result._lookup_type === lookupType && result._provider === providerId
        )
      )
      if (hasAllSelectedProviders) return false

      const autoLoadKey = `${indicator}::${lookupType}::${resolvedProviders.slice().sort().join(",")}`
      if (categoryAutoLoadedRef.current.has(autoLoadKey)) return false

      categoryAutoLoadedRef.current.add(autoLoadKey)
      return true
    })

    if (indicatorsToLoad.length === 0) return

    setLoadingTypes((prev) => new Set(prev).add(lookupType))
    setLoadingTargets((prev) => {
      const next = new Map(prev)
      next.set(lookupType, "__selected__")
      return next
    })
    setTypeErrors((prev) => {
      const next = new Map(prev)
      next.delete(lookupType)
      return next
    })

    let cancelled = false

    async function loadCategory() {
      try {
        const response = await aggregators.performIndicatorLookups(
          indicatorsToLoad,
          { [lookupType]: resolvedProviders }
        )

        if (!cancelled) {
          mergeBulkLookupResponse(response, resultUpdater)
        }
      } catch (err) {
        if (!cancelled) {
          setTypeErrors((prev) => new Map(prev).set(
            lookupType,
            err instanceof Error ? err.message : "Failed to fetch data"
          ))
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes((prev) => {
            const next = new Set(prev)
            next.delete(lookupType)
            return next
          })
          setLoadingTargets((prev) => {
            const next = new Map(prev)
            next.delete(lookupType)
            return next
          })
        }
      }
    }

    void loadCategory()

    return () => {
      cancelled = true
    }
  }, [
    activeCategory,
    activeIndicatorTypeFilter,
    getProviderForType,
    indicatorTypes,
    indicators,
    onResultsUpdate,
    providersByType,
    results,
  ])

  const handleLookupType = useCallback(async (
    type: LookupType,
    isRetry = false,
    providerOverride?: string,
  ) => {
    if (!activeIndicator || !activeIndicatorType || !getProviderForType || !providersByType) return

    const providerLookup = getProviderForType
    const providerMap = providersByType

    const cacheKey = `${type}:${providerOverride ?? ""}`
    if (!isRetry && (loadingTypes.has(type) || fetchedKeys.has(cacheKey))) return

    setLoadingTypes(prev => new Set(prev).add(type))
    setLoadingTargets(prev => {
      const next = new Map(prev)
      next.set(type, providerOverride ?? "__selected__")
      return next
    })
    setTypeErrors(prev => {
      const next = new Map(prev)
      next.delete(type)
      return next
    })

    function resolveProviders(): string[] {
      if (providerOverride) return [providerOverride]
      return providerLookup(type)
    }

    try {
      const fetched = await executeIndicatorLookups({
        indicator: activeIndicator,
        indicatorType: activeIndicatorType,
        selectedTypes: new Set([type]),
        providers_by_type: providerMap,
        getProviderForType: (t) => t === type ? resolveProviders() : providerLookup(t),
      })
      if (onResultsUpdate && fetched.length > 0) onResultsUpdate(activeIndicator, fetched)
    } catch (err) {
      setTypeErrors(prev => new Map(prev).set(type, err instanceof Error ? err.message : "Failed to fetch data"))
    } finally {
      setFetchedKeys(prev => new Set(prev).add(cacheKey))
      setLoadingTypes(prev => {
        const next = new Set(prev)
        next.delete(type)
        return next
      })
      setLoadingTargets(prev => {
        const next = new Map(prev)
        next.delete(type)
        return next
      })
    }
  }, [activeIndicator, activeIndicatorType, getProviderForType, providersByType, onResultsUpdate, loadingTypes, fetchedKeys])

  const handleCategoryProviderLoad = useCallback(async (type: LookupType, providerId: string) => {
    if (!providersByType || !onResultsUpdate || indicators.length === 0) return

    const availableProviderIds = new Set((providersByType[type] ?? []).map((provider) => provider.id))
    if (!availableProviderIds.has(providerId)) return

    const indicatorResultsMap = new Map(results.map((item) => [item.indicator, item.results]))
    const indicatorsToLoad = indicators.filter((indicator) => {
      const indicatorType = indicatorTypes?.get(indicator) ?? detectIndicatorType(indicator)
      if (!isLookupApplicable(type, indicatorType)) return false

      const existingResults = indicatorResultsMap.get(indicator) ?? []
      return !existingResults.some(
        (result) => result._lookup_type === type && result._provider === providerId
      )
    })

    if (indicatorsToLoad.length === 0 || loadingTypes.has(type)) return

    setLoadingTypes((prev) => new Set(prev).add(type))
    setLoadingTargets((prev) => {
      const next = new Map(prev)
      next.set(type, providerId)
      return next
    })
    setTypeErrors((prev) => {
      const next = new Map(prev)
      next.delete(type)
      return next
    })

    try {
      const response = await aggregators.performIndicatorLookups(
        indicatorsToLoad,
        { [type]: [providerId] }
      )

      mergeBulkLookupResponse(response, onResultsUpdate)
    } catch (err) {
      setTypeErrors((prev) => new Map(prev).set(
        type,
        err instanceof Error ? err.message : "Failed to fetch data"
      ))
    } finally {
      setLoadingTypes((prev) => {
        const next = new Set(prev)
        next.delete(type)
        return next
      })
      setLoadingTargets((prev) => {
        const next = new Map(prev)
        next.delete(type)
        return next
      })
    }
  }, [indicators, indicatorTypes, loadingTypes, onResultsUpdate, providersByType, results])

  if (!activeIndicatorTypeFilter && !activeIndicator) {
    return (
      <div className={cn("h-full flex items-center justify-center p-6", className)}>
        <Alert className="max-w-sm">
          <Info className="h-4 w-4" />
          <AlertTitle>No selection</AlertTitle>
          <AlertDescription>Select an observable or observable type from the list to see lookup results</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex min-w-0 flex-col", className)}>
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto p-4">
          {activeIndicatorTypeFilter ? (
            <LookupResultsCategoryView
              results={results}
              indicatorTypes={indicatorTypes}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              activeIndicatorTypeFilter={activeIndicatorTypeFilter}
              providersByType={providersByType}
              getProviderForType={getProviderForType}
              isLoadingCategory={activeCategory ? loadingTypes.has(activeCategory) : false}
              loadingProviderId={activeCategory ? loadingTargets.get(activeCategory) ?? null : null}
              onLoadProvider={handleCategoryProviderLoad}
            />
          ) : detailType ? (
            <LookupTypeCard
              type={detailType}
              typeResults={resultsByType[detailType] ?? []}
              isLoading={loadingTypes.has(detailType)}
              loadingTarget={loadingTargets.get(detailType) ?? null}
              isFetched={fetchedKeys.has(`${detailType}:`) || (resultsByType[detailType]?.length ?? 0) > 0}
              error={typeErrors.get(detailType)}
              providersByType={providersByType ?? {}}
              selectedProviders={getProviderForType?.(detailType) ?? []}
              onLoad={(pid) => handleLookupType(detailType, false, pid)}
              onRetry={() => handleLookupType(detailType, true)}
              onExpand={() => setDetailType(detailType)}
              expanded
              onCollapse={() => setDetailType(null)}
              showLoadAll={false}
            />
          ) : isLoading && lookupTypes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lookupTypes.map(type => (
                <LookupTypeCard
                  key={type}
                  type={type}
                  typeResults={resultsByType[type] ?? []}
                  isLoading={loadingTypes.has(type)}
                  loadingTarget={loadingTargets.get(type) ?? null}
                  isFetched={fetchedKeys.has(`${type}:`) || (resultsByType[type]?.length ?? 0) > 0}
                  error={typeErrors.get(type)}
                  providersByType={providersByType ?? {}}
                  selectedProviders={getProviderForType?.(type) ?? []}
                  onLoad={(pid) => handleLookupType(type, false, pid)}
                  onRetry={() => handleLookupType(type, true)}
                  onExpand={() => setDetailType(type)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
