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
    accessorKey: "potential_risk",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Risk"
        filterType="text"
        filterPlaceholder="low/medium/high"
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{(row.getValue("potential_risk") as string) || "—"}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Source"
        filterType="text"
        filterPlaceholder="Search source…"
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{(row.getValue("source") as string) || "—"}</span>
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
