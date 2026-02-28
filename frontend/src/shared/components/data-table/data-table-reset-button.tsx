"use client"

import { useDataTable } from "@/shared/components/data-table/data-table-provider"
import { Button } from "@/shared/components/ui/button"

export function DataTableResetButton() {
  const { table } = useDataTable()

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => table.resetColumnFilters()}
    >
      Reset
    </Button>
  )
}
