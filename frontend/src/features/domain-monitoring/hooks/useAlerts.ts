import { useMemo, useState } from "react"
import type { ColumnFiltersState, OnChangeFn, SortingState } from "@tanstack/react-table"

import type { QueryParams } from "../types"

const DEFAULT_LIMIT = 25

export function useAlerts() {
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [sorting, setSortingState] = useState<SortingState>([
    { id: "created", desc: true },
  ])
  const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([])

  const ordering = useMemo(() => {
    const sort = sorting[0]
    if (!sort) return "-created"
    const fieldMap: Record<string, string> = {
      created: "created",
      domain_name: "domain_name",
      status: "status",
      company: "company__name",
    }
    const field = fieldMap[sort.id] ?? "created"
    return `${sort.desc ? "-" : ""}${field}`
  }, [sorting])

  const filterParams = useMemo<QueryParams>(() => {
    const params: QueryParams = {}
    const getFilter = (id: string) =>
      columnFilters.find((filter) => filter.id === id)?.value

    const domainName = getFilter("domain_name")
    const status = getFilter("status")
    const company = getFilter("company")
    const created = getFilter("created")

    if (domainName) params.domain_name__icontains = String(domainName)
    if (status) params.status = Array.isArray(status) ? status : [String(status)]
    if (company) params.company = String(company)
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
    params,
  }
}
