import { useEffect, useMemo, useState } from "react"
import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { ProviderLogo } from "@/shared/components/ProviderLogo"
import { ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"
import { isLookupApplicable } from "@/shared/services/lookup.service"
import { cn } from "@/shared/lib/utils"
import type { IndicatorType, LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"
import { DataTable } from "@/shared/components/data-table"
import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"
import type { DataTableFilterField } from "@/shared/components/data-table/types"
import { Input } from "@/shared/components/ui/input"
import { LayoutGrid, Loader2, Rows3 } from "lucide-react"

import { renderLookupDisplay } from "./LookupResultDisplay"

type CategoryEntry = {
  indicator: string
  indicatorType?: IndicatorType
  result: LookupResult
}

type CategoryProvider = {
  id: string
  name: string
  isSelected: boolean
}

type CategoryTableRow = Record<string, unknown> & {
  observable: string
}

interface LookupResultsCategoryViewProps {
  results: Array<{ indicator: string; results: LookupResult[] }>
  indicatorTypes?: Map<string, IndicatorType>
  activeIndicatorTypeFilter?: IndicatorType | null
  activeCategory?: LookupType | null
  onCategoryChange?: (type: LookupType) => void
  providersByType?: Record<string, Provider[]>
  getProviderForType?: (type: LookupType) => string[]
  isLoadingCategory?: boolean
  loadingProviderId?: string | null
  onLoadProvider?: (type: LookupType, providerId: string) => void
}

function toColumnLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function summarizeStructuredValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map(summarizeStructuredValue).filter(Boolean).join(", ")
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const preferredKeys = ["domain", "url", "hostname", "host", "title", "name", "value", "ip", "id"]
    for (const key of preferredKeys) {
      const candidate = record[key]
      if (candidate !== null && candidate !== undefined && candidate !== "") {
        return summarizeStructuredValue(candidate)
      }
    }
    return Object.entries(record)
      .filter(([, candidate]) => candidate !== null && candidate !== undefined && candidate !== "")
      .slice(0, 3)
      .map(([key, candidate]) => `${toColumnLabel(key)}: ${summarizeStructuredValue(candidate)}`)
      .join(" | ")
  }
  return ""
}

function toCategoryTableCell(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>
  }

  if (typeof value === "string") {
    if (
      (key.toLowerCase().includes("image") || key.toLowerCase().includes("screenshot")) &&
      (value.startsWith("data:image/") || value.length > 100)
    ) {
      const src = value.startsWith("data:image/") ? value : `data:image/png;base64,${value}`
      return <img src={src} alt={key} className="h-16 w-28 rounded border object-cover" />
    }
    return <span className="block max-w-[28rem] truncate whitespace-nowrap" title={value}>{value}</span>
  }

  if (typeof value === "number" || typeof value === "boolean") return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">-</span>
    const text = value.map((item) => summarizeStructuredValue(item)).filter(Boolean).join(", ")
    return text
      ? <span className="block max-w-[28rem] truncate whitespace-nowrap" title={text}>{text}</span>
      : <span className="text-muted-foreground">{value.length} item{value.length === 1 ? "" : "s"}</span>
  }

  if (typeof value === "object") {
    const summarized = summarizeStructuredValue(value)
    const text = summarized || JSON.stringify(value)
    return <span className="block max-w-[28rem] truncate whitespace-nowrap" title={text}>{text}</span>
  }

  return String(value)
}

