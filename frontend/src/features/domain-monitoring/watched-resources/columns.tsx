import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"

import type { WatchedResource } from "../types"
import {
  WATCHED_TYPES,
  WATCHED_STATUS,
  getTypeVariant,
  getWatchedStatusVariant,
} from "./constants"

interface GetColumnsOptions {
  onEdit: (row: WatchedResource) => void
  onDelete: (id: number) => void
}

export function getColumns({
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<WatchedResource>[] {
  return [
    {
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Value"
          filterType="text"
          filterPlaceholder="Search value…"
        />
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("value")}</span>,
      enableSorting: true,
    },
    {
      accessorKey: "resource_type",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Type"
          filterType="select"
          filterAllLabel="All types"
          filterOptions={WATCHED_TYPES.map((t) => ({ label: t, value: t }))}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={getTypeVariant(row.getValue("resource_type"))}>
          {row.getValue("resource_type")}
        </Badge>
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
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Status"
          filterType="select"
          filterAllLabel="All status"
          filterOptions={WATCHED_STATUS.map((s) => ({ label: s, value: s }))}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={getWatchedStatusVariant(row.getValue("status"))}>
          {row.getValue("status")}
        </Badge>
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
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!window.confirm("Delete this watched resource?")) return
                onDelete(row.original.id)
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
