import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useAuth } from "@/shared/lib/auth"
import { useRowSelection } from "@/shared/hooks"

import type { useNRDs } from "../../hooks"
import { columns } from "../../nrds/columns"
import { LIMIT_OPTIONS } from "../../nrds/constants"
import { nrdsQueryOptions } from "../../nrds/query-options"


interface NRDsTabProps {
  nrds: ReturnType<typeof useNRDs>
}

export function NRDsTab({ nrds }: NRDsTabProps) {
  const { token } = useAuth()
  const query = useQuery(nrdsQueryOptions(nrds.params, token!))
  const items = query.data?.items ?? []
  const total = query.data?.count ?? 0
  const { selectedIds, setSelectedIds, clearSelection } = useRowSelection<number>()

  // Sync selections when page/data changes to remove stale ids
  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id))
    setSelectedIds((prev) => {
      const filtered = Array.from(prev).filter((id) => currentIds.has(id))
      return filtered.length === prev.size ? prev : new Set(filtered)
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
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
          isLoading={query.isFetching}
          totalCount={total}
            sorting={nrds.sorting}
            onSortingChange={nrds.setSorting}
            columnFilters={nrds.columnFilters}
            onColumnFiltersChange={nrds.setColumnFilters}
            searchControl={
              <Input
                value={nrds.search}
                onChange={(event) => {
                  clearSelection()
                  nrds.setSearch(event.target.value)
                  nrds.setOffset(0)
                }}
                placeholder="Search by domain or registrar"
                className="min-w-[220px]"
              />
            }
            toolbarControls={<></>}
            pagination={{ pageIndex: Math.floor(nrds.offset / nrds.limit), pageSize: nrds.limit }}
            onPaginationChange={(updater) => {
              const prev = { pageIndex: Math.floor(nrds.offset / nrds.limit), pageSize: nrds.limit }
              const next = typeof updater === "function" ? updater(prev) : updater
              clearSelection()
              nrds.setLimit(next.pageSize)
              nrds.setOffset(next.pageIndex * next.pageSize)
            }}
            pageCount={Math.ceil(total / nrds.limit)}
            pageSizeOptions={LIMIT_OPTIONS}
          enableRowSelection
          selectedRowIds={selectedIds}
          onSelectedRowIdsChange={setSelectedIds}
          rowIdAccessor={(row) => row.id}
        />
      )}
    </>
  )
}
