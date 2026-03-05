"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { useDataTable } from "./data-table-provider"
import { useControls } from "@/shared/providers/controls"
import { DataTableFilterControlsDrawer } from "./data-table-filter-controls-drawer"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps {
  renderActions?: () => React.ReactNode
  hasFilters?: boolean
}

export function DataTableToolbar({ renderActions, hasFilters = true }: DataTableToolbarProps) {
  const { table } = useDataTable()
  const { open, setOpen } = useControls()
  const activeFilterCount = table.getState().columnFilters.length

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {hasFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen((prev) => !prev)}
          className="hidden gap-2 sm:flex"
        >
          {open ? (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="hidden md:block">
                Hide Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="h-4 w-4" />
              <span className="hidden md:block">
                Show Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </span>
            </>
          )}
        </Button>
        )}
        <div className="block sm:hidden">
          <DataTableFilterControlsDrawer />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {renderActions?.()}
        <DataTableViewOptions />
      </div>
    </div>
  )
}
