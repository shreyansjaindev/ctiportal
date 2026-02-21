import type React from "react"

import { Checkbox } from "@/shared/components/ui/checkbox"

export type DataTableColumn<T> = {
  key: string
  header: string
  className?: string
  render: (row: T) => React.ReactNode
}

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>
  rows: T[]
  rowKey: (row: T) => number
  selectedIds?: Set<number>
  onToggleRow?: (id: number) => void
  onToggleAll?: (checked: boolean) => void
}

export function DataTable<T>(props: DataTableProps<T>) {
  const { columns, rows, rowKey, selectedIds, onToggleRow, onToggleAll } = props
  const selectable = !!selectedIds && !!onToggleRow && !!onToggleAll
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selectedIds.has(rowKey(row)))
  const partiallySelected =
    selectable && rows.some((row) => selectedIds.has(rowKey(row))) && !allSelected

  return (
    <div className="overflow-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            {selectable && (
              <th className="px-3 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(value) => onToggleAll(Boolean(value))}
                  aria-label="Select all"
                  data-state={partiallySelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-2 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowId = rowKey(row)
            const isSelected = selectedIds?.has(rowId) ?? false
            return (
              <tr key={rowId} className="border-t">
                {selectable && (
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleRow(rowId)}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={`${rowId}-${column.key}`} className={`px-3 py-2 ${column.className ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
