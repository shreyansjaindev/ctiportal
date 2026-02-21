import { useMemo, useState } from "react"
import type { ColumnFiltersState, OnChangeFn, SortingState } from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/shared/lib/auth"

import {
  addDomainsToProofpoint,
  addDomainsToTrellix,
  bulkDeleteLookalikeDomains,
  bulkUpdateLookalikeDomains,
  createLookalikeDomain,
  deleteLookalikeDomain,
  importLookalikeDomainsCSV,
  updateLookalikeDomain,
} from "../services"
import type { BulkCreateResult, LookalikeDomain, QueryParams } from "../types"

const DEFAULT_LIMIT = 25

export function useLookalikeDomains() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  // State
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [sorting, setSortingState] = useState<SortingState>([
    { id: "created", desc: true },
  ])
  const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([
    { id: "status", value: ["open"] },
  ])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<LookalikeDomain | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<BulkCreateResult | null>(null)

  // Query params
  const ordering = useMemo(() => {
    const sort = sorting[0]
    if (!sort) return "-created"
    // Map frontend column IDs to backend ordering fields
    const fieldMap: Record<string, string> = {
      created: "created",
      source_date: "source_date",
      value: "value",
      source: "source",
      potential_risk: "potential_risk",
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
    const toDateString = (value: unknown) => {
      if (!value) return undefined
      if (typeof value === "string") return value
      if (value instanceof Date) {
        const timezoneOffset = value.getTimezoneOffset() * 60000
        return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 10)
      }
      return undefined
    }
    const toSingleFilterValue = (filterValue: unknown) => {
      if (Array.isArray(filterValue)) {
        return filterValue.length ? String(filterValue[0]) : undefined
      }
      if (filterValue === null || filterValue === undefined || filterValue === "") {
        return undefined
      }
      return String(filterValue)
    }

    const value = getFilter("value")
    const source = getFilter("source")
    const watchedResource = getFilter("watched_resource")
    const risk = getFilter("potential_risk")
    const status = getFilter("status")
    const company = getFilter("company")
    const created = getFilter("created")
    const sourceDate = getFilter("source_date")

    const valueFilter = toSingleFilterValue(value)
    const sourceFilter = toSingleFilterValue(source)
    const watchedResourceFilter = toSingleFilterValue(watchedResource)
    const companyFilter = toSingleFilterValue(company)
    const createdFilter = toSingleFilterValue(created)
    const sourceDateFilter = toSingleFilterValue(sourceDate)

    if (valueFilter) params.value__icontains = valueFilter
    if (sourceFilter) params.source__icontains = sourceFilter
    if (watchedResourceFilter) params.watched_resource__icontains = watchedResourceFilter
    // Arrays are sent as repeated params (e.g. ?potential_risk=critical&potential_risk=high)
    if (risk) params.potential_risk = Array.isArray(risk) ? risk : [String(risk)]
    if (status) params.status = Array.isArray(status) ? status : [String(status)]
    if (companyFilter) params.company = companyFilter
    if (Array.isArray(created)) {
      const [from, to] = created
      const fromDate = toDateString(from)
      const toDate = toDateString(to)
      if (fromDate) params.created__gte = fromDate
      if (toDate) params.created__lte = toDate
      if (!fromDate && !toDate && createdFilter) {
        params.created__icontains = createdFilter
      }
    } else if (createdFilter) {
      params.created__icontains = createdFilter
    }
    if (Array.isArray(sourceDate)) {
      const [from, to] = sourceDate
      const fromDate = toDateString(from)
      const toDate = toDateString(to)
      if (fromDate) params.source_date__gte = fromDate
      if (toDate) params.source_date__lte = toDate
      if (!fromDate && !toDate && sourceDateFilter) {
        params.source_date__icontains = sourceDateFilter
      }
    } else if (sourceDateFilter) {
      params.source_date__icontains = sourceDateFilter
    }

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

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createLookalikeDomain>[0]) => {
      if (!token) throw new Error("Not authenticated")
      if (editing) {
        return updateLookalikeDomain(editing.id, payload, token)
      }
      return createLookalikeDomain(payload, token)
    },
    onSuccess: () => {
      setError(null)
      setSheetOpen(false)
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ["lookalike-domains"] })
    },
    onError: (error: Error) => {
      console.error("Lookalike save error:", error)
      setError(error.message || "Unable to save lookalike domain.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error("Not authenticated")
      return deleteLookalikeDomain(id, token)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["lookalike-domains"] })
    },
    onError: () => setError("Unable to delete lookalike domain."),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => {
      if (!token) throw new Error("Not authenticated")
      return bulkDeleteLookalikeDomains(ids, token)
    },
    onSuccess: () => {
      setError(null)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ["lookalike-domains"] })
    },
    onError: () => setError("Unable to bulk delete lookalikes."),
  })

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) => {
      if (!token) throw new Error("Not authenticated")
      return bulkUpdateLookalikeDomains(ids, status, token)
    },
    onSuccess: () => {
      setError(null)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ["lookalike-domains"] })
    },
    onError: () => setError("Unable to bulk update lookalike status."),
  })

  const exportTrellixMutation = useMutation({
    mutationFn: (domains: string[]) => {
      if (!token) throw new Error("Not authenticated")
      return addDomainsToTrellix(domains, token)
    },
    onSuccess: () => setError(null),
    onError: () => setError("Unable to export to Trellix."),
  })

  const exportProofpointMutation = useMutation({
    mutationFn: (domains: string[]) => {
      if (!token) throw new Error("Not authenticated")
      return addDomainsToProofpoint(domains, token)
    },
    onSuccess: () => setError(null),
    onError: () => setError("Unable to export to Proofpoint."),
  })

  const importCSVMutation = useMutation({
    mutationFn: (file: File) => {
      if (!token) throw new Error("Not authenticated")
      return importLookalikeDomainsCSV(file, token)
    },
    onSuccess: (result) => {
      setImportResult(result)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["lookalike-domains"] })
    },
    onError: (error: Error) => {
      setError(error.message || "Unable to import CSV.")
      setImportResult(null)
    },
  })

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
    selectedIds,
    setSelectedIds,
    sheetOpen,
    setSheetOpen,
    editing,
    setEditing,
    error,
    setError,
    importOpen,
    setImportOpen,
    importFile,
    setImportFile,
    importResult,
    setImportResult,
    // Params (pass to queryOptions in the consuming component)
    params,
    // Mutations
    saveMutation,
    deleteMutation,
    bulkDeleteMutation,
    bulkStatusMutation,
    exportTrellixMutation,
    exportProofpointMutation,
    importCSVMutation,
  }
}