function getLookupErrorMessage(result: LookupResult | null | undefined): string | null {
  const rawError = result?.error

  if (typeof rawError === "string" && rawError.trim()) {
    return rawError
  }

  if (typeof rawError === "number" || typeof rawError === "boolean") {
    return String(rawError)
  }

  if (Array.isArray(rawError)) {
    const joined = rawError
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter(Boolean)
      .join(" ")
      .trim()
    return joined || "Lookup failed"
  }

  if (rawError && typeof rawError === "object") {
    const details = rawError as Record<string, unknown>
    if (typeof details.error === "string" && details.error.trim()) return details.error
    if (typeof details.detail === "string" && details.detail.trim()) return details.detail
    return JSON.stringify(details)
  }

  return null
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
  loadingProviderId = null,
  onLoadProvider,
}: LookupResultsCategoryViewProps) {
  const [categoryLayout, setCategoryLayout] = useState<"grid" | "table">(() => {
    if (typeof window === "undefined") return "grid"
    const stored = window.localStorage.getItem("ih.categoryLayout")
    return stored === "table" ? "table" : "grid"
  })
  const [categoryProviderId, setCategoryProviderId] = useState<string | null>(null)
  const [providerTouched, setProviderTouched] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

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
    const providerMetadata = providersByType?.[resolvedCategory] ?? []
    const selectedProviderIds = new Set(getProviderForType?.(resolvedCategory) ?? [])
    const resultProviderIds = new Set(
      (categoryEntries.get(resolvedCategory) ?? [])
        .map(({ result }) => result._provider)
        .filter((providerId): providerId is string => Boolean(providerId))
    )

    const providerIds: string[] = [
      ...providerMetadata.filter((provider) => provider.available).map((provider) => provider.id),
      ...Array.from(resultProviderIds).filter((providerId) => !providerMetadata.some((provider) => provider.id === providerId)),
    ]

    return providerIds.map((providerId): CategoryProvider => ({
      id: providerId,
      name: providerMetadata.find((provider) => provider.id === providerId)?.name ?? providerId,
      isSelected: selectedProviderIds.has(providerId),
    }))
  }, [categoryEntries, getProviderForType, providersByType, resolvedCategory])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("ih.categoryLayout", categoryLayout)
  }, [categoryLayout])

  useEffect(() => {
    setSorting([])
    setColumnFilters([])
  }, [resolvedCategory, categoryProviderId])

  useEffect(() => {
    setProviderTouched(false)
  }, [resolvedCategory])

  const activeCategoryEntries = useMemo(() => {
    if (!resolvedCategory) return []
    const entries = categoryEntries.get(resolvedCategory) ?? []
    if (!categoryProviderId) return []
    return entries.filter(({ result }) => result._provider === categoryProviderId)
  }, [categoryEntries, categoryProviderId, resolvedCategory])

  useEffect(() => {
    if (categoryProviderId && categoryProviders.some((provider) => provider.id === categoryProviderId)) {
      const hasVisibleResults = activeCategoryEntries.some((entry) => entry.result._provider === categoryProviderId)
      if (hasVisibleResults || providerTouched) return
    }

    const providerWithResults = categoryProviders.find((provider) =>
      (categoryEntries.get(resolvedCategory ?? "" as LookupType) ?? []).some(
        (entry) => entry.result._provider === provider.id
      )
    )

    setCategoryProviderId(providerWithResults?.id ?? null)
  }, [categoryEntries, resolvedCategory, activeCategoryEntries, categoryProviderId, categoryProviders, providerTouched])

  const categoryTableColumns = useMemo(() => {
    const keys: string[] = []
    activeCategoryEntries.forEach(({ result }) => {
      Object.keys(result.essential ?? {}).forEach((key) => {
        if (!keys.includes(key)) keys.push(key)
      })
      Object.keys(result.additional ?? {}).forEach((key) => {
        if (!keys.includes(key)) keys.push(key)
      })

      if (getLookupErrorMessage(result) && !keys.includes("error")) {
        keys.push("error")
      }
    })
    return keys
  }, [activeCategoryEntries])

  const tableRows = useMemo<CategoryTableRow[]>(() => {
    return activeCategoryEntries.map(({ indicator, result }) => {
      const errorMessage = getLookupErrorMessage(result)
      return {
        observable: indicator,
        ...(result.essential ?? {}),
        ...(result.additional ?? {}),
        ...(errorMessage ? { error: errorMessage } : {}),
      }
    })
  }, [activeCategoryEntries])

  const tableColumns = useMemo<ColumnDef<CategoryTableRow>[]>(() => {
    const observableColumn: ColumnDef<CategoryTableRow> = {
      accessorKey: "observable",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Observable" className="whitespace-nowrap" />,
      cell: ({ row }) => (
        <div className="min-w-[12rem] max-w-[16rem] truncate font-medium whitespace-nowrap" title={String(row.original.observable)}>
          {String(row.original.observable)}
        </div>
      ),
    }

    const dynamicColumns = categoryTableColumns.map<ColumnDef<CategoryTableRow>>((columnKey) => ({
      accessorKey: columnKey,
      header: ({ column }) => <DataTableColumnHeader column={column} title={toColumnLabel(columnKey)} className="whitespace-nowrap" />,
      cell: ({ row }) => toCategoryTableCell(columnKey, row.original[columnKey]),
    }))

    return [observableColumn, ...dynamicColumns]
  }, [categoryTableColumns])

  const filterFields = useMemo<DataTableFilterField<CategoryTableRow>[]>(() => {
    const fields: DataTableFilterField<CategoryTableRow>[] = []

    const candidateKeys = ["observable", ...categoryTableColumns]
    candidateKeys.forEach((key) => {
      if (
        key === "error" ||
        key.toLowerCase().includes("description") ||
        key.toLowerCase().includes("vector") ||
        key.toLowerCase().includes("image") ||
        key.toLowerCase().includes("screenshot")
      ) {
        return
      }

      const uniqueValues = Array.from(
        new Set(
          tableRows
            .map((row) => row[key])
            .filter((value) => value !== null && value !== undefined && value !== "")
            .map((value) => {
              if (typeof value === "number" || typeof value === "boolean") {
                return String(value)
              }

              if (typeof value === "string") {
                const trimmed = value.trim()
                if (!trimmed || trimmed.length > 80) return null
                return trimmed
              }

              return null
            })
            .filter((value): value is string => Boolean(value))
        )
      ).sort()

      if (uniqueValues.length === 0 || uniqueValues.length > 15) return

      fields.push({
        label: toColumnLabel(key),
        value: key as keyof CategoryTableRow,
        type: "checkbox",
        options: uniqueValues.map((value) => ({ label: value, value })),
      })
    })

    return fields
  }, [categoryTableColumns, tableRows])

  const observableFilterValue = useMemo(() => {
    const filter = columnFilters.find((item) => item.id === "observable")
    return typeof filter?.value === "string" ? filter.value : ""
  }, [columnFilters])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {availableCategoryTypes.length > 0 ? (
            <Tabs
              value={resolvedCategory ?? "__none__"}
              onValueChange={(value) => {
                if (value === "__none__") return
                onCategoryChange?.(value as LookupType)
              }}
              className="gap-0"
            >
              <TabsList variant="line" className="h-auto max-w-full justify-start flex-wrap rounded-none px-0">
                {availableCategoryTypes.map((type) => (
                  <TabsTrigger key={type} value={type} className="flex-none px-3 text-xs data-[state=active]:shadow-none">
                    {type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </TabsTrigger>
                ))}
              </TabsList>
              {availableCategoryTypes.map((type) => (
                <TabsContent key={type} value={type} className="m-0" />
              ))}
              <TabsContent value="__none__" className="m-0" />
            </Tabs>
          ) : null}

          {resolvedCategory && categoryProviders.length > 0 ? (
            <Tabs
              value={categoryProviderId ?? "__none__"}
              onValueChange={(value) => {
                if (value === "__none__") return
                setProviderTouched(true)
                setCategoryProviderId(value)
                if (resolvedCategory && onLoadProvider) {
                  onLoadProvider(resolvedCategory, value)
                }
              }}
              className="gap-0"
            >
              <TabsList variant="line" className="h-auto max-w-full justify-start flex-wrap rounded-none px-0">
                {categoryProviders.map((provider) => (
                  <TabsTrigger key={provider.id} value={provider.id} className="flex-none gap-2 px-3 text-xs data-[state=active]:shadow-none">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white p-1 text-black shadow-sm dark:bg-white dark:text-black">
                      <ProviderLogo
                        providerId={provider.id}
                        providerName={provider.name}
                        size="sm"
                        className="h-full w-full max-h-4 max-w-4"
                      />
                    </span>
                    <span>{provider.name}</span>
                    {loadingProviderId === provider.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : provider.isSelected ? (
                      <span className="text-[10px] text-muted-foreground">Auto</span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categoryProviders.map((provider) => (
                <TabsContent key={provider.id} value={provider.id} className="m-0" />
              ))}
              <TabsContent value="__none__" className="m-0" />
            </Tabs>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isLoadingCategory ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <Button type="button" variant={categoryLayout === "grid" ? "secondary" : "ghost"} size="sm" className="gap-2" onClick={() => setCategoryLayout("grid")}>
            <LayoutGrid className="h-4 w-4" />
            Grid
          </Button>
          <Button type="button" variant={categoryLayout === "table" ? "secondary" : "ghost"} size="sm" className="gap-2" onClick={() => setCategoryLayout("table")}>
            <Rows3 className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {!resolvedCategory ? (
        <Card className="shadow-none">
          <CardContent className="px-4 py-6 text-sm text-muted-foreground">
            Select a category tab to view available providers.
          </CardContent>
        </Card>
      ) : categoryProviders.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="px-4 py-6 text-sm text-muted-foreground">
            No available providers for this category.
          </CardContent>
        </Card>
      ) : activeCategoryEntries.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="px-4 py-6 text-sm text-muted-foreground">
            {isLoadingCategory
              ? "Fetching results..."
              : categoryProviderId
                ? "No results loaded for this provider yet. Select a provider tab to fetch data."
                : "Select a provider tab to fetch data."}
          </CardContent>
        </Card>
      ) : categoryLayout === "grid" ? (
        <div className={cn("grid items-start gap-3", resolvedCategory === "screenshot" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 lg:grid-cols-2")}>
          {activeCategoryEntries.map(({ indicator, result }, index) => {
            const providerName = (providersByType?.[resolvedCategory ?? ""] ?? []).find(
              (provider) => provider.id === result._provider
            )?.name ?? result._provider ?? "Provider"

            return (
              <Card key={`${resolvedCategory}-${indicator}-${result._provider ?? index}`} className="gap-0 py-4 shadow-none">
                <CardHeader className="px-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm" title={indicator}>{indicator}</CardTitle>
                      <CardDescription className="pt-1">{providerName}</CardDescription>
                    </div>
                    {result.error ? <Badge variant="destructive" className="shrink-0">Error</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  {renderLookupDisplay(resolvedCategory ?? "unknown", result, true)}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          data={tableRows}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          searchControl={(
            <Input
              placeholder="Search observable..."
              value={observableFilterValue}
              onChange={(event) => {
                const value = event.target.value
                setColumnFilters((prev) => {
                  const rest = prev.filter((item) => item.id !== "observable")
                  return value ? [...rest, { id: "observable", value }] : rest
                })
              }}
            />
          )}
          filterFields={filterFields}
          pageSizeOptions={[10, 20, 50]}
          tableClassName="w-max min-w-full"
        />
      )}
    </div>
  )
}
