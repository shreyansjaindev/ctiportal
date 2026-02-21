import { useMemo, useState } from "react"
import type { ColumnFiltersState, OnChangeFn, SortingState } from "@tanstack/react-table"

import type { QueryParams } from "../types"

const DEFAULT_LIMIT = 25

export function useNRDs() {

  // State
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [sorting, setSortingState] = useState<SortingState>([
    { id: "created", desc: true },
  ])
  const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([])

  // Query params
  const ordering = useMemo(() => {
    const sort = sorting[0]
    if (!sort) return "-created"
    // Map frontend column IDs to backend ordering fields
    const fieldMap: Record<string, string> = {
      value: "value",
      created: "created",
    }
    const field = fieldMap[sort.id] ?? "created"
    return `${sort.desc ? "-" : ""}${field}`
  }, [sorting])

  const filterParams = useMemo<QueryParams>(() => {
    const params: QueryParams = {}
    const getFilter = (id: string) =>
      columnFilters.find((filter) => filter.id === id)?.value

    const value = getFilter("value")
    const sourceDate = getFilter("source_date")
    const created = getFilter("created")

    if (value) params.value__icontains = String(value)
    if (sourceDate) params.source_date__icontains = String(sourceDate)
    if (created) params.created__icontains = String(created)

    return params
  }, [columnFilters])

  const params = useMemo<QueryParams>(
    () => ({
      limit,
      offset,
      search: search || undefined,
      ordering,
      ...filterParams,
    }),
    [limit, offset, search, ordering, filterParams]
  )

  const setSorting: OnChangeFn<SortingState> = (updater) => {
    setOffset(0)
    setSortingState((prev) => (typeof updater === "function" ? updater(prev) : updater))
  }

  const setColumnFilters: OnChangeFn<ColumnFiltersState> = (updater) => {
    setOffset(0)
    setColumnFiltersState((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    )
  }

  return {
    // State
    search,
    setSearch,
    limit,
    setLimit,
    offset,
    setOffset,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    // Params (pass to queryOptions in the consuming component)
    params,
  }
}
