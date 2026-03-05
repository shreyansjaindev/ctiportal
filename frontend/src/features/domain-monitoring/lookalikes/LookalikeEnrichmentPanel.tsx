import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import * as aggregators from "@/shared/lib/aggregators"
import { isProviderApplicable } from "@/shared/services/lookup.service"
import type { LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"
import { LookupTypeCard } from "@/features/intelligence-harvester/components/results/LookupTypeCard"

const AUTO_ENRICH_TYPES: LookupType[] = ["whois", "dns", "reputation", "subdomains", "web_redirects"]

type ResultsByType = Partial<Record<LookupType, Record<string, LookupResult>>>
type SelectedProvidersByType = Partial<Record<LookupType, string[]>>
type LoadingByType = Partial<Record<LookupType, string | null>>
type ErrorsByType = Partial<Record<LookupType, string>>

interface LookalikeEnrichmentPanelProps {
  domain: string
}

export function LookalikeEnrichmentPanel({ domain }: LookalikeEnrichmentPanelProps) {
  const [detailType, setDetailType] = useState<LookupType | null>(null)
  const [selectedProvidersByType, setSelectedProvidersByType] = useState<SelectedProvidersByType>({})
  const [resultsByType, setResultsByType] = useState<ResultsByType>({})
  const [loadingByType, setLoadingByType] = useState<LoadingByType>({})
  const [errorsByType, setErrorsByType] = useState<ErrorsByType>({})

  const providersQuery = useQuery({
    queryKey: ["lookalike-enrichment-providers"],
    queryFn: aggregators.getAllProviders,
    staleTime: 5 * 60 * 1000,
  })

  const providersByType = useMemo<Record<string, Provider[]>>(() => {
    const source = providersQuery.data?.providers_by_type ?? {}
    return Object.fromEntries(
      AUTO_ENRICH_TYPES.map((type) => [
        type,
        (source[type] ?? []).filter(
          (provider) => provider.available && isProviderApplicable(provider, "domain")
        ),
      ])
    )
  }, [providersQuery.data?.providers_by_type])

  const availableTypes = useMemo(
    () => AUTO_ENRICH_TYPES.filter((type) => (providersByType[type] ?? []).length > 0),
    [providersByType]
  )

  useEffect(() => {
    availableTypes.forEach((type) => {
      const defaultProviderId = selectedProvidersByType[type]?.[0] ?? providersByType[type]?.[0]?.id
      if (!defaultProviderId) return
      if (resultsByType[type]?.[defaultProviderId]) return
      if (loadingByType[type]) return
      void loadType(type, defaultProviderId)
    })
  }, [availableTypes, loadingByType, providersByType, resultsByType, selectedProvidersByType])

  async function loadType(type: LookupType, providerOverride?: string, forceRefresh = false) {
    const providerId = providerOverride ?? selectedProvidersByType[type]?.[0] ?? providersByType[type]?.[0]?.id
    if (!providerId) return

    setSelectedProvidersByType((prev) => ({ ...prev, [type]: [providerId] }))

    if (!forceRefresh && resultsByType[type]?.[providerId]) {
      return
    }

    setLoadingByType((prev) => ({ ...prev, [type]: providerId }))
    setErrorsByType((prev) => {
      const next = { ...prev }
      delete next[type]
      return next
    })

    try {
      const response = await aggregators.performIndicatorLookups([domain], { [type]: [providerId] })
      const result = response.results[0]?.results?.find(
        (entry) => entry._lookup_type === type && entry._provider === providerId
      )

      if (!result) {
        setErrorsByType((prev) => ({ ...prev, [type]: "No data returned for this provider." }))
        return
      }

      setResultsByType((prev) => ({
        ...prev,
        [type]: {
          ...(prev[type] ?? {}),
          [providerId]: result as LookupResult,
        },
      }))
    } catch (error) {
      setErrorsByType((prev) => ({
        ...prev,
        [type]: error instanceof Error ? error.message : "Failed to fetch data",
      }))
    } finally {
      setLoadingByType((prev) => ({ ...prev, [type]: null }))
    }
  }

  if (providersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading providers...</p>
  }

  if (providersQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Unable to load enrichment providers right now.</AlertDescription>
      </Alert>
    )
  }

  if (availableTypes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No applicable providers are available for automatic enrichment.
      </p>
    )
  }

  const visibleTypes = detailType ? [detailType] : availableTypes

  return (
    <div
      className={
        detailType
          ? "w-full"
          : "grid grid-cols-1 items-start gap-4 xl:grid-cols-2 2xl:grid-cols-3"
      }
    >
      {visibleTypes.map((type) => (
        <LookupTypeCard
          key={type}
          type={type}
          indicatorType="domain"
          typeResults={Object.values(resultsByType[type] ?? {})}
          isLoading={!!loadingByType[type]}
          loadingTarget={loadingByType[type] ?? null}
          isFetched={Object.keys(resultsByType[type] ?? {}).length > 0}
          error={errorsByType[type]}
          providersByType={providersByType}
          selectedProviders={selectedProvidersByType[type] ?? []}
          onLoad={(providerId) => {
            void loadType(type, providerId)
          }}
          onForceRefresh={(providerId) => {
            void loadType(type, providerId, true)
          }}
          onRetry={() => {
            void loadType(type, selectedProvidersByType[type]?.[0], true)
          }}
          onExpand={() => setDetailType(type)}
          expanded={detailType === type}
          onCollapse={() => setDetailType(null)}
        />
      ))}
    </div>
  )
}
