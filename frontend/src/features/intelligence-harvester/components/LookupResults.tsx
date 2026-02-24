import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useMemo, useState, useCallback, useEffect } from "react"
import { Info, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import type { IndicatorResult, LookupResult, IndicatorType, LookupType, Provider } from "@/shared/types/intelligence-harvester"
import { isLookupApplicable, executeIndicatorLookups } from "@/shared/services/lookup.service"
import { detectIndicatorType } from "@/shared/lib/indicator-utils"
import { ProviderLogo } from "@/shared/components/ProviderLogo"

// Import display components
import { WebsiteDetailsDisplay } from "./displays/WebsiteDetailsDisplay"
import { DnsDisplay } from "./displays/DnsDisplay"
import { WhoisDisplay } from "./displays/WhoisDisplay"
import { ReputationDisplay } from "./displays/ReputationDisplay"
import { ScreenshotDisplay } from "./displays/ScreenshotDisplay"
import { PassiveDnsDisplay } from "./displays/PassiveDnsDisplay"
import { WhoisHistoryDisplay } from "./displays/WhoisHistoryDisplay"
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

const LOOKUP_LABELS: Record<string, string> = {
  whois: "WHOIS",
  ip_info: "IP Info",
  reputation: "Reputation",
  dns: "DNS",
  passive_dns: "Passive DNS",
  whois_history: "WHOIS History",
  reverse_dns: "Reverse DNS",
  screenshot: "Screenshot",
  email_validator: "Email Validation",
  cve_details: "CVE Details",
  website_details: "Website Details",
}

// All possible lookup types in preferred display order
const ALL_LOOKUP_TYPES: LookupType[] = [
  "whois",
  "ip_info",
  "reputation",
  "dns",
  "passive_dns",
  "reverse_dns",
  "whois_history",
  "screenshot",
  "website_details",
  "email_validator",
  "cve_details",
]

// Router function to select the appropriate display component
function getDisplayComponent(lookupType: string, result: LookupResult, isOverview: boolean) {
  switch (lookupType) {
    case "website_details":
      return <WebsiteDetailsDisplay result={result} isOverview={isOverview} />
    case "dns":
      return <DnsDisplay result={result} isOverview={isOverview} />
    case "whois":
      return <WhoisDisplay result={result} isOverview={isOverview} />
    case "reputation":
      return <ReputationDisplay result={result} isOverview={isOverview} />
    case "screenshot":
      return <ScreenshotDisplay result={result} isOverview={isOverview} />
    case "passive_dns":
      return <PassiveDnsDisplay result={result} isOverview={isOverview} />
    case "whois_history":
      return <WhoisHistoryDisplay result={result} isOverview={isOverview} />
    default:
      return <DefaultDisplay result={result} isOverview={isOverview} />
  }
}

function normalizeProviderKey(value: string | undefined): string {
  if (!value) return ""
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function LookupResults({ results, activeIndicator, indicatorTypes, isLoading = false, className, token, getProviderForType, providersByType, onResultsUpdate }: LookupResultsProps) {
  const [loadingTypes, setLoadingTypes] = useState<Set<LookupType>>(new Set())
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [loadedTypes, setLoadedTypes] = useState<Set<string>>(new Set())
  const [errorTypes, setErrorTypes] = useState<Map<string, string>>(new Map())
  // Track active provider per lookup type (for types with multiple providers)
  const [activeProviderPerType, setActiveProviderPerType] = useState<Map<string, string>>(new Map())
  
  const filteredResults = activeIndicator
    ? results.filter((item) => item.indicator === activeIndicator)
    : results

  const activeResult = filteredResults[0]

  // Get the indicator type for the active indicator
  // Try from the indicatorTypes map first, fallback to client-side detection
  const activeIndicatorType = useMemo(() => {
    if (!activeIndicator) return undefined
    
    // First try to get from the backend-identified types
    if (indicatorTypes && indicatorTypes.has(activeIndicator)) {
      return indicatorTypes.get(activeIndicator)
    }
    
    // Fallback to client-side detection if backend identification is pending
    return detectIndicatorType(activeIndicator)
  }, [activeIndicator, indicatorTypes])

  // Group results by lookup type
  const resultsByType = useMemo(() => {
    if (!activeResult) return {}
    const grouped: Record<string, LookupResult[]> = {}
    activeResult.results.forEach((result) => {
      const type = result._lookup_type || "unknown"
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(result)
    })
    return grouped
  }, [activeResult])

  // Show ALL applicable tabs for this indicator type (not just ones with results)
  const lookupTypes = useMemo(() => {
    if (!activeIndicatorType) {
      // Fallback: show only types with actual results
      return Object.keys(resultsByType).filter(type => resultsByType[type].length > 0).sort() as LookupType[]
    }
    
    // Return all applicable lookup types for this indicator, ordered by preference
    return ALL_LOOKUP_TYPES.filter(type => isLookupApplicable(type, activeIndicatorType))
  }, [activeIndicatorType, resultsByType])

  // Filter types that have actual data (not just errors) for overview
  const typesWithData = lookupTypes.filter(type => {
    const results = resultsByType[type]
    if (!results || results.length === 0) {
      return false
    }
    
    const hasData = results.some(result => {
      if (result.error) {
        return false
      }
      // For screenshot type, check both essential and additional for image data
      if (type === "screenshot") {
        const allData = { ...result.essential, ...result.additional }
        return Object.keys(allData).length > 0
      }
      // For other types, only show types with essential data in overview
      const hasEssential = result.essential && Object.keys(result.essential).length > 0
      return hasEssential
    })
    
    return hasData
  })

  // Trigger lookup for a specific type
  const handleLookupType = useCallback(async (type: LookupType, isRetry = false, providerOverride?: string) => {
    if (!activeIndicator || !activeIndicatorType || !token || !getProviderForType || !providersByType) {
      console.warn('Missing required props for lookup')
      return
    }

    // Skip if already loading or loaded (unless it's a retry)
    const cacheKey = `${activeIndicator}:${type}:${providerOverride || "__all__"}`
    if (!isRetry && (loadingTypes.has(type) || loadedTypes.has(cacheKey))) {
      return
    }

    setLoadingTypes(prev => new Set(prev).add(type))
    // Clear previous error for this type
    setErrorTypes(prev => {
      const next = new Map(prev)
      next.delete(cacheKey)
      return next
    })

    try {
      const defaultProviderIds = (providersByType[type] || [])
        .filter((provider) => provider.available)
        .map((provider) => provider.id)

      const selectedProviderIds = providerOverride
        ? [providerOverride]
        : (() => {
            const selected = getProviderForType(type)
            return selected.length > 0 ? selected : defaultProviderIds
          })()

      const localGetProviderForType = (lookupType: LookupType): string[] => {
        if (lookupType === type) {
          return selectedProviderIds
        }
        return getProviderForType(lookupType)
      }

      const results = await executeIndicatorLookups({
        indicator: activeIndicator,
        indicatorType: activeIndicatorType,
        selectedTypes: new Set([type]),
        providers_by_type: providersByType,
        getProviderForType: localGetProviderForType,
        token,
      })

      // Update results if callback provided
      if (onResultsUpdate && results.length > 0) {
        onResultsUpdate(activeIndicator, results)
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} data:`, error)
      // Store error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
      setErrorTypes(prev => new Map(prev).set(cacheKey, errorMessage))
    } finally {
      // Always mark as loaded to prevent infinite retry
      setLoadedTypes(prev => new Set(prev).add(cacheKey))
      setLoadingTypes(prev => {
        const next = new Set(prev)
        next.delete(type)
        return next
      })
    }
  }, [activeIndicator, activeIndicatorType, token, getProviderForType, providersByType, onResultsUpdate, loadingTypes, loadedTypes])

  // Auto-load data when a tab without results is activated
  useEffect(() => {
    if (activeTab === "overview" || !activeIndicator || !activeIndicatorType) return
    
    const type = activeTab as LookupType
    const hasResults = resultsByType[type]?.length > 0
    const selectedProviderIds = getProviderForType ? getProviderForType(type) : []
    const availableProviderIds = (providersByType?.[type] || [])
      .filter((provider) => provider.available)
      .map((provider) => provider.id)
    const effectiveProviders = selectedProviderIds.length > 0 ? selectedProviderIds : availableProviderIds
    const firstProvider = effectiveProviders[0]
    const cacheKey = `${activeIndicator}:${type}:${firstProvider || "__all__"}`
    
    // Auto-load if no results and not already loading/loaded
    if (!hasResults && !loadingTypes.has(type) && !loadedTypes.has(cacheKey)) {
      handleLookupType(type, false, firstProvider)
    }
  }, [activeTab, activeIndicator, activeIndicatorType, resultsByType, loadingTypes, loadedTypes, handleLookupType, getProviderForType, providersByType])

  // Reset loaded cache when indicator changes
  useEffect(() => {
    setLoadedTypes(new Set())
    setErrorTypes(new Map())
    setActiveTab("overview")
  }, [activeIndicator])

  return (
    <Card className={cn("h-full flex flex-col min-w-0 rounded-br-lg rounded-bl-none rounded-t-none", className)}>
      <CardContent className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-4">
                  <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-32 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : !activeIndicator ? (
          <div className="p-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No indicator selected</AlertTitle>
              <AlertDescription>
                Select an indicator from the list to see available lookup types
              </AlertDescription>
            </Alert>
          </div>
        ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto px-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {lookupTypes.map((type) => {
                const hasResults = resultsByType[type]?.length > 0
              const isLoading = loadingTypes.has(type as LookupType)
              return (
                <TabsTrigger key={type} value={type}>
                  {isLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                  {LOOKUP_LABELS[type] || type}
                  {hasResults && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                      {resultsByType[type].length}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Overview Tab - Essential Fields Only */}
          <TabsContent value="overview" className="space-y-6 px-6 py-4">
            {typesWithData.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No lookup results yet</AlertTitle>
                <AlertDescription>
                  Click "Run Lookup" to fetch data for {activeIndicator}
                </AlertDescription>
              </Alert>
            ) : (
              typesWithData.map((type) => {
                const typeResults = resultsByType[type]
                
                return (
                  <div key={type} className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {LOOKUP_LABELS[type] || type}
                      </Badge>
                    </h3>
                    
                    {typeResults.map((result, idx) => {
                      // Skip results with errors
                      if (result.error) return null
                      
                      // For screenshot type, check both essential and additional
                      if (type === "screenshot") {
                        const allData = { ...result.essential, ...result.additional }
                        if (Object.keys(allData).length === 0) return null
                      } else {
                        // For other types, skip if no essential data
                        if (!result.essential || Object.keys(result.essential).length === 0) return null
                      }
                      
                      return (
                        <div key={idx}>
                          {result._provider && (
                            <div className="flex items-center gap-2 mb-2">
                              <ProviderLogo providerId={result._provider} providerName={result._provider} size="sm" />
                              <span className="text-xs text-muted-foreground">
                                {result._provider}
                              </span>
                            </div>
                          )}
                          {getDisplayComponent(type, result, true)}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </TabsContent>

          {/* Type-specific tabs */}
          {lookupTypes.map((type) => {
            const typeResults = resultsByType[type] || []
            const hasResults = typeResults.length > 0
            const isLoadingType = loadingTypes.has(type as LookupType)
            const cacheKey = `${activeIndicator}:${type}`
            const errorMessage = errorTypes.get(cacheKey)

            const providerOptions = (providersByType?.[type] || []).filter((provider) => provider.available)
            const providerNameById = new Map(providerOptions.map((provider) => [provider.id, provider.name]))

            const resolveResultForProvider = (providerId: string) => {
              const idKey = normalizeProviderKey(providerId)
              const providerName = providerNameById.get(providerId)
              const nameKey = normalizeProviderKey(providerName)
              return typeResults.find((result) => {
                const resultKey = normalizeProviderKey(result._provider)
                return resultKey === idKey || (nameKey !== "" && resultKey === nameKey)
              })
            }

            const selectedProviderIds = getProviderForType ? getProviderForType(type as LookupType) : []
            const configuredProviderIds = providerOptions.map((provider) => provider.id)

            const uniqueProviderIds = Array.from(new Set([
              ...configuredProviderIds,
              ...selectedProviderIds,
              ...typeResults.map((result) => result._provider).filter(Boolean) as string[],
            ]))

            const providerTabs = uniqueProviderIds.map((providerId, index) => {
              const providerResult = resolveResultForProvider(providerId)
              return {
                value: `${index}:${providerId}`,
                providerId,
                label: providerNameById.get(providerId) || providerId,
                result: providerResult,
              }
            })

            if (providerTabs.length === 0 && hasResults) {
              typeResults.forEach((result, index) => {
                const providerLabel = result._provider || `Result ${index + 1}`
                providerTabs.push({
                  value: `${index}:${providerLabel}`,
                  providerId: providerLabel,
                  label: providerLabel,
                  result,
                })
              })
            }

            const storedProvider = activeProviderPerType.get(type)
            const activeProvider =
              storedProvider && providerTabs.some((tab) => tab.value === storedProvider)
                ? storedProvider
                : providerTabs[0]?.value
            
            return (
              <TabsContent key={type} value={type} className="space-y-4">
                {isLoadingType ? (
                  <div className="flex items-center justify-center py-8 px-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading {LOOKUP_LABELS[type] || type} data...</span>
                  </div>
                ) : errorMessage ? (
                  <div className="px-6">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error loading data</AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p>{errorMessage}</p>
                        <Button 
                          onClick={() => handleLookupType(type as LookupType, true)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : providerTabs.length === 0 ? (
                  <div className="px-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>No providers configured</AlertTitle>
                      <AlertDescription>
                        No providers are selected for this lookup type.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <Tabs 
                    value={activeProvider} 
                    onValueChange={(value) => {
                      const providerId = value.includes(":") ? value.split(":").slice(1).join(":") : value
                      setActiveProviderPerType(prev => new Map(prev).set(type, value))

                      const providerHasResult = !!resolveResultForProvider(providerId)
                      const providerCacheKey = `${activeIndicator}:${type}:${providerId}`

                      if (!providerHasResult && !loadingTypes.has(type as LookupType) && !loadedTypes.has(providerCacheKey)) {
                        handleLookupType(type as LookupType, false, providerId)
                      }
                    }}
                    className="w-full"
                  >
                    <TabsList className="w-full justify-start flex-wrap h-auto px-6">
                      {providerTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                          <ProviderLogo providerId={tab.providerId} providerName={tab.label} size="sm" />
                          <span>{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {providerTabs.map((tab) => {
                      return (
                        <TabsContent key={tab.value} value={tab.value} className="mt-4">
                          {tab.result ? (
                            getDisplayComponent(type, tab.result, false)
                          ) : (
                            <div className="px-6">
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>No data available</AlertTitle>
                                <AlertDescription>
                                  No results were returned for {tab.label}.
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
        </>
      )}
      </CardContent>
    </Card>
  )
}

export default LookupResults

