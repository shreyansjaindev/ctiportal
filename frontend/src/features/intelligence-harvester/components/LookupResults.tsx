import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { cn } from "@/shared/lib/utils"
import { useMemo, useState, useCallback } from "react"
import { Info, Loader2, AlertCircle, RefreshCw, Maximize2, ArrowLeft } from "lucide-react"
import type { IndicatorResult, LookupResult, IndicatorType, LookupType, Provider } from "@/shared/types/intelligence-harvester"
import { isLookupApplicable, executeIndicatorLookups } from "@/shared/services/lookup.service"
import { detectIndicatorType } from "@/shared/lib/indicator-utils"
import { ProviderLogo } from "@/shared/components/ProviderLogo"
import { LOOKUP_LABELS, ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"

import { WebsiteStatusDisplay } from "./displays/WebsiteStatusDisplay"
import { WebScanDisplay } from "./displays/WebScanDisplay"
import { DnsDisplay } from "./displays/DnsDisplay"
import { WhoisDisplay } from "./displays/WhoisDisplay"
import { ReputationDisplay } from "./displays/ReputationDisplay"
import { ScreenshotDisplay } from "./displays/ScreenshotDisplay"
import { PassiveDnsDisplay } from "./displays/PassiveDnsDisplay"
import { WhoisHistoryDisplay } from "./displays/WhoisHistoryDisplay"
import { SubdomainsDisplay } from "./displays/SubdomainsDisplay"
import { DefaultDisplay } from "./displays/DefaultDisplay"

interface LookupResultsProps {
  results: IndicatorResult[]
  activeIndicator: string | null
  indicatorTypes?: Map<string, IndicatorType>
  isLoading?: boolean
  className?: string
  token?: string
  getProviderForType?: (type: LookupType) => string[]
  providersByType?: Record<string, Provider[]>
  onResultsUpdate?: (indicator: string, newResults: LookupResult[]) => void
}

function getDisplayComponent(type: string, result: LookupResult, isOverview: boolean) {
  switch (type) {
    case "website_status": return <WebsiteStatusDisplay result={result} isOverview={isOverview} />
    case "web_scan":       return <WebScanDisplay result={result} isOverview={isOverview} />
    case "dns":            return <DnsDisplay result={result} isOverview={isOverview} />
    case "whois":          return <WhoisDisplay result={result} isOverview={isOverview} />
    case "reputation":     return <ReputationDisplay result={result} isOverview={isOverview} />
    case "screenshot":     return <ScreenshotDisplay result={result} isOverview={isOverview} />
    case "passive_dns":    return <PassiveDnsDisplay result={result} isOverview={isOverview} />
    case "subdomains":     return <SubdomainsDisplay result={result} isOverview={isOverview} />
    case "whois_history":  return <WhoisHistoryDisplay result={result} isOverview={isOverview} />
    default:               return <DefaultDisplay result={result} isOverview={isOverview} />
  }
}

// One card per lookup type in the grid. Handles all per-type states:
//   idle -> loading -> (data | error | empty)
// Compact display only; expand button opens the full-area card.
interface LookupTypeCardProps {
  type: LookupType
  typeResults: LookupResult[]
  isLoading: boolean
  isFetched: boolean
  error: string | undefined
  providersByType: Record<string, Provider[]>
  selectedProviders?: string[]
  onLoad: (providerId?: string) => void
  onRetry: () => void
  onExpand: () => void
  showLoadAll?: boolean
  expanded?: boolean
  onCollapse?: () => void
}

function LookupTypeCard({
  type, typeResults, isLoading, isFetched, error,
  providersByType, selectedProviders = [], onLoad, onRetry, onExpand, showLoadAll = true,
  expanded = false, onCollapse,
}: LookupTypeCardProps) {
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)

  const availableProviders = (providersByType[type] || []).filter(p => p.available)

  const dataResults = typeResults.filter(r => !r.error && Object.keys(r.essential ?? {}).length > 0)
  const hasData = dataResults.length > 0
  const label = LOOKUP_LABELS[type] || type

  const returnedProviderIds = new Set(typeResults.map(r => r._provider).filter(Boolean))

  const resolvedProviderId = activeProviderId
    ?? (dataResults[0]?._provider ?? null)

  const activeResult = resolvedProviderId
    ? typeResults.find(r => r._provider === resolvedProviderId) ?? null
    : null
  const activeResultHasData = activeResult
    ? !activeResult.error && Object.keys(activeResult.essential ?? {}).length > 0
    : false
  const activeProviderReturned = resolvedProviderId
    ? returnedProviderIds.has(resolvedProviderId)
    : false
  const activeTabValue = resolvedProviderId ?? "__none__"

  const isIdleState = !isFetched && !isLoading
  const borderClass = error && !hasData
    ? "border-destructive/40"
    : isIdleState
      ? "border-dashed"
      : "border"

  return (
    <Card className={cn(
      "w-full min-w-0 gap-0 shadow-none",
      expanded
        ? "h-full min-h-0 bg-background py-4"
        : isIdleState
          ? "min-h-[11rem] bg-muted/20 py-6"
          : "py-4",
      borderClass
    )}>
      <CardHeader className={cn("px-4", isIdleState && !expanded && "pb-4", (!isIdleState || expanded) && "pb-2")}>
        <div className="flex flex-col gap-0.5">
          <CardTitle className={cn("leading-tight", isIdleState ? "text-base" : "text-sm")}>{label}</CardTitle>
          {isIdleState ? (
            <CardDescription>
              {availableProviders.length > 0 ? "Choose a provider to fetch" : "Click to load"}
            </CardDescription>
          ) : null}
          {isLoading && !hasData && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching data...
            </span>
          )}
          {error && !hasData && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span className="line-clamp-1">{error}</span>
            </span>
          )}
        </div>
        <CardAction className="flex shrink-0 items-center gap-1">
          {expanded ? (
            <Button variant="ghost" size="sm" className="gap-2" onClick={onCollapse}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : isFetched && (
            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-0.5" onClick={onExpand} title="View full details">
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
          {showLoadAll && isIdleState && !expanded && selectedProviders.length > 0 && (
            <button
              onClick={() => onLoad()}
              className="group flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Load selected
              <ArrowLeft className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </CardAction>
      </CardHeader>

      {availableProviders.length > 0 ? (
        isIdleState ? (
          <CardContent className="flex flex-wrap gap-2 px-4">
            {availableProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveProviderId(p.id); if (!returnedProviderIds.has(p.id) && !isLoading) onLoad(p.id) }}
                className="active:scale-95 flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:shadow-sm"
              >
                <ProviderLogo providerId={p.id} providerName={p.name} size="md" />
                <span>{p.name}</span>
              </button>
            ))}
          </CardContent>
        ) : (
          <Tabs
            value={activeTabValue}
            onValueChange={(value) => {
              if (value === "__none__") return
              setActiveProviderId(value)
              if (!returnedProviderIds.has(value) && !isLoading) onLoad(value)
            }}
            className="gap-0 border-b"
          >
            <TabsList variant="line" className={cn("w-full justify-start flex-wrap px-4 rounded-none", expanded ? "h-auto" : "h-10")}>
              {availableProviders.map((p) => {
                const wasReturned = returnedProviderIds.has(p.id)
                const hasError = wasReturned && typeResults.find(r => r._provider === p.id)?.error

                return (
                  <TabsTrigger
                    key={p.id}
                    value={p.id}
                    title={p.name}
                    className={cn(
                      "group h-full px-2 gap-1.5 text-xs data-[state=active]:shadow-none",
                      isLoading && !wasReturned && "opacity-30"
                    )}
                  >
                    <ProviderLogo
                      providerId={p.id}
                      providerName={p.name}
                      size={expanded ? "sm" : "md"}
                      className={cn(!expanded && "h-5 w-5")}
                    />
                    <span
                      className={cn(
                        "truncate",
                        expanded
                          ? ""
                          : "max-w-0 overflow-hidden opacity-0 transition-all duration-150 group-hover:max-w-24 group-hover:opacity-100"
                      )}
                    >
                      {p.name}
                    </span>
                    {hasError && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {availableProviders.map((p) => (
              <TabsContent key={p.id} value={p.id} className="m-0" />
            ))}
          </Tabs>
        )
      ) : isIdleState ? (
        <button
          onClick={() => onLoad()}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Fetch data</span>
          <ArrowLeft className="h-3 w-3 rotate-180" />
        </button>
      ) : null}

      {error && !hasData && (
        <Button variant="outline" size="sm" className="mt-3 h-6 self-start gap-1.5 text-xs" onClick={onRetry}>
          <RefreshCw className="h-2.5 w-2.5" /> Retry
        </Button>
      )}

      {resolvedProviderId && activeProviderReturned && (
        <CardContent className={cn("px-4", !isIdleState && "pt-4", expanded && "min-h-0 flex-1 overflow-y-auto")}>
          {activeResult?.error
            ? (
              <div className={cn("flex items-start gap-1.5 text-xs text-destructive", expanded && "px-1")}>
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="break-words">{activeResult.error}</span>
              </div>
            )
            : activeResultHasData && activeResult
              ? getDisplayComponent(type, activeResult, !expanded)
              : (
                <p className="text-xs text-muted-foreground">
                  No data returned for {availableProviders.find(p => p.id === resolvedProviderId)?.name ?? resolvedProviderId}
                </p>
              )}
        </CardContent>
      )}
    </Card>
  )
}

export function LookupResults({
  results, activeIndicator, indicatorTypes,
  isLoading = false, className, token,
  getProviderForType, providersByType, onResultsUpdate,
}: LookupResultsProps) {
  const [loadingTypes, setLoadingTypes] = useState<Set<LookupType>>(new Set())
  const [fetchedKeys, setFetchedKeys] = useState<Set<string>>(new Set())
  const [typeErrors, setTypeErrors] = useState<Map<LookupType, string>>(new Map())
  const [detailType, setDetailType] = useState<LookupType | null>(null)

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

  const handleLookupType = useCallback(async (
    type: LookupType,
    isRetry = false,
    providerOverride?: string,
  ) => {
    if (!activeIndicator || !activeIndicatorType || !token || !getProviderForType || !providersByType) return

    const providerLookup = getProviderForType
    const providerMap = providersByType

    const cacheKey = `${type}:${providerOverride ?? ""}`
    if (!isRetry && (loadingTypes.has(type) || fetchedKeys.has(cacheKey))) return

    setLoadingTypes(prev => new Set(prev).add(type))
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
        token,
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
    }
  }, [activeIndicator, activeIndicatorType, token, getProviderForType, providersByType, onResultsUpdate, loadingTypes, fetchedKeys])

  if (!activeIndicator) {
    return (
      <div className={cn("h-full flex items-center justify-center p-6", className)}>
        <Alert className="max-w-sm">
          <Info className="h-4 w-4" />
          <AlertTitle>No observable selected</AlertTitle>
          <AlertDescription>Select an observable from the list to see lookup results</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex min-w-0 flex-col", className)}>
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto p-4">
          {detailType ? (
            <LookupTypeCard
              type={detailType}
              typeResults={resultsByType[detailType] ?? []}
              isLoading={loadingTypes.has(detailType)}
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
