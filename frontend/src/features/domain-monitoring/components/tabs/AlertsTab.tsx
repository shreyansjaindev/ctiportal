import { useQuery } from "@tanstack/react-query"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"

import type { useAlerts } from "../../hooks"
import { columns } from "../../alerts/columns"
import { LIMIT_OPTIONS } from "../../alerts/constants"
import { alertsQueryOptions } from "../../alerts/query-options"

interface AlertsTabProps {
  alerts: ReturnType<typeof useAlerts>
}

export function AlertsTab({ alerts }: AlertsTabProps) {
  const query = useQuery(alertsQueryOptions(alerts.params))
  const items = query.data?.items ?? []
  const total = query.data?.count ?? 0

  return (
    <>
      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>Unable to load monitored domain alerts.</AlertDescription>
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
          sorting={alerts.sorting}
          onSortingChange={alerts.setSorting}
          columnFilters={alerts.columnFilters}
          onColumnFiltersChange={alerts.setColumnFilters}
          searchControl={
            <Input
              value={alerts.search}
              onChange={(event) => {
                alerts.setSearch(event.target.value)
                alerts.setOffset(0)
              }}
              placeholder="Search alerts"
              className="min-w-[220px]"
            />
          }
          toolbarControls={<></>}
          pagination={{
            pageIndex: Math.floor(alerts.offset / alerts.limit),
            pageSize: alerts.limit,
          }}
          onPaginationChange={(updater) => {
            const prev = {
              pageIndex: Math.floor(alerts.offset / alerts.limit),
              pageSize: alerts.limit,
            }
            const next = typeof updater === "function" ? updater(prev) : updater
            alerts.setLimit(next.pageSize)
            alerts.setOffset(next.pageIndex * next.pageSize)
          }}
          pageCount={Math.ceil(total / alerts.limit)}
          pageSizeOptions={LIMIT_OPTIONS}
        />
      )}
    </>
  )
}
