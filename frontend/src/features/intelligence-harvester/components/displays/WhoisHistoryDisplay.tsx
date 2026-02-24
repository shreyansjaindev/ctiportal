import type { ColumnDef } from "@tanstack/react-table"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

interface WhoisHistoryDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

type HistoryRecord = Record<string, unknown>

const PREFERRED_COLUMNS = [
  "domain",
  "fullDomain",
  "domain_name",
  "domainName",
  "registrar_name",
  "registrarName",
  "started",
  "ended",
  "created_date",
  "createdDate",
  "updated_date",
  "updatedDate",
  "expires_date",
  "expiresDate",
  "registrant_name",
  "registrant_email",
  "nameServers",
  "status",
  "contact",
]

function isLikelyTimestampField(key: string): boolean {
  const lowered = key.toLowerCase()
  return lowered.includes("date") || lowered.includes("time") || lowered.includes("started") || lowered.includes("ended")
}

function renderPrimitive(value: string | number | boolean | null): string {
  return value === null ? "—" : String(value)
}

function renderObject(label: string, value: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(value)
  if (entries.length === 0) return "—"

  const details = (
    <div className="space-y-1">
      {entries.map(([key, entryValue]) => (
        <div key={key} className="text-xs">
          <span className="font-medium">{key}:</span> {renderCellValue(key, entryValue)}
        </div>
      ))}
    </div>
  )

  if (entries.length <= 3) {
    return details
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground">
        {label}: View details ({entries.length} fields)
      </summary>
      <div className="mt-2">{details}</div>
    </details>
  )
}

function renderArray(label: string, items: unknown[]): React.ReactNode {
  if (items.length === 0) return "—"

  const list = (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li key={index} className="text-xs">
          {renderCellValue(String(index), item)}
        </li>
      ))}
    </ul>
  )

  if (items.length <= 3) {
    return list
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground">
        {label}: View details ({items.length} items)
      </summary>
      <div className="mt-2">{list}</div>
    </details>
  )
}

function renderCellValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—"

  if (typeof value === "number" && isLikelyTimestampField(key) && value > 1_000_000_000_000) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().split("T")[0]
  }

  if (typeof value === "string") {
    const trimmed = value.trim()

    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (Array.isArray(parsed)) return renderArray(key, parsed)
        if (parsed && typeof parsed === "object") return renderObject(key, parsed as Record<string, unknown>)
      } catch {
        return trimmed
      }
    }

    return trimmed
  }

  if (typeof value === "boolean") return renderPrimitive(value)
  if (Array.isArray(value)) return renderArray(key, value)
  if (typeof value === "object") return renderObject(key, value as Record<string, unknown>)
  return String(value)
}

function isHistoryRecords(value: unknown): value is HistoryRecord[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object")
}

export function WhoisHistoryDisplay({ result }: WhoisHistoryDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const records = (result.additional?.records ?? result.essential?.records) as unknown
  const rows = isHistoryRecords(records) ? records : []

  const discovered = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key))
      return keys
    }, new Set<string>())
  )

  const ordered = [
    ...PREFERRED_COLUMNS.filter((key) => discovered.includes(key)),
    ...discovered.filter((key) => !PREFERRED_COLUMNS.includes(key)),
  ]

  const columns: ColumnDef<HistoryRecord>[] = ordered.map((key) => ({
    accessorKey: key,
    header: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    cell: ({ row }) => {
      const formatted = renderCellValue(key, row.original[key])
      return (
        <div className="whitespace-normal break-words">
          {formatted}
        </div>
      )
    },
  }))

  if (rows.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No WHOIS history records available.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Showing {rows.length} WHOIS history record{rows.length === 1 ? "" : "s"}
      </div>
      <DataTable
        columns={columns}
        data={rows}
        pageSizeOptions={[10, 20, 50]}
        filterFields={[]}
        tableClassName="w-full table-fixed"
      />
    </div>
  )
}

export default WhoisHistoryDisplay
