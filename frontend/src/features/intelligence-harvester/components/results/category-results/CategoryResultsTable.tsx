import { useMemo, useState } from "react"
import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table"

import { DataTable } from "@/shared/components/data-table"
import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"
import type { DataTableFilterField } from "@/shared/components/data-table/types"
import { Input } from "@/shared/components/ui/input"
import { formatFieldKey } from "../displays/display-utils"

import type { CategoryTableRow } from "./types"

type CategoryResultsTableProps = {
  tableRows: CategoryTableRow[]
  tableColumnKeys: string[]
}

function summarizeStructuredValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return value.map(summarizeStructuredValue).filter(Boolean).join(", ")
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const preferredKeys = ["domain", "url", "hostname", "host", "title", "name", "value", "ip", "id"]
    for (const key of preferredKeys) {
      const candidate = record[key]
      if (candidate !== null && candidate !== undefined && candidate !== "") {
        return summarizeStructuredValue(candidate)
      }
    }
    return Object.entries(record)
      .filter(([, candidate]) => candidate !== null && candidate !== undefined && candidate !== "")
      .slice(0, 3)
      .map(([key, candidate]) => `${formatFieldKey(key)}: ${summarizeStructuredValue(candidate)}`)
      .join(" | ")
  }
  return ""
}

function toCategoryTableCell(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>
  }

  if (typeof value === "string") {
    if (
      (key.toLowerCase().includes("image") || key.toLowerCase().includes("screenshot")) &&
      (value.startsWith("data:image/") || value.length > 100)
    ) {
      const src = value.startsWith("data:image/") ? value : `data:image/png;base64,${value}`
      return <img src={src} alt={key} className="h-16 w-28 rounded border object-cover" />
    }
    return (
      <span className="block max-w-[28rem] truncate whitespace-nowrap" title={value}>
        {value}
      </span>
    )
  }

  if (typeof value === "number" || typeof value === "boolean") return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">-</span>
    const text = value.map((item) => summarizeStructuredValue(item)).filter(Boolean).join(", ")
    return text ? (
      <span className="block max-w-[28rem] truncate whitespace-nowrap" title={text}>
        {text}
      </span>
    ) : (
      <span className="text-muted-foreground">
        {value.length} item{value.length === 1 ? "" : "s"}
      </span>
    )
  }

  if (typeof value === "object") {
    const summarized = summarizeStructuredValue(value)
    const text = summarized || JSON.stringify(value)
    return (
      <span className="block max-w-[28rem] truncate whitespace-nowrap" title={text}>
        {text}
      </span>
    )
  }

  return String(value)
}

export function CategoryResultsTable({
  tableRows,
  tableColumnKeys,
}: CategoryResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const observableFilterValue = useMemo(() => {
    const filter = columnFilters.find((item) => item.id === "observable")
    return typeof filter?.value === "string" ? filter.value : ""
  }, [columnFilters])

  const tableColumns = useMemo<ColumnDef<CategoryTableRow>[]>(() => {
    const observableColumn: ColumnDef<CategoryTableRow> = {
      accessorKey: "observable",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Observable" className="whitespace-nowrap" />
      ),
      cell: ({ row }) => (
        <div
          className="min-w-[12rem] max-w-[16rem] truncate font-medium whitespace-nowrap"
          title={String(row.original.observable)}
        >
          {String(row.original.observable)}
        </div>
      ),
    }

    const dynamicColumns = tableColumnKeys.map<ColumnDef<CategoryTableRow>>((columnKey) => ({
      accessorKey: columnKey,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={formatFieldKey(columnKey)} className="whitespace-nowrap" />
      ),
      cell: ({ row }) => toCategoryTableCell(columnKey, row.original[columnKey]),
    }))

    return [observableColumn, ...dynamicColumns]
  }, [tableColumnKeys])

  const filterFields = useMemo<DataTableFilterField<CategoryTableRow>[]>(() => {
    const fields: DataTableFilterField<CategoryTableRow>[] = []
    const candidateKeys = ["observable", ...tableColumnKeys]

    candidateKeys.forEach((key) => {
      if (
        key === "error" ||
        key.toLowerCase().includes("description") ||
        key.toLowerCase().includes("vector") ||
        key.toLowerCase().includes("image") ||
        key.toLowerCase().includes("screenshot")
      ) {
        return
      }

      const uniqueValues = Array.from(
        new Set(
          tableRows
            .map((row) => row[key])
            .filter((value) => value !== null && value !== undefined && value !== "")
            .map((value) => {
              if (typeof value === "number" || typeof value === "boolean") return String(value)
              if (typeof value === "string") {
                const trimmed = value.trim()
                if (!trimmed || trimmed.length > 80) return null
                return trimmed
              }
              return null
            })
            .filter((value): value is string => Boolean(value))
        )
      ).sort()

      if (uniqueValues.length === 0 || uniqueValues.length > 15) return

      fields.push({
        label: formatFieldKey(key),
        value: key as keyof CategoryTableRow,
        type: "checkbox",
        options: uniqueValues.map((value) => ({ label: value, value })),
      })
    })

    return fields
  }, [tableColumnKeys, tableRows])

  return (
    <DataTable
      columns={tableColumns}
      data={tableRows}
      sorting={sorting}
      onSortingChange={setSorting}
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      searchControl={(
        <Input
          placeholder="Search observable..."
          value={observableFilterValue}
          onChange={(event) => {
            const value = event.target.value
            setColumnFilters((prev) => {
              const rest = prev.filter((item) => item.id !== "observable")
              return value ? [...rest, { id: "observable", value }] : rest
            })
          }}
        />
      )}
      filterFields={filterFields}
      pageSizeOptions={[10, 20, 50]}
      tableClassName="w-max min-w-full"
    />
  )
}
