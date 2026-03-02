import type { ColumnDef } from "@tanstack/react-table"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { FieldTable } from "./FieldTable"

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

const DATE_KEYS = ["started", "createdDate", "created_date", "updatedDate", "updated_date"]
const REGISTRAR_KEYS = ["registrarName", "registrar_name", "registrar"]
const END_KEYS = ["ended", "expiresDate", "expires_date"]

function pickField(row: HistoryRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key]
  }
  return null
}

export function WhoisHistoryDisplay({ result, isOverview = false }: WhoisHistoryDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const records = (result.essential?.records ?? result.additional?.records) as unknown
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

  if (isOverview) {
    const registrars = Array.from(
      new Set(rows.map(r => pickField(r, REGISTRAR_KEYS)).filter(Boolean).map(String))
    )
    const earliest = renderCellValue("started", pickField(rows.at(-1)!, DATE_KEYS))
    const latestEnd = renderCellValue("ended", pickField(rows[0], END_KEYS))

    const cards: { label: string; value: React.ReactNode }[] = [
      { label: "Records found", value: rows.length },
      { label: "Unique registrars", value: registrars.length || "—" },
      ...(String(earliest) !== "—" ? [{ label: "Earliest registration", value: earliest }] : []),
      ...(String(latestEnd) !== "—" ? [{ label: "Latest expiry", value: latestEnd }] : []),
      ...(registrars.length > 0 ? [{ label: "Registrars", value: registrars.slice(0, 3).join(", ") + (registrars.length > 3 ? ` +${registrars.length - 3} more` : "") }] : []),
    ]

    return <FieldTable rows={cards} />
  }

  return (
    <div className="space-y-2 px-6 py-4">
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
