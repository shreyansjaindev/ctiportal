"use client"

import { useState, useCallback } from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type Table,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { cn } from "@/shared/lib/utils"

import { DataTableProvider } from "./data-table-provider"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTableFilterControls } from "./data-table-filter-controls"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableResetButton } from "./data-table-reset-button"
import type { DataTableFilterField } from "./types"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  searchControl?: React.ReactNode
  toolbarControls?: React.ReactNode
  rightToolbarControls?: React.ReactNode
  /** @deprecated Use pagination + onPaginationChange instead */
  rowsControl?: React.ReactNode
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  pageCount?: number
  pageSizeOptions?: number[]
  /** Total number of rows on the server (for manual pagination mode) */
  totalCount?: number
  filterFields?: DataTableFilterField<TData>[]
  enableRowSelection?: boolean
  selectedRowIds?: Set<number>
  onSelectedRowIdsChange?: React.Dispatch<React.SetStateAction<Set<number>>>
  rowIdAccessor?: (row: TData) => number
  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  searchControl,
  toolbarControls,
  rightToolbarControls,
  rowsControl,
  pagination,
  onPaginationChange,
  pageCount,
  pageSizeOptions,
  totalCount,
  filterFields = [],
  enableRowSelection = false,
  selectedRowIds,
  onSelectedRowIdsChange,
  rowIdAccessor,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  // Custom getFacetedUniqueValues that handles array values
  const customGetFacetedUniqueValues = useCallback(
    (table: Table<TData>, columnId: string) => () => {
      const facets = getFacetedUniqueValues<TData>()(table, columnId)()
      const customFacets = new Map()
      for (const [key, value] of facets as any) {
        if (Array.isArray(key)) {
          for (const k of key) {
            const prevValue = customFacets.get(k) || 0
            customFacets.set(k, prevValue + value)
          }
        } else {
          const prevValue = customFacets.get(key) || 0
          customFacets.set(key, prevValue + value)
        }
      }
      return customFacets
    },
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: customGetFacetedUniqueValues,
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualSorting: !!onSortingChange,
    onSortingChange,
    manualFiltering: !!onColumnFiltersChange,
    onColumnFiltersChange,
    manualPagination: !!onPaginationChange,
    onPaginationChange,
    pageCount: onPaginationChange ? (pageCount ?? -1) : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    state: {
      ...(onSortingChange ? { sorting: sorting ?? [] } : {}),
      ...(onColumnFiltersChange ? { columnFilters: columnFilters ?? [] } : {}),
      ...(onPaginationChange ? { pagination: pagination ?? { pageIndex: 0, pageSize: 25 } } : {}),
      columnVisibility,
      columnOrder,
    },
    enableFilters: true,
    enableColumnFilters: true,
  })

  // Wrapper function for the provider (different signature)
  const getFacetedUniqueValuesForProvider = useCallback(
    (table: Table<TData>, columnId: string): Map<string, number> => {
      return customGetFacetedUniqueValues(table, columnId)()
    },
    [customGetFacetedUniqueValues]
  )

  const selectable =
    enableRowSelection &&
    !!selectedRowIds &&
    !!onSelectedRowIdsChange &&
    !!rowIdAccessor

  const pageRows = table.getRowModel().rows
  const pageRowIds = selectable ? pageRows.map((row) => rowIdAccessor(row.original)) : []
  const allPageSelected =
    selectable && pageRowIds.length > 0 && pageRowIds.every((id) => selectedRowIds.has(id))
  const somePageSelected =
    selectable && pageRowIds.some((id) => selectedRowIds.has(id)) && !allPageSelected

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      columnFilters={columnFilters ?? []}
      sorting={sorting ?? []}
      columnOrder={columnOrder}
      columnVisibility={columnVisibility}
      enableColumnOrdering
      filterFields={filterFields}
      isLoading={isLoading}
      totalCount={onPaginationChange ? totalCount : undefined}
      getFacetedUniqueValues={getFacetedUniqueValuesForProvider}
      pagination={onPaginationChange ? (pagination ?? { pageIndex: 0, pageSize: 25 }) : undefined}
    >
      <div className="flex h-full w-full flex-col sm:flex-row">
        <div
          className={cn(
            "hidden h-full w-full flex-col sm:sticky sm:top-0 sm:flex sm:min-h-screen sm:min-w-52 sm:max-w-52 sm:self-start md:min-w-64 md:max-w-64",
            "group-data-[expanded=false]/controls:hidden",
          )}
        >
          <div className="border-b border-border bg-background p-2">
            <div className="flex h-[46px] items-center justify-between gap-3">
              <p className="px-2 font-medium text-foreground">Filters</p>
              <div>
                {table.getState().columnFilters.length ? (
                  <DataTableResetButton />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex-1 p-2">
            <DataTableFilterControls />
          </div>
        </div>
        <div className="flex max-w-full flex-1 flex-col overflow-hidden border-border sm:border-l">
          <div className="flex flex-col gap-4 bg-background p-2">
            {searchControl && <div className="w-full">{searchControl}</div>}
            <DataTableToolbar
              renderActions={() => (
                <div className="flex flex-wrap items-center gap-2">
                  {toolbarControls}
                  {rightToolbarControls}
                </div>
              )}
            />
          </div>
          <div className="z-0">
            <TableComponent className="border-separate border-spacing-0">
              <TableHeader className="sticky top-0 z-20 bg-background">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50 [&>*]:border-t [&>:not(:last-child)]:border-r">
                    {selectable ? (
                      <TableHead className="border-b border-border">
                        <Checkbox
                          checked={allPageSelected || (somePageSelected && "indeterminate")}
                          onCheckedChange={(value) => {
                            if (!selectable) return
                            if (value) {
                              onSelectedRowIdsChange(new Set(pageRowIds))
                            } else {
                              onSelectedRowIdsChange(new Set())
                            }
                          }}
                          aria-label="Select all"
                        />
                      </TableHead>
                    ) : null}
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="border-b border-border">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="[&>:not(:last-child)]:border-r">
                      {selectable ? (
                        <TableCell className="border-b border-border">
                          <Checkbox
                            checked={selectedRowIds.has(rowIdAccessor(row.original))}
                            onCheckedChange={() => {
                              if (!selectable) return
                              const rowId = rowIdAccessor(row.original)
                              onSelectedRowIdsChange((prev) => {
                                const next = new Set(prev)
                                if (next.has(rowId)) {
                                  next.delete(rowId)
                                } else {
                                  next.add(rowId)
                                }
                                return next
                              })
                            }}
                            aria-label={`Select row ${row.id}`}
                          />
                        </TableCell>
                      ) : null}
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="border-b border-border">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-24 text-center border-b border-border">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </TableComponent>
          </div>
          {onPaginationChange
            ? <DataTablePagination pageSizeOptions={pageSizeOptions} />
            : rowsControl}
        </div>
      </div>
    </DataTableProvider>
  )
}
