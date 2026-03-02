import { useMemo, useState } from "react"

import { useLocalStorage } from "@/shared/hooks"
import { ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"
import { isLookupApplicable, isProviderApplicable } from "@/shared/services/lookup.service"
import type { IndicatorType, LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"

import { getLookupErrorMessage } from "../displays/display-utils"

import type { CategoryEntry, CategoryProvider, CategoryTableRow } from "./types"

type UseCategoryResultsViewProps = {
  results: Array<{ indicator: string; results: LookupResult[] }>
  indicatorTypes?: Map<string, IndicatorType>
  activeIndicatorTypeFilter?: IndicatorType | null
  activeCategory?: LookupType | null
  providersByType?: Record<string, Provider[]>
  getProviderForType?: (type: LookupType) => string[]
}

export function useCategoryResultsView({
  results,
  indicatorTypes,
  activeIndicatorTypeFilter = null,
  activeCategory = null,
  providersByType,
  getProviderForType,
}: UseCategoryResultsViewProps) {
  const [categoryLayout, setCategoryLayout] = useLocalStorage<"grid" | "table">("ih.categoryLayout", "grid")
  const [selectedCategoryProviderIds, setSelectedCategoryProviderIds] = useState<Partial<Record<LookupType, string>>>({})

  const categoryEntries = useMemo(() => {
    const grouped = new Map<LookupType, CategoryEntry[]>()
    results.forEach((indicatorResult) => {
      const indicatorType = indicatorTypes?.get(indicatorResult.indicator)
      if (activeIndicatorTypeFilter && indicatorType !== activeIndicatorTypeFilter) return
      indicatorResult.results.forEach((result) => {
        const type = result._lookup_type
        if (!type) return
        const items = grouped.get(type) ?? []
        items.push({ indicator: indicatorResult.indicator, indicatorType, result })
        grouped.set(type, items)
      })
    })
    return grouped
  }, [results, indicatorTypes, activeIndicatorTypeFilter])

  const availableCategoryTypes = useMemo(() => {
    if (!activeIndicatorTypeFilter) return []
    return ALL_LOOKUP_TYPES.filter((type) => isLookupApplicable(type, activeIndicatorTypeFilter))
  }, [activeIndicatorTypeFilter])

  const resolvedCategory = useMemo(() => {
    if (activeCategory && availableCategoryTypes.includes(activeCategory)) return activeCategory
    return null
  }, [activeCategory, availableCategoryTypes])

  const categoryProviders = useMemo(() => {
    if (!resolvedCategory) return [] as CategoryProvider[]
    const providerMetadata = (providersByType?.[resolvedCategory] ?? []).filter((provider) =>
      isProviderApplicable(provider, activeIndicatorTypeFilter ?? undefined)
    )
    const selectedProviderIds = new Set(getProviderForType?.(resolvedCategory) ?? [])
    const resultProviderIds = new Set(
      (categoryEntries.get(resolvedCategory) ?? [])
        .map(({ result }) => result._provider)
        .filter((providerId): providerId is string => Boolean(providerId))
    )

    const providerIds: string[] = [
      ...providerMetadata.filter((provider) => provider.available).map((provider) => provider.id),
      ...Array.from(resultProviderIds).filter(
        (providerId) => !providerMetadata.some((provider) => provider.id === providerId)
      ),
    ]

    return providerIds.map((providerId): CategoryProvider => ({
      id: providerId,
      name: providerMetadata.find((provider) => provider.id === providerId)?.name ?? providerId,
      isSelected: selectedProviderIds.has(providerId),
    }))
  }, [activeIndicatorTypeFilter, categoryEntries, getProviderForType, providersByType, resolvedCategory])

  const activeCategoryProviderId = useMemo(() => {
    const selectedCategoryProviderId = resolvedCategory ? selectedCategoryProviderIds[resolvedCategory] ?? null : null

    if (selectedCategoryProviderId && categoryProviders.some((provider) => provider.id === selectedCategoryProviderId)) {
      return selectedCategoryProviderId
    }

    const providerWithResults = categoryProviders.find((provider) =>
      (categoryEntries.get(resolvedCategory ?? ("" as LookupType)) ?? []).some(
        (entry) => entry.result._provider === provider.id
      )
    )

    return providerWithResults?.id ?? null
  }, [categoryEntries, categoryProviders, resolvedCategory, selectedCategoryProviderIds])

  const activeCategoryEntries = useMemo(() => {
    if (!resolvedCategory) return []
    const entries = categoryEntries.get(resolvedCategory) ?? []
    if (!activeCategoryProviderId) return []
    return entries.filter(({ result }) => result._provider === activeCategoryProviderId)
  }, [activeCategoryProviderId, categoryEntries, resolvedCategory])

  const categoryTableColumns = useMemo(() => {
    const keys: string[] = []
    activeCategoryEntries.forEach(({ result }) => {
      Object.keys(result.essential ?? {}).forEach((key) => {
        if (!keys.includes(key)) keys.push(key)
      })
      Object.keys(result.additional ?? {}).forEach((key) => {
        if (!keys.includes(key)) keys.push(key)
      })
      if (getLookupErrorMessage(result.error) && !keys.includes("error")) {
        keys.push("error")
      }
    })
    return keys
  }, [activeCategoryEntries])

  const tableRows = useMemo<CategoryTableRow[]>(() => {
    return activeCategoryEntries.map(({ indicator, result }) => {
      const errorMessage = getLookupErrorMessage(result.error)
      return {
        observable: indicator,
        ...(result.essential ?? {}),
        ...(result.additional ?? {}),
        ...(errorMessage ? { error: errorMessage } : {}),
      }
    })
  }, [activeCategoryEntries])

  return {
    categoryLayout,
    setCategoryLayout,
    availableCategoryTypes,
    resolvedCategory,
    categoryProviders,
    activeCategoryProviderId,
    activeCategoryEntries,
    tableRows,
    tableColumnKeys: categoryTableColumns,
    setSelectedCategoryProviderId: (providerId: string) => {
      if (!resolvedCategory) return
      setSelectedCategoryProviderIds((prev) => ({
        ...prev,
        [resolvedCategory]: providerId,
      }))
    },
  }
}
