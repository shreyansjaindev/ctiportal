import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

interface WhoisDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (value === "") return "Not Found"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return JSON.stringify(value, null, 2)
    }
    return value.join(", ")
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

const ESSENTIAL_WHOIS_FIELDS = ["domain", "registrar", "created_date", "expires_date", "status", "registrant_name"]

export function WhoisDisplay({ result, isOverview = false }: WhoisDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  if (isOverview) {
    // Overview tab - grid layout with better WHOIS presentation
    const essentialFields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )

    if (essentialFields.length === 0) return null

    // Sort by WHOIS field importance
    const sorted = essentialFields.sort(([keyA], [keyB]) => {
      const indexA = ESSENTIAL_WHOIS_FIELDS.indexOf(keyA)
      const indexB = ESSENTIAL_WHOIS_FIELDS.indexOf(keyB)
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    })

    return (
      <div className="grid auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map(([key, value]) => (
          <div key={key} className="rounded-lg border p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {key.replace(/_/g, " ")}
            </div>
            <div className="text-sm break-all whitespace-pre-wrap">
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Type-specific tab - all fields sorted by importance
  const allFields = Object.entries({
    ...result.essential,
    ...result.additional
  }).filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No WHOIS data available.
      </div>
    )
  }

  // Sort fields to show important ones first
  const sorted = allFields.sort(([keyA], [keyB]) => {
    const indexA = ESSENTIAL_WHOIS_FIELDS.indexOf(keyA)
    const indexB = ESSENTIAL_WHOIS_FIELDS.indexOf(keyB)
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
  })

  return (
    <div className="space-y-2">
      {sorted.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[200px_1fr] gap-4 text-sm py-2 border-b last:border-0">
          <div className="font-medium text-muted-foreground">
            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </div>
          <div className="text-sm break-all whitespace-pre-wrap">
            {formatValue(value)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default WhoisDisplay
