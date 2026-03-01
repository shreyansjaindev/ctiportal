import { useQuery } from "@tanstack/react-query"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"

import type { useMonitoredDomains } from "../../hooks"
import { columns } from "../../monitored-domains/columns"
import { LIMIT_OPTIONS } from "../../monitored-domains/constants"
import { monitoredDomainsQueryOptions } from "../../monitored-domains/query-options"

interface MonitoredDomainsTabProps {
  monitoredDomains: ReturnType<typeof useMonitoredDomains>
}

export function MonitoredDomainsTab({ monitoredDomains }: MonitoredDomainsTabProps) {
  const query = useQuery(monitoredDomainsQueryOptions(monitoredDomains.params))
  const items = query.data?.items ?? []
  const total = query.data?.count ?? 0

  return (
    <>
      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>Unable to load monitored domains.</AlertDescription>
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
          sorting={monitoredDomains.sorting}
          onSortingChange={monitoredDomains.setSorting}
          columnFilters={monitoredDomains.columnFilters}
          onColumnFiltersChange={monitoredDomains.setColumnFilters}
          searchControl={
            <Input
              value={monitoredDomains.search}
              onChange={(event) => {
                monitoredDomains.setSearch(event.target.value)
                monitoredDomains.setOffset(0)
              }}
              placeholder="Search monitored domains"
              className="min-w-[220px]"
            />
          }
          toolbarControls={<></>}
          pagination={{
            pageIndex: Math.floor(monitoredDomains.offset / monitoredDomains.limit),
            pageSize: monitoredDomains.limit,
          }}
          onPaginationChange={(updater) => {
            const prev = {
              pageIndex: Math.floor(monitoredDomains.offset / monitoredDomains.limit),
              pageSize: monitoredDomains.limit,
            }
            const next = typeof updater === "function" ? updater(prev) : updater
            monitoredDomains.setLimit(next.pageSize)
            monitoredDomains.setOffset(next.pageIndex * next.pageSize)
          }}
          pageCount={Math.ceil(total / monitoredDomains.limit)}
          pageSizeOptions={LIMIT_OPTIONS}
        />
      )}
    </>
  )
}
