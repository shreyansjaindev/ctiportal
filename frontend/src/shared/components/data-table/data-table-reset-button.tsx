"use client"

import { useDataTable } from "@/shared/components/data-table/data-table-provider"
import { Button } from "@/shared/components/ui/button"
import { X } from "lucide-react"

export function DataTableResetButton() {
  const { table } = useDataTable()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => table.resetColumnFilters()}
    >
      <X className="mr-2 h-4 w-4" />
      Reset
    </Button>
  )
}
