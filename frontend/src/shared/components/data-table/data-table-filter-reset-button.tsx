"use client";

import { useDataTable } from "@/shared/components/data-table/data-table-provider";
import { X } from "lucide-react";
import type { DataTableFilterField } from "./types";

export function DataTableFilterResetButton<TData>({
  value: _value,
}: DataTableFilterField<TData>) {
  const { columnFilters, table } = useDataTable();
  const value = _value as string;
  const column = table.getColumn(value);
  const filterValue = columnFilters.find((f) => f.id === value)?.value;

  const filters = filterValue
    ? Array.isArray(filterValue)
      ? filterValue
      : [filterValue]
    : [];

  if (filters.length === 0) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      className="h-5 rounded-full border border-input bg-background px-1.5 py-1 font-mono text-[10px] hover:bg-accent hover:text-accent-foreground cursor-pointer inline-flex items-center"
      onClick={(e) => {
        e.stopPropagation();
        column?.setFilterValue(undefined);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.code === "Enter") {
          column?.setFilterValue(undefined);
        }
      }}
    >
      <span>{filters.length}</span>
      <X className="ml-1 h-2.5 w-2.5 text-muted-foreground" />
    </div>
  );
}
