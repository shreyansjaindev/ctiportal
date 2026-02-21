"use client"

import type { Column } from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { FilterOption } from "./types"

export type { FilterOption }

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  /** If provided, renders a filter icon with popover */
  filterType?: "text" | "select"
  /** Options for select filter type */
  filterOptions?: FilterOption[]
  /** Placeholder for text filter input */
  filterPlaceholder?: string
  /** "All" label shown at top of select (default: "All") */
  filterAllLabel?: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const isSortable = column.getCanSort()
  const sortDir = column.getIsSorted()

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {isSortable ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          onClick={() => column.toggleSorting(undefined)}
        >
          {title}
          <span className="flex flex-col">
            <ChevronUp
              className={cn(
                "-mb-0.5 size-3",
                sortDir === "asc" ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
            <ChevronDown
              className={cn(
                "-mt-0.5 size-3",
                sortDir === "desc" ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
          </span>
        </Button>
      ) : (
        <span className="text-sm font-medium">{title}</span>
      )}
    </div>
  )
}
