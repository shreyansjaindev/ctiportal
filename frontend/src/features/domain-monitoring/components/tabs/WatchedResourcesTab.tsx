import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuth } from "@/shared/lib/auth"

import type { useWatchedResources } from "../../hooks"
import { getColumns } from "../../watched-resources/columns"
import { LIMIT_OPTIONS, watchedResourcesFilterFields } from "../../watched-resources/constants"
import { watchedResourcesQueryOptions } from "../../watched-resources/query-options"


interface WatchedResourcesTabProps {
  watched: ReturnType<typeof useWatchedResources>
}

export function WatchedResourcesTab({ watched }: WatchedResourcesTabProps) {
  const { token } = useAuth()
  const query = useQuery(watchedResourcesQueryOptions(watched.params, token!))
  const items = query.data?.items ?? []
  const total = query.data?.count ?? 0
  const selectedCount = watched.selectedIds.size

  // Sync selections when page/data changes to remove stale ids
  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id))
    watched.setSelectedIds((prev) => {
      const filtered = Array.from(prev).filter((id) => currentIds.has(id))
      return filtered.length === prev.size ? prev : new Set(filtered)
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (row) => {
          watched.setEditing(row)
          watched.setSheetOpen(true)
        },
        onDelete: (id) => watched.deleteMutation.mutate(id),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watched.setEditing, watched.setSheetOpen, watched.deleteMutation]
  )

  return (
    <>
      {watched.error && (
        <Alert variant="destructive">
          <AlertDescription>{watched.error}</AlertDescription>
        </Alert>
      )}

      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>Unable to load watched resources.</AlertDescription>
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
          filterFields={watchedResourcesFilterFields as any}
          isLoading={query.isFetching}
          totalCount={total}
          sorting={watched.sorting}
            onSortingChange={watched.setSorting}
            columnFilters={watched.columnFilters}
            onColumnFiltersChange={watched.setColumnFilters}
            searchControl={
              <Input
                value={watched.search}
                onChange={(event) => {
                  watched.setSearch(event.target.value)
                  watched.setOffset(0)
                }}
                placeholder="Search by value"
                className="min-w-[220px]"
              />
            }
            toolbarControls={
              <>
                {selectedCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{selectedCount} selected</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => watched.setSelectedIds(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!window.confirm(`Delete ${selectedCount} watched resources?`)) return
                        Array.from(watched.selectedIds).forEach((id) => {
                          watched.deleteMutation.mutate(id)
                        })
                        watched.setSelectedIds(new Set())
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </Button>
                  </div>
                )}
              </>
            }
            rightToolbarControls={
              <Button
                size="sm"
                onClick={() => {
                  watched.setEditing(null)
                  watched.setSheetOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Add resource
              </Button>
            }
            pagination={{ pageIndex: Math.floor(watched.offset / watched.limit), pageSize: watched.limit }}
            onPaginationChange={(updater) => {
              const prev = { pageIndex: Math.floor(watched.offset / watched.limit), pageSize: watched.limit }
              const next = typeof updater === "function" ? updater(prev) : updater
              watched.setLimit(next.pageSize)
              watched.setOffset(next.pageIndex * next.pageSize)
            }}
            pageCount={Math.ceil(total / watched.limit)}
            pageSizeOptions={LIMIT_OPTIONS}
            enableRowSelection
            selectedRowIds={watched.selectedIds}
            onSelectedRowIdsChange={watched.setSelectedIds}
            rowIdAccessor={(row) => row.id}
          />
        )}
    </>
  )
}
