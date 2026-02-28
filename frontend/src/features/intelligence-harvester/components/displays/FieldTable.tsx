import React from "react"

interface FieldTableProps {
  rows: { label: string; value: React.ReactNode }[]
  /** Override label span className; defaults to "text-muted-foreground" */
  labelClassName?: string
}

export function FieldTable({ rows, labelClassName }: FieldTableProps) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 text-sm">
      {rows.map(({ label, value }, i) => (
        <React.Fragment key={`${label}-${i}`}>
          <div className={`py-1 ${i < rows.length - 1 ? "border-b" : ""} ${labelClassName ?? "text-muted-foreground"}`}>
            {label}
          </div>
          <div className={`py-1 min-w-0 ${i < rows.length - 1 ? "border-b" : ""}`}>
            {value}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
