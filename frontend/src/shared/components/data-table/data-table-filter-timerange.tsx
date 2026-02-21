"use client"

import { useMemo } from "react"
import type { DateRange } from "react-day-picker"

import { DatePickerWithRange } from "@/shared/components/custom/date-picker-with-range"
import { useDataTable } from "@/shared/components/data-table/data-table-provider"
import { Button } from "@/shared/components/ui/button"
import type { DataTableTimerangeFilterField } from "./types"

function toDateOnlyString(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

export function DataTableFilterTimerange<TData>({
  value: _value,
}: DataTableTimerangeFilterField<TData>) {
  const value = _value as string
  const { table, columnFilters } = useDataTable()
  const column = table.getColumn(value)
  const filterValue = columnFilters.find((i) => i.id === value)?.value

  const date: DateRange | undefined = useMemo(() => {
    if (!Array.isArray(filterValue) || filterValue.length === 0) {
      return undefined
    }

    const [from, to] = filterValue
    const fromDate = typeof from === "string" ? new Date(from) : undefined
    const toDate = typeof to === "string" ? new Date(to) : undefined

    if (!fromDate || Number.isNaN(fromDate.getTime())) {
      return undefined
    }

    if (toDate && !Number.isNaN(toDate.getTime())) {
      return { from: fromDate, to: toDate }
    }

    return { from: fromDate, to: undefined }
  }, [filterValue])

  const setDate = (nextDate: DateRange | undefined) => {
    if (!nextDate?.from) {
      column?.setFilterValue(undefined)
      return
    }

    if (nextDate.from && !nextDate.to) {
      column?.setFilterValue([toDateOnlyString(nextDate.from)])
      return
    }

    if (nextDate.from && nextDate.to) {
      column?.setFilterValue([
        toDateOnlyString(nextDate.from),
        toDateOnlyString(nextDate.to),
      ])
    }
  }

  return (
    <div className="grid gap-2">
      <DatePickerWithRange date={date} setDate={setDate} />
      {filterValue ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            column?.setFilterValue(undefined)
          }}
        >
          Clear
        </Button>
      ) : null}
    </div>
  )
}
