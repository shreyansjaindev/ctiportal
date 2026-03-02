import { Loader2 } from "lucide-react"

import { Card, CardContent } from "@/shared/components/ui/card"
import type { IndicatorType, LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"

import { CategoryResultsGrid } from "./CategoryResultsGrid"
import { CategoryResultsTable } from "./CategoryResultsTable"
import { CategoryResultsToolbar } from "./CategoryResultsToolbar"
import { useCategoryResultsView } from "./useCategoryResultsView"

interface LookupResultsCategoryViewProps {
  results: Array<{ indicator: string; results: LookupResult[] }>
  indicatorTypes?: Map<string, IndicatorType>
  activeIndicatorTypeFilter?: IndicatorType | null
  activeCategory?: LookupType | null
  onCategoryChange?: (type: LookupType) => void
  providersByType?: Record<string, Provider[]>
  getProviderForType?: (type: LookupType) => string[]
  isLoadingCategory?: boolean
  onLoadProvider?: (type: LookupType, providerId: string) => void
  onForceRefreshEntry?: (indicator: string, type: LookupType, providerId: string) => void
  isEntryRefreshing?: (indicator: string, type: LookupType, providerId: string) => boolean
}

export function LookupResultsCategoryView({
  results,
  indicatorTypes,
  activeIndicatorTypeFilter = null,
  activeCategory = null,
  onCategoryChange,
  providersByType,
  getProviderForType,
  isLoadingCategory = false,
  onLoadProvider,
  onForceRefreshEntry,
  isEntryRefreshing,
}: LookupResultsCategoryViewProps) {
  const {
    categoryLayout,
    setCategoryLayout,
    availableCategoryTypes,
    resolvedCategory,
    categoryProviders,
    activeCategoryProviderId,
    activeCategoryEntries,
    tableRows,
    tableColumnKeys,
    setSelectedCategoryProviderId,
  } = useCategoryResultsView({
    results,
    indicatorTypes,
    activeIndicatorTypeFilter,
    activeCategory,
    providersByType,
    getProviderForType,
  })

  return (
    <div className="space-y-4">
      <CategoryResultsToolbar
        availableCategoryTypes={availableCategoryTypes}
        resolvedCategory={resolvedCategory}
        onCategoryChange={onCategoryChange}
        categoryLayout={categoryLayout}
        onCategoryLayoutChange={setCategoryLayout}
        categoryProviders={categoryProviders}
        activeCategoryProviderId={activeCategoryProviderId}
        onProviderChange={(value) => {
          setSelectedCategoryProviderId(value)
          if (resolvedCategory && onLoadProvider) {
            onLoadProvider(resolvedCategory, value)
          }
        }}
      />

      {!resolvedCategory ? (
        <Card className="shadow-none">
          <CardContent className="flex min-h-[14rem] items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            Select a category to view available providers and results.
          </CardContent>
        </Card>
      ) : categoryProviders.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex min-h-[14rem] items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            No available providers for this category.
          </CardContent>
        </Card>
      ) : activeCategoryEntries.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex min-h-[14rem] items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            {isLoadingCategory ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : activeCategoryProviderId ? (
              "No results loaded for this provider yet. Select a provider tab to fetch data."
            ) : (
              "Select a provider tab to fetch data."
            )}
          </CardContent>
        </Card>
      ) : categoryLayout === "grid" ? (
        <CategoryResultsGrid
          resolvedCategory={resolvedCategory}
          activeCategoryEntries={activeCategoryEntries}
          onForceRefreshEntry={(indicator, providerId) => onForceRefreshEntry?.(indicator, resolvedCategory, providerId)}
          isEntryRefreshing={(indicator, providerId) =>
            isEntryRefreshing?.(indicator, resolvedCategory, providerId) ?? false
          }
        />
      ) : (
        <CategoryResultsTable
          key={`${resolvedCategory}-${activeCategoryProviderId ?? "none"}`}
          tableRows={tableRows}
          tableColumnKeys={tableColumnKeys}
        />
      )}
    </div>
  )
}
