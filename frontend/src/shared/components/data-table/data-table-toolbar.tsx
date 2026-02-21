"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/shared/components/ui/button"
import { useDataTable } from "./data-table-provider"
import { useControls } from "@/shared/providers/controls"
import { DataTableFilterControlsDrawer } from "./data-table-filter-controls-drawer"
import { DataTableResetButton } from "./data-table-reset-button"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps {
  renderActions?: () => React.ReactNode
}

export function DataTableToolbar({ renderActions }: DataTableToolbarProps) {
  const { table, isLoading, columnFilters, totalCount } = useDataTable()
  const { open, setOpen } = useControls()
  const filters = table.getState().columnFilters

  const rows = useMemo(
    () => ({
      // In server-side mode, totalCount is the authoritative server total.
      // In client-side mode, derive from the table models.
      total: totalCount ?? table.getCoreRowModel().rows.length,
      filtered: totalCount ?? table.getFilteredRowModel().rows.length,
    }),
    [isLoading, columnFilters, table, totalCount],
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen((prev) => !prev)}
          className="hidden gap-2 sm:flex"
        >
          {open ? (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="hidden md:block">Hide Controls</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="h-4 w-4" />
              <span className="hidden md:block">Show Controls</span>
            </>
          )}
        </Button>
        <div className="block sm:hidden">
          <DataTableFilterControlsDrawer />
        </div>
        <div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {filters.length ? (
              <>
                <span className="font-mono font-medium">
                  {rows.filtered.toLocaleString()}
                </span>{" "}
                of{" "}
                <span className="font-mono font-medium">
                  {rows.total.toLocaleString()}
                </span>{" "}
                row(s) <span className="sr-only sm:not-sr-only">filtered</span>
              </>
            ) : (
              <>
                <span className="font-mono font-medium">
                  {rows.total.toLocaleString()}
                </span>{" "}
                row(s)
              </>
            )}
          </p>
          <p className="block text-sm text-muted-foreground sm:hidden">
            <span className="font-mono font-medium">
              {rows.filtered.toLocaleString()}
            </span>{" "}
            row(s)
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {filters.length ? <DataTableResetButton /> : null}
        {renderActions?.()}
        <DataTableViewOptions />
      </div>
    </div>
  )
}
