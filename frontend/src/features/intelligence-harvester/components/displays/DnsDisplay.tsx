import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

interface DnsDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

function formatDnsRecord(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return "—"
    return (
      <div className="space-y-1">
        {value.map((record, idx) => (
          <div
            key={idx}
            className="bg-muted px-2 py-1 rounded text-sm"
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
    return <div className="text-sm whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</div>
  }

  return <div className="text-sm">{String(value)}</div>
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
    // Overview tab - grid layout for essential DNS records
    const essentialFields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )

    if (essentialFields.length === 0) return null

    const dnsRecordOrder = ["a", "aaaa", "mx", "ns", "cname", "txt", "soa"]

    // Sort records by common DNS order
    const sorted = essentialFields.sort(
      ([keyA], [keyB]) => {
        const indexA = dnsRecordOrder.indexOf(keyA.toLowerCase())
        const indexB = dnsRecordOrder.indexOf(keyB.toLowerCase())
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
      }
    )

    return (
      <div className="grid auto-rows-min grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map(([key, value]) => (
          <div key={key} className="rounded-lg border p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {key.toUpperCase()} Records
            </div>
            <div className="space-y-1">
              {Array.isArray(value) ? (
                value.length > 0 ? (
                  value.map((record, idx) => (
                    <div
                      key={idx}
                      className="bg-muted px-2 py-1 rounded break-all text-sm"
                    >
                      {String(record)}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">Not Found</span>
                )
              ) : (
                <span className={typeof value === "string" && (value === "Not Found" || value === "") ? "text-sm text-muted-foreground italic" : "text-sm"}>
                  {value === "" ? "Not Found" : String(value)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
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

  const dnsRecordOrder = ["a", "aaaa", "mx", "ns", "cname", "txt", "soa", "dmarc", "spf"]

  // Sort all records by DNS type order
  const sorted = allFields.sort(([keyA], [keyB]) => {
    const indexA = dnsRecordOrder.indexOf(keyA.toLowerCase())
    const indexB = dnsRecordOrder.indexOf(keyB.toLowerCase())
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
  })

  return (
    <div className="grid auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map(([key, value]) => (
        <div key={key} className="rounded-lg border p-4">
          <div className="font-medium text-sm mb-3 text-foreground">
            {key.toUpperCase()} Records
          </div>
          <div>
            {formatDnsRecord(value)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default DnsDisplay
