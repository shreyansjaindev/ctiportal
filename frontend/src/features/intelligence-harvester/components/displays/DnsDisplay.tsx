import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { FieldTable } from "./FieldTable"

interface DnsDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

// Common DNS record type ordering — superset used for both overview and detail
const DNS_RECORD_ORDER = ["a", "aaaa", "mx", "ns", "cname", "txt", "soa", "dmarc", "spf"]

function sortByDnsOrder(entries: [string, unknown][]) {
  return entries.sort(([a], [b]) => {
    const ia = DNS_RECORD_ORDER.indexOf(a.toLowerCase())
    const ib = DNS_RECORD_ORDER.indexOf(b.toLowerCase())
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
}

function formatDnsRecord(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return "—"
    return (
      <div className="space-y-1">
        {value.map((record, idx) => (
          <div
            key={idx}
            className="bg-muted px-2 py-1 rounded"
          >
            {typeof record === "object" && record !== null 
              ? JSON.stringify(record, null, 2)
              : String(record)}
          </div>
        ))}
      </div>
    )
  }

  if (value === null || value === undefined) return "—"
  if (value === "") return <span className="text-muted-foreground italic">Not Found</span>
  if (typeof value === "string" && value === "Not Found") {
    return <span className="text-muted-foreground italic">{value}</span>
  }
  
  if (typeof value === "object") {
    return <div className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</div>
  }

  return <div>{String(value)}</div>
}

export function DnsDisplay({ result, isOverview = false }: DnsDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  if (isOverview) {
    const essentialFields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )

    if (essentialFields.length === 0) return null

    const sorted = sortByDnsOrder(essentialFields)

    const dnsRows = sorted.map(([key, value]) => {
      const items = Array.isArray(value) ? value.map(String) : value === "" ? [] : [String(value)]
      return {
        label: key,
        value: items.length === 0 ? (
          <span className="text-muted-foreground italic">Not Found</span>
        ) : (
          <div className="space-y-0.5">
            {items.slice(0, 6).map((item, i) => <div key={i}>{item}</div>)}
            {items.length > 6 && <div className="text-muted-foreground text-xs">+{items.length - 6} more</div>}
          </div>
        ),
      }
    })
    return (
      <FieldTable
        rows={dnsRows}
        labelClassName="text-muted-foreground uppercase tracking-wide text-xs leading-5"
      />
    )
  }

  // Type-specific tab - grid layout with all DNS records
  const allFields = Object.entries({
    ...result.essential,
    ...result.additional
  }).filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No DNS records available.
      </div>
    )
  }

  const sorted = sortByDnsOrder(allFields)

  return (
    <FieldTable
      rows={sorted.map(([key, value]) => ({ label: key, value: formatDnsRecord(value) }))}
      labelClassName="text-muted-foreground uppercase tracking-wide text-xs leading-5"
    />
  )
}
