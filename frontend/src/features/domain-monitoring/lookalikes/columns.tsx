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

import type { LookalikeDomain } from "../types"
import { LOOKALIKE_STATUS_OPTIONS } from "../constants"
import { LOOKALIKE_RISK_OPTIONS, getLookalikeStatusVariant, getRiskVariant } from "./constants"

interface GetColumnsOptions {
  onEdit: (row: LookalikeDomain) => void
  onDelete: (id: number) => void
}

export function getColumns({ onEdit, onDelete }: GetColumnsOptions): ColumnDef<LookalikeDomain>[] {
  return [
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
        <span className="text-muted-foreground">
          {new Date(row.getValue("source_date")).toLocaleDateString()}
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
        <span className="text-muted-foreground">{row.getValue("source")}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "watched_resource",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Watched Resource"
          filterType="text"
          filterPlaceholder="Search watched resource…"
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("watched_resource")}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "potential_risk",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Risk"
          filterType="select"
          filterAllLabel="All risk"
          filterOptions={LOOKALIKE_RISK_OPTIONS.map((r) => ({ label: r, value: r }))}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={getRiskVariant(row.getValue("potential_risk"))}>
          {row.getValue("potential_risk")}
        </Badge>
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
          filterOptions={LOOKALIKE_STATUS_OPTIONS}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={getLookalikeStatusVariant(row.getValue("status"))}>
          {row.getValue("status")}
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
                if (!window.confirm("Delete this lookalike domain?")) return
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
