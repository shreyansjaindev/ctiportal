import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"

import type { MonitoredDomain } from "../types"

export const columns: ColumnDef<MonitoredDomain>[] = [
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
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Status"
        filterType="text"
        filterPlaceholder="Search status…"
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("status")}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "company",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Company"
        filterType="text"
        filterPlaceholder="Search company…"
      />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("company")}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "last_checked",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Last Checked"
        filterType="text"
        filterPlaceholder="YYYY-MM-DD"
      />
    ),
    cell: ({ row }) => {
      const value = row.getValue("last_checked") as string | null
      return (
        <span className="text-muted-foreground">
          {value ? new Date(value).toLocaleDateString() : "-"}
        </span>
      )
    },
    enableSorting: true,
  },
]
