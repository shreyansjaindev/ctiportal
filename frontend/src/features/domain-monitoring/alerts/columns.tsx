import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"

import type { MonitoredDomainAlert } from "../types"

export const columns: ColumnDef<MonitoredDomainAlert>[] = [
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
    accessorKey: "domain_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Domain"
        filterType="text"
        filterPlaceholder="Search domain…"
      />
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue("domain_name")}</span>,
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
]
