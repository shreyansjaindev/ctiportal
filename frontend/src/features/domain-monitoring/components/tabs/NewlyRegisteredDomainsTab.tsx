import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { detectIndicatorType } from "@/shared/lib"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { DatePickerWithRange } from "@/shared/components/custom/date-picker-with-range"
import { queryNewlyRegisteredDomainMatches } from "../../services"
import type { NewlyRegisteredDomain } from "../../types"

import type { useNewlyRegisteredDomains } from "../../hooks/useNewlyRegisteredDomains"
import { columns } from "../../nrds/columns"
import { LIMIT_OPTIONS } from "../../nrds/constants"
import { nrdsQueryOptions } from "../../nrds/query-options"

interface NewlyRegisteredDomainsTabProps {
  nrds: ReturnType<typeof useNewlyRegisteredDomains>
}

const PROPERTY_OPTIONS = [
  { value: "typo_match", label: "Typo Match" },
  { value: "substring_typo_match", label: "Substring Typo Match" },
  { value: "noise_reduction", label: "Noise Reduction" },
]

export function NewlyRegisteredDomainsTab({ nrds }: NewlyRegisteredDomainsTabProps) {
  const query = useQuery(nrdsQueryOptions(nrds.params))
  const [queryValue, setQueryValue] = useState("")
  const [matchType, setMatchType] = useState<"domain" | "keyword">("domain")
  const [properties, setProperties] = useState<string[]>([])
  const [excludeKeywords, setExcludeKeywords] = useState("")
  const [sourceDateRange, setSourceDateRange] = useState<DateRange | undefined>(undefined)
  const [ingestedDateRange, setIngestedDateRange] = useState<DateRange | undefined>(undefined)
  const debouncedQueryValue = useDebounce(queryValue, 400)

  const hasQuery = queryValue.trim().length > 0
  const isFilteringByMatch = debouncedQueryValue.trim().length > 0

  const queryExcludeKeywords = useMemo(
    () =>
      excludeKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [excludeKeywords]
  )
  const visiblePropertyOptions = useMemo(
    () =>
      PROPERTY_OPTIONS.filter((option) =>
        matchType === "domain" ? option.value !== "substring_typo_match" : true
      ),
    [matchType]
  )
  const allowedPropertyValues = useMemo(
    () => new Set(visiblePropertyOptions.map((option) => option.value)),
    [visiblePropertyOptions]
  )
  const effectiveProperties = useMemo(
    () => properties.filter((property) => allowedPropertyValues.has(property)),
    [properties, allowedPropertyValues]
  )

  const matchQuery = useQuery({
    queryKey: [
      "nrd-match-query",
      debouncedQueryValue,
      matchType,
      effectiveProperties.join(","),
      queryExcludeKeywords.join(","),
      sourceDateRange?.from?.toISOString() ?? "",
      sourceDateRange?.to?.toISOString() ?? "",
      ingestedDateRange?.from?.toISOString() ?? "",
      ingestedDateRange?.to?.toISOString() ?? "",
    ],
    queryFn: () =>
      queryNewlyRegisteredDomainMatches({
        value: debouncedQueryValue.trim(),
        resource_type: matchType,
        properties: effectiveProperties,
        exclude_keywords: queryExcludeKeywords,
        lookalike_match_from: sourceDateRange?.from ? format(sourceDateRange.from, "yyyy-MM-dd") : null,
        lookalike_match_to: sourceDateRange?.to ? format(sourceDateRange.to, "yyyy-MM-dd") : null,
        since_from: ingestedDateRange?.from ? format(ingestedDateRange.from, "yyyy-MM-dd") : null,
        since_to: ingestedDateRange?.to ? format(ingestedDateRange.to, "yyyy-MM-dd") : null,
        limit: 10000,
      }),
    enabled: isFilteringByMatch,
  })

  const items: NewlyRegisteredDomain[] = isFilteringByMatch
    ? (matchQuery.data?.items ?? [])
    : (query.data?.items ?? [])
  const total = query.data?.count ?? 0
  const displayTotal = isFilteringByMatch ? (matchQuery.data?.items.length ?? 0) : total

  return (
    <>
      {matchQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {matchQuery.error instanceof Error
              ? matchQuery.error.message
              : "Failed to run match query"}
          </AlertDescription>
        </Alert>
      )}
      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>Unable to load newly registered domains.</AlertDescription>
        </Alert>
      )}

      {query.isLoading ? (
        <div className="space-y-3 px-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          serverSide={!isFilteringByMatch}
          isLoading={query.isFetching || matchQuery.isFetching}
          totalCount={displayTotal}
          sorting={nrds.sorting}
          onSortingChange={nrds.setSorting}
          columnFilters={nrds.columnFilters}
          onColumnFiltersChange={nrds.setColumnFilters}
          searchControl={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
              <div className="space-y-1 lg:col-span-5">
                <div className="flex min-h-5 items-center">
                  <p className="text-xs text-muted-foreground">Query</p>
                </div>
                <Input
                  value={queryValue}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setQueryValue(nextValue)
                    nrds.setSearch(nextValue)
                    nrds.setOffset(0)
                    const detected = detectIndicatorType(nextValue.trim())
                    setMatchType(detected === "domain" ? "domain" : "keyword")
                    if (!nextValue.trim()) {
                      setProperties([])
                    }
                  }}
                  placeholder="Query domains/keywords"
                />
              </div>
              <div className="space-y-1 lg:col-span-3">
                <div className="flex min-h-5 items-center">
                  <p className="text-xs text-muted-foreground">Exclude Keywords</p>
                </div>
                <Input
                  value={excludeKeywords}
                  onChange={(event) => setExcludeKeywords(event.target.value)}
                  placeholder="Exclude keywords (comma-separated)"
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <p className="min-w-0 text-xs text-muted-foreground">Source Date Range</p>
                  {sourceDateRange ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="h-auto shrink-0 px-0 text-xs leading-none text-muted-foreground"
                      onClick={() => setSourceDateRange(undefined)}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
                <DatePickerWithRange
                  date={sourceDateRange}
                  setDate={setSourceDateRange}
                  className="w-full"
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <p className="min-w-0 text-xs text-muted-foreground">Ingested Date Range</p>
                  {ingestedDateRange ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="h-auto shrink-0 px-0 text-xs leading-none text-muted-foreground"
                      onClick={() => setIngestedDateRange(undefined)}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
                <DatePickerWithRange
                  date={ingestedDateRange}
                  setDate={setIngestedDateRange}
                  className="w-full"
                />
              </div>
              {hasQuery ? (
                <div className="col-span-full flex flex-wrap items-center gap-3">
                  {visiblePropertyOptions.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={properties.includes(option.value)}
                        onCheckedChange={(checked) =>
                          setProperties((prev) =>
                            checked ? [...prev, option.value] : prev.filter((item) => item !== option.value)
                          )
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          }
          pagination={{
            pageIndex: Math.floor(nrds.offset / nrds.limit),
            pageSize: nrds.limit,
          }}
          onPaginationChange={(updater) => {
            const prev = {
              pageIndex: Math.floor(nrds.offset / nrds.limit),
              pageSize: nrds.limit,
            }
            const next = typeof updater === "function" ? updater(prev) : updater
            nrds.setLimit(next.pageSize)
            nrds.setOffset(next.pageIndex * next.pageSize)
          }}
          pageCount={Math.ceil(displayTotal / nrds.limit)}
          pageSizeOptions={LIMIT_OPTIONS}
          fillViewport
        />
      )}
    </>
  )
}
