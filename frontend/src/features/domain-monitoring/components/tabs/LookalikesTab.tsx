import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuth } from "@/shared/lib/auth"

import { BulkActionsBar } from "../BulkActionsBar"
import { LOOKALIKE_STATUS_OPTIONS } from "../../constants"
import type { useLookalikeDomains } from "../../hooks"
import { getColumns } from "../../lookalikes/columns"
import { LIMIT_OPTIONS, lookalikesFilterFields } from "../../lookalikes/constants"
import { lookalikesQueryOptions } from "../../lookalikes/query-options"


interface LookalikesTabProps {
  lookalikes: ReturnType<typeof useLookalikeDomains>
  onOpenImport: () => void
}

export function LookalikesTab({ lookalikes, onOpenImport }: LookalikesTabProps) {
  const { token } = useAuth()
  const query = useQuery(lookalikesQueryOptions(lookalikes.params, token!))
  const items = query.data?.items ?? []
  const total = query.data?.count ?? 0
  const selectedCount = lookalikes.selectedIds.size

  // Sync selections when page/data changes to remove stale ids
  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id))
    lookalikes.setSelectedIds((prev) => {
      const filtered = Array.from(prev).filter((id) => currentIds.has(id))
      return filtered.length === prev.size ? prev : new Set(filtered)
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDomains = useMemo(
    () => items.filter((item) => lookalikes.selectedIds.has(item.id)).map((item) => item.value),
    [items, lookalikes.selectedIds]
  )

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (row) => {
          lookalikes.setEditing(row)
          lookalikes.setSheetOpen(true)
        },
        onDelete: (id) => lookalikes.deleteMutation.mutate(id),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookalikes.setEditing, lookalikes.setSheetOpen, lookalikes.deleteMutation]
  )

  return (
    <>
      {lookalikes.error && (
        <Alert variant="destructive">
          <AlertDescription>{lookalikes.error}</AlertDescription>
        </Alert>
      )}

      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>Unable to load lookalike domains.</AlertDescription>
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
          filterFields={lookalikesFilterFields}
          isLoading={query.isFetching}
          totalCount={total}
          sorting={lookalikes.sorting}
            onSortingChange={lookalikes.setSorting}
            columnFilters={lookalikes.columnFilters}
            onColumnFiltersChange={lookalikes.setColumnFilters}
            searchControl={
              <Input
                value={lookalikes.search}
                onChange={(event) => {
                  lookalikes.setSearch(event.target.value)
                  lookalikes.setOffset(0)
                }}
                placeholder="Search by domain or lookalike"
                className="min-w-[220px]"
              />
            }
            toolbarControls={
              <>
                {selectedCount > 0 && (
                  <BulkActionsBar
                    count={selectedCount}
                    statusOptions={LOOKALIKE_STATUS_OPTIONS}
                    onClear={() => lookalikes.setSelectedIds(new Set())}
                    onDelete={() =>
                      lookalikes.bulkDeleteMutation.mutate(Array.from(lookalikes.selectedIds))
                    }
                    onStatusUpdate={(status) =>
                      lookalikes.bulkStatusMutation.mutate({
                        ids: Array.from(lookalikes.selectedIds),
                        status,
                      })
                    }
                    onExportTrellix={() =>
                      lookalikes.exportTrellixMutation.mutate(selectedDomains)
                    }
                    onExportProofpoint={() =>
                      lookalikes.exportProofpointMutation.mutate(selectedDomains)
                    }
                  />
                )}
              </>
            }
            rightToolbarControls={
              <>
                <Button size="sm" variant="outline" onClick={onOpenImport}>
                  Import CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    lookalikes.setEditing(null)
                    lookalikes.setSheetOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add lookalike
                </Button>
              </>
            }
            pagination={{ pageIndex: Math.floor(lookalikes.offset / lookalikes.limit), pageSize: lookalikes.limit }}
            onPaginationChange={(updater) => {
              const prev = { pageIndex: Math.floor(lookalikes.offset / lookalikes.limit), pageSize: lookalikes.limit }
              const next = typeof updater === "function" ? updater(prev) : updater
              lookalikes.setLimit(next.pageSize)
              lookalikes.setOffset(next.pageIndex * next.pageSize)
            }}
            pageCount={Math.ceil(total / lookalikes.limit)}
            pageSizeOptions={LIMIT_OPTIONS}
            enableRowSelection
            selectedRowIds={lookalikes.selectedIds}
            onSelectedRowIdsChange={lookalikes.setSelectedIds}
            rowIdAccessor={(row) => row.id}
          />
        )}
    </>
  )
}
