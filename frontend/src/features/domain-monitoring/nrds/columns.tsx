import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"

import type { NewlyRegisteredDomain } from "../types"

export const columns: ColumnDef<NewlyRegisteredDomain>[] = [
  {
    accessorKey: "value",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Domain"
        filterType="text"
        filterPlaceholder="Search domain…"
      />
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue("value")}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "source_date",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Source Date"
        filterType="text"
        filterPlaceholder="YYYY-MM-DD"
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("source_date")}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "created",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Created"
        filterType="text"
        filterPlaceholder="YYYY-MM-DD"
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.getValue("created")).toLocaleDateString()}
      </span>
    ),
    enableSorting: true,
  },
]
