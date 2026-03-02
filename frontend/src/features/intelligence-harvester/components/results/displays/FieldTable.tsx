import React from "react"

import { formatFieldLabel } from "./display-utils"

interface FieldTableProps {
  rows: { label: string; value: React.ReactNode }[]
  /** Override label span className; defaults to "text-muted-foreground" */
  labelClassName?: string
}

export function FieldTable({ rows, labelClassName }: FieldTableProps) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
      {rows.map(({ label, value }, i) => (
        <React.Fragment key={`${label}-${i}`}>
          <div className={`py-2 ${i < rows.length - 1 ? "border-b" : ""} ${labelClassName ?? "text-muted-foreground"}`}>
            {formatFieldLabel(label)}
          </div>
          <div className={`py-2 min-w-0 ${i < rows.length - 1 ? "border-b" : ""}`}>
            {value}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
