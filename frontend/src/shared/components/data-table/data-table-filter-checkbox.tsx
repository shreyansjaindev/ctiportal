"use client";

import { useDataTable } from "@/shared/components/data-table/data-table-provider";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn, formatCompactNumber } from "@/shared/lib";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import type { DataTableCheckboxFilterField } from "./types";

export function DataTableFilterCheckbox<TData>({
  value: _value,
  options,
  component,
}: DataTableCheckboxFilterField<TData>) {
  const value = _value as string;
  const [inputValue, setInputValue] = useState("");
  const { table, columnFilters, isLoading, getFacetedUniqueValues } =
    useDataTable();
  const column = table.getColumn(value);
  const filterValue = columnFilters.find((i) => i.id === value)?.value;
  const facetedValue =
    getFacetedUniqueValues?.(table, value) || column?.getFacetedUniqueValues();

  const Component = component;

  const resolvedOptions = options ??
    Array.from(facetedValue?.entries?.() ?? [])
      .map(([optionValue]) => ({
        label: String(optionValue),
        value: optionValue,
      }))
      .filter((option) => option.label.trim() !== "");

  const filterOptions = resolvedOptions?.filter(
    (option) =>
      inputValue === "" ||
      option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const filters = filterValue
    ? Array.isArray(filterValue)
      ? filterValue
      : [filterValue]
    : [];

  if (isLoading && !filterOptions?.length)
    return (
      <div className="grid divide-y rounded-lg border border-border">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-2 px-2 py-2"
          >
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-full rounded-sm" />
          </div>
        ))}
      </div>
    );

  return (
    <div className="grid gap-2">
      {resolvedOptions && resolvedOptions.length > 4 ? (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      ) : null}
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border empty:border-none">
        {filterOptions
          ?.map((option, index) => {
            const checked = filters.includes(option.value);

            return (
              <div
                key={String(option.value)}
                className={cn(
                  "group flex items-center space-x-2 px-2 py-1 hover:bg-accent/50",
                  index !== filterOptions.length - 1 ? "border-b" : undefined,
                )}
              >
                <Checkbox
                  id={`${value}-${option.value}`}
                  checked={checked}
                  onCheckedChange={(checked) => {
                    const newValue = checked
                      ? [...(filters || []), option.value]
                      : filters?.filter((v) => option.value !== v);
                    column?.setFilterValue(
                      newValue?.length ? newValue : undefined,
                    );
                  }}
                />
                <Label
                  htmlFor={`${value}-${option.value}`}
                  className="flex w-full items-center justify-between gap-1 truncate text-foreground/70 group-hover:text-accent-foreground leading-normal"
                >
                  {Component ? (
                    <Component {...option} />
                  ) : (
                    <span className="truncate font-normal">{option.label}</span>
                  )}
                  <span className="ml-auto flex shrink-0 items-center justify-center font-mono text-xs">
                    {isLoading ? (
                      <Skeleton className="h-4 w-4" />
                    ) : facetedValue?.has(option.value) ? (
                      formatCompactNumber(facetedValue.get(option.value) || 0)
                    ) : null}
                  </span>
                </Label>
              </div>
            );
          })}
      </div>
    </div>
  );
}
