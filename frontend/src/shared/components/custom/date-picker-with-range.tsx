"use client"

import type { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"

type DatePickerWithRangeProps = {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  className?: string
}

function formatCompactDateRange(date: DateRange | undefined): string {
  if (!date?.from) {
    return "Pick a date range"
  }

  if (!date.to) {
    return format(date.from, "dd MMM yyyy")
  }

  const sameYear = date.from.getFullYear() === date.to.getFullYear()

  if (sameYear) {
    return `${format(date.from, "dd MMM")}–${format(date.to, "dd MMM yyyy")}`
  }

  return `${format(date.from, "dd MMM yyyy")}–${format(date.to, "dd MMM yyyy")}`
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start truncate text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{formatCompactDateRange(date)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
