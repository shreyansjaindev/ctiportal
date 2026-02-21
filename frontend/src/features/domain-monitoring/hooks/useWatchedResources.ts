import { useMemo, useState } from "react"
import type { ColumnFiltersState, OnChangeFn, SortingState } from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/shared/lib/auth"

import {
  createWatchedResource,
  deleteWatchedResource,
  updateWatchedResource,
} from "../services"
import type { QueryParams, WatchedResource } from "../types"

const DEFAULT_LIMIT = 25

export function useWatchedResources() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  // State
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [sorting, setSortingState] = useState<SortingState>([
    { id: "created", desc: true },
  ])
  const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<WatchedResource | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Query params
  const ordering = useMemo(() => {
    const sort = sorting[0]
    if (!sort) return "-created"
    // Map frontend column IDs to backend ordering fields
    const fieldMap: Record<string, string> = {
      value: "value",
      resource_type: "resource_type",
      status: "status",
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
    const resourceType = getFilter("resource_type")
    const company = getFilter("company")
    const statusFilter = getFilter("status")
    const created = getFilter("created")

    if (value) params.value__icontains = String(value)
    // Arrays are sent as repeated params (e.g. ?resource_type=domain&resource_type=keyword)
    if (resourceType) params.resource_type = Array.isArray(resourceType) ? resourceType : [String(resourceType)]
    if (company) params.company = String(company)
    if (statusFilter) params.status = Array.isArray(statusFilter) ? statusFilter : [String(statusFilter)]
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

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createWatchedResource>[0]) => {
      if (!token) throw new Error("Not authenticated")
      if (editing) {
        return updateWatchedResource(editing.id, payload, token)
      }
      return createWatchedResource(payload, token)
    },
    onSuccess: () => {
      setError(null)
      setSheetOpen(false)
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ["watched-resources"] })
    },
    onError: () => setError("Unable to save watched resource."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error("Not authenticated")
      return deleteWatchedResource(id, token)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["watched-resources"] })
    },
    onError: () => setError("Unable to delete watched resource."),
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
    // Params (pass to queryOptions in the consuming component)
    params,
    // Mutations
    saveMutation,
    deleteMutation,
  }
}
