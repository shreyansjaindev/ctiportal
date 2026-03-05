import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Badge } from "@/shared/components/ui/badge"

import { BulkActionsBar } from "../BulkActionsBar"
import { LOOKALIKE_STATUS_OPTIONS } from "../../constants"
import type { useLookalikeDomains } from "../../hooks"
import type { LookalikeDomain } from "../../types"
import { getColumns } from "../../lookalikes/columns"
import { LookalikeEnrichmentPanel } from "../../lookalikes/LookalikeEnrichmentPanel"
import { LIMIT_OPTIONS, lookalikesFilterFields } from "../../lookalikes/constants"
import { lookalikesQueryOptions } from "../../lookalikes/query-options"

const EMPTY_ITEMS: LookalikeDomain[] = []

interface LookalikesTabProps {
  lookalikes: ReturnType<typeof useLookalikeDomains>
  onOpenImport: () => void
}

export function LookalikesTab({ lookalikes, onOpenImport }: LookalikesTabProps) {
  const query = useQuery(lookalikesQueryOptions(lookalikes.params))
  const items = query.data?.items ?? EMPTY_ITEMS
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
          serverSide
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
            fillViewport
            enableRowSelection
            selectedRowIds={lookalikes.selectedIds}
            onSelectedRowIdsChange={lookalikes.setSelectedIds}
            rowIdAccessor={(row) => row.id}
            detailView={{
              mode: "cell",
              triggerColumnIds: ["value"],
              getTitle: (selection) =>
                selection ? String((selection.row as LookalikeDomain).value) : "Details",
              render: ({ row }) => {
                const item = row as LookalikeDomain
                return (
                  <div className="grid gap-6 text-sm xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div className="rounded-md border border-border/80 p-4">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Domain</p>
                            <p className="break-all font-medium text-foreground">{item.value}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Company</p>
                            <p className="text-foreground">{item.company}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{item.potential_risk}</Badge>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Source</p>
                            <p className="text-foreground">{item.source}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Watched Resource</p>
                            <p className="break-all text-foreground">{item.watched_resource}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-md border border-border/80 p-4">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                          <div>
                            <p className="text-xs text-muted-foreground">Source Date</p>
                            <p className="text-foreground">{new Date(item.source_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-foreground">{new Date(item.created).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <LookalikeEnrichmentPanel key={item.value} domain={item.value} />
                    </div>
                  </div>
                )
              },
            }}
          />
        )}
    </>
  )
}
