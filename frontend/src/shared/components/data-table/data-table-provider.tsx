import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Table,
  VisibilityState,
} from "@tanstack/react-table"
import { createContext, useContext, useMemo } from "react"
import type { DataTableFilterField } from "./types"
import { ControlsProvider } from "@/shared/providers/controls"

interface DataTableStateContextType {
  columnFilters: ColumnFiltersState
  sorting: SortingState
  rowSelection: RowSelectionState
  columnOrder: string[]
  columnVisibility: VisibilityState
  pagination: PaginationState
  enableColumnOrdering: boolean
}

interface DataTableBaseContextType<TData = unknown, TValue = unknown> {
  table: Table<TData>
  columns: ColumnDef<TData, TValue>[]
  filterFields: DataTableFilterField<TData>[]
  isLoading?: boolean
  totalCount?: number
  getFacetedUniqueValues?: (
    table: Table<TData>,
    columnId: string,
  ) => Map<string, number> | undefined
}

interface DataTableContextType<TData = unknown, TValue = unknown>
  extends DataTableStateContextType,
    DataTableBaseContextType<TData, TValue> {}

export const DataTableContext = createContext<DataTableContextType<any, any> | null>(null)

export function DataTableProvider<TData, TValue>({
  children,
  ...props
}: Partial<DataTableStateContextType> &
  DataTableBaseContextType<TData, TValue> & {
    children: React.ReactNode
  }) {
  const value = useMemo(
    () => ({
      ...props,
      columnFilters: props.columnFilters ?? [],
      sorting: props.sorting ?? [],
      rowSelection: props.rowSelection ?? {},
      columnOrder: props.columnOrder ?? [],
      columnVisibility: props.columnVisibility ?? {},
      pagination: props.pagination ?? { pageIndex: 0, pageSize: 10 },
      enableColumnOrdering: props.enableColumnOrdering ?? false,
      filterFields: props.filterFields ?? [],
    }),
    [
      props.columnFilters,
      props.sorting,
      props.rowSelection,
      props.columnOrder,
      props.columnVisibility,
      props.pagination,
      props.table,
      props.columns,
      props.enableColumnOrdering,
      props.isLoading,
      props.totalCount,
      props.filterFields,
      props.getFacetedUniqueValues,
    ]
  )

  return (
    <DataTableContext.Provider value={value}>
      <ControlsProvider>
        {children}
      </ControlsProvider>
    </DataTableContext.Provider>
  )
}

export function useDataTable<TData, TValue>() {
  const context = useContext(DataTableContext)

  if (!context) {
    throw new Error("useDataTable must be used within a DataTableProvider")
  }

  return context as DataTableContextType<TData, TValue>
}
