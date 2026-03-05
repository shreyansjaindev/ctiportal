"use client"

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
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
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { X } from "lucide-react"

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import { DataTableProvider } from "./data-table-provider"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTableFilterControls } from "./data-table-filter-controls"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableResetButton } from "./data-table-reset-button"
import type { DataTableFilterField } from "./types"

type DataTableDetailSelection<TData> = {
  row: TData
  rowIndex: number
  columnId?: string
  cellValue?: unknown
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  searchControl?: ReactNode
  toolbarControls?: ReactNode
  rightToolbarControls?: ReactNode
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
  /** Enable server-side processing (default: false = client-side) */
  serverSide?: boolean
  /** Optional class override for the internal table element */
  tableClassName?: string
  /** Expand table region to consume most of the viewport height */
  fillViewport?: boolean
  detailView?: {
    mode?: "row" | "cell" | "both"
    triggerColumnIds?: string[]
    title?: string
    getTitle?: (selection: DataTableDetailSelection<TData> | null) => string
    emptyState?: ReactNode
    className?: string
    render: (selection: DataTableDetailSelection<TData>) => ReactNode
  }
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
  serverSide = false,
  tableClassName,
  fillViewport = false,
  detailView,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeOptions?.[0] ?? 10,
  })
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([])
  const [detailSelection, setDetailSelection] = useState<DataTableDetailSelection<TData> | null>(null)
  const [overlayRoot, setOverlayRoot] = useState<HTMLElement | null>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const [topBarHeight, setTopBarHeight] = useState(0)

  useEffect(() => {
    const node = topBarRef.current
    if (!node) return

    const observer = new ResizeObserver(() => {
      setTopBarHeight(node.getBoundingClientRect().height)
    })

    observer.observe(node)
    setTopBarHeight(node.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setOverlayRoot(document.getElementById("app-content-overlay-root"))
  }, [])

  // Custom getFacetedUniqueValues that handles array values
  const customGetFacetedUniqueValues = useCallback(
    (table: Table<TData>, columnId: string) => () => {
      const facets = getFacetedUniqueValues<TData>()(table, columnId)()
      const customFacets = new Map<string, number>()
      for (const [key, value] of facets.entries()) {
        if (Array.isArray(key)) {
          for (const k of key) {
            const stringKey = String(k)
            const prevValue = customFacets.get(stringKey) || 0
            customFacets.set(stringKey, prevValue + (value as number))
          }
        } else {
          const stringKey = String(key)
          const prevValue = customFacets.get(stringKey) || 0
          customFacets.set(stringKey, prevValue + (value as number))
        }
      }
      return customFacets
    },
    []
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: customGetFacetedUniqueValues,
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    // Client-side processing (automatic)
    getSortedRowModel: serverSide ? undefined : getSortedRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    // Server-side processing (manual)
    manualSorting: serverSide,
    onSortingChange,
    manualFiltering: serverSide,
    onColumnFiltersChange: serverSide ? onColumnFiltersChange : setInternalColumnFilters,
    manualPagination: serverSide,
    onPaginationChange: serverSide ? onPaginationChange : setInternalPagination,
    pageCount: serverSide ? (pageCount ?? -1) : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    initialState: {
      pagination: { pageIndex: 0, pageSize: pageSizeOptions?.[0] ?? 10 },
    },
    state: {
      ...(onSortingChange ? { sorting: sorting ?? [] } : {}),
      columnFilters: serverSide && onColumnFiltersChange ? (columnFilters ?? []) : internalColumnFilters,
      pagination: serverSide && onPaginationChange ? (pagination ?? { pageIndex: 0, pageSize: 25 }) : internalPagination,
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
  const detailMode = detailView?.mode ?? "row"
  const rowDetailEnabled = detailMode === "row" || detailMode === "both"
  const cellDetailEnabled = detailMode === "cell" || detailMode === "both"
  const detailTriggerColumnIds = detailView?.triggerColumnIds

  const pageRows = table.getRowModel().rows
  const pageRowIds = selectable ? pageRows.map((row) => rowIdAccessor(row.original)) : []
  const allPageSelected =
    selectable && pageRowIds.length > 0 && pageRowIds.every((id) => selectedRowIds.has(id))
  const somePageSelected =
    selectable && pageRowIds.some((id) => selectedRowIds.has(id)) && !allPageSelected

  function hasActiveTextSelection() {
    const selection = window.getSelection()
    return !!selection && selection.type === "Range" && selection.toString().trim().length > 0
  }

  const detailOverlay =
    detailView && overlayRoot
      ? createPortal(
          <div
            className={cn(
              "pointer-events-auto absolute inset-0 bg-background transition-transform duration-200 ease-out",
              detailSelection ? "translate-x-0" : "translate-x-full",
              detailView.className
            )}
            aria-hidden={!detailSelection}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="font-medium text-foreground">
                  {detailView.getTitle?.(detailSelection) ?? detailView.title ?? "Details"}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDetailSelection(null)}
                  aria-label="Close details"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {detailSelection
                  ? detailView.render(detailSelection)
                  : (detailView.emptyState ?? (
                      <p className="text-sm text-muted-foreground">
                        Select a row or cell to view details.
                      </p>
                    ))}
              </div>
            </div>
          </div>,
          overlayRoot
        )
      : null

  return (
    <>
      <DataTableProvider
        table={table}
        columns={columns}
        columnFilters={serverSide && onColumnFiltersChange ? (columnFilters ?? []) : internalColumnFilters}
        sorting={sorting ?? []}
        columnOrder={columnOrder}
        columnVisibility={columnVisibility}
        enableColumnOrdering
        filterFields={filterFields}
        isLoading={isLoading}
        totalCount={serverSide ? totalCount : undefined}
        getFacetedUniqueValues={getFacetedUniqueValuesForProvider}
        pagination={serverSide
          ? (pagination ?? { pageIndex: 0, pageSize: 25 })
          : (pageSizeOptions ? table.getState().pagination : undefined)
        }
      >
        <div
          className={cn(
            "flex h-full w-full min-h-0 flex-col overflow-hidden sm:flex-row",
            fillViewport && "flex-1"
          )}
          style={
            {
              "--top-bar-height": `${topBarHeight}px`,
            } as React.CSSProperties
          }
        >
          {filterFields && filterFields.length > 0 && (
          <div
            className={cn(
              "hidden h-full w-full shrink-0 flex-col sm:sticky sm:top-0 sm:flex sm:self-start sm:max-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-3.5rem)] sm:min-w-52 sm:max-w-52 md:min-w-64 md:max-w-64",
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
            <div className="flex-1 p-2 sm:overflow-y-auto">
              <DataTableFilterControls />
            </div>
          </div>
          )}
          <div
            className={cn(
              "relative flex max-w-full flex-1 flex-col",
              filterFields.length > 0 && "border-border sm:border-l"
            )}
          >
            <div
              ref={topBarRef}
              className="sticky top-0 z-10 flex shrink-0 flex-col gap-4 bg-background p-2 pb-4"
            >
              {searchControl && <div className="w-full">{searchControl}</div>}
              <DataTableToolbar
                hasFilters={filterFields && filterFields.length > 0}
                renderActions={() => (
                  <div className="flex flex-wrap items-center gap-2">
                    {toolbarControls}
                    {rightToolbarControls}
                    {(pageSizeOptions || onPaginationChange) && (
                      <DataTablePagination pageSizeOptions={pageSizeOptions} />
                    )}
                  </div>
                )}
              />
            </div>
            <div className="z-0 flex-1 min-h-0">
              <div
                className="h-full w-full overflow-auto"
                style={{ maxHeight: `calc(100dvh - 3.5rem - ${topBarHeight}px)` }}
              >
                <table
                  className={cn(
                    "w-full border-separate border-spacing-0 caption-bottom text-sm",
                    tableClassName
                  )}
                >
                  <TableHeader className="sticky top-0 z-20 bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="bg-muted/50 hover:bg-muted/50 [&>*]:border-t [&>:not(:last-child)]:border-r"
                    >
                      {selectable ? (
                        <TableHead className="border-b border-border bg-muted/50">
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
                        <TableHead
                          key={header.id}
                          className="border-b border-border bg-muted/50"
                        >
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
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "[&>:not(:last-child)]:border-r",
                          rowDetailEnabled && "cursor-pointer"
                        )}
                        onClick={rowDetailEnabled ? () => {
                          if (hasActiveTextSelection()) return
                          setDetailSelection({
                            row: row.original,
                            rowIndex: row.index,
                          })
                        } : undefined}
                      >
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
                          (() => {
                            const isDetailCell =
                              cellDetailEnabled
                              && (!detailTriggerColumnIds || detailTriggerColumnIds.includes(cell.column.id))

                            return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "border-b border-border",
                              isDetailCell && "cursor-pointer"
                            )}
                            onClick={isDetailCell ? (event) => {
                              if (hasActiveTextSelection()) return
                              event.stopPropagation()
                              setDetailSelection({
                                row: row.original,
                                rowIndex: row.index,
                                columnId: cell.column.id,
                                cellValue: cell.getValue(),
                              })
                            } : undefined}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                            )
                          })()
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
                </table>
              </div>
            </div>
          </div>
        </div>
      </DataTableProvider>
      {detailOverlay}
    </>
  )
}
