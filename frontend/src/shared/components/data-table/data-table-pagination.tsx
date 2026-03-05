"use client"

import { useDataTable } from "@/shared/components/data-table/data-table-provider"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

export function DataTablePagination({ pageSizeOptions = [10, 20, 30, 40, 50] }: { pageSizeOptions?: number[] }) {
  const { table, pagination, totalCount } = useDataTable()

  if (!pagination) {
    return null
  }

  const totalRows = totalCount ?? table.getFilteredRowModel().rows.length
  const rowStart = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const rowEnd = totalRows === 0 ? 0 : Math.min(totalRows, (pagination.pageIndex + 1) * pagination.pageSize)
  const centerLabel = `${rowStart}-${rowEnd} of ${totalRows}`
  const normalizedPageSizeOptions = Array.from(new Set(pageSizeOptions)).sort((a, b) => a - b)

  return (
    <div className="ml-auto">
      <div className="inline-flex items-center overflow-hidden rounded-md border border-border bg-muted/10">
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-none p-0"
          onClick={() => {
            table.setPageIndex(0)
          }}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-none p-0"
          onClick={() => {
            table.previousPage()
          }}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="h-8 border-l border-border" />
        <Select
          value={`${pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
        >
          <SelectTrigger
            className="h-8 w-auto min-w-28 justify-center border-0 bg-transparent px-2 text-center text-xs font-medium shadow-none focus:ring-0 [&>svg]:hidden"
          >
            <SelectValue>{centerLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" position="popper" sideOffset={4} avoidCollisions={false}>
            {normalizedPageSizeOptions.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-8 border-l border-border" />
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-none p-0"
          onClick={() => {
            table.nextPage()
          }}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-none p-0"
          onClick={() => {
            table.setPageIndex(table.getPageCount() - 1)
          }}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
