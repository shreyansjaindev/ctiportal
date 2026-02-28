import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { FieldTable } from "./FieldTable"

interface ReputationDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

// Detection stats: { malicious, suspicious, harmless, undetected, timeout }
function DetectionStats({ value }: { value: Record<string, number> }) {
  const ORDER = ["malicious", "suspicious", "harmless", "undetected", "timeout"] as const
  const COLOR: Record<string, string> = {
    malicious: "text-red-600 dark:text-red-400",
    suspicious: "text-orange-500 dark:text-orange-400",
    harmless: "text-green-600 dark:text-green-400",
    undetected: "text-muted-foreground",
    timeout: "text-muted-foreground",
  }
  const entries = ORDER.filter(k => k in value).map(k => [k, value[k]] as [string, number])
  // Fallback: include any keys not in ORDER
  Object.entries(value).forEach(([k, v]) => {
    if (!ORDER.includes(k as typeof ORDER[number])) entries.push([k, v])
  })
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(([k, v]) => (
        <span key={k}>
          <span className="capitalize">{k}:</span>
          {" "}
          <span className={COLOR[k] ?? ""}>{v}</span>
        </span>
      ))}
    </div>
  )
}

// Categories: { "ProviderName": "category label" }
function CategoryMap({ value }: { value: Record<string, string> }) {
  const entries = Object.entries(value)
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(([provider, cat]) => (
        <span key={provider}>
          <span>{provider}:</span>
          {" "}
          <span className="capitalize">{cat}</span>
        </span>
      ))}
    </div>
  )
}

// Generic array: stacked with "+N more"
function ArrayValue({ items, max = 5 }: { items: string[]; max?: number }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-col gap-0.5">
      {items.slice(0, max).map((item, i) => <span key={i}>{item}</span>)}
      {items.length > max && (
        <span className="text-muted-foreground">+{items.length - max} more</span>
      )}
    </div>
  )
}

// Popularity ranks: { "Alexa": { rank: N, timestamp: N }, ... }
function PopularityRanks({ value }: { value: Record<string, { rank: number }> }) {
  const entries = Object.entries(value)
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(([provider, data]) => (
        <span key={provider}>{provider}: <span className="font-medium">#{data?.rank}</span></span>
      ))}
    </div>
  )
}

// Render a field value with type-aware formatting
function FieldValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>

  // Detection stats object
  if (fieldKey === "last_analysis_stats" && typeof value === "object" && !Array.isArray(value)) {
    return <DetectionStats value={value as Record<string, number>} />
  }

  // Targeted brand: { brand: "PayPal", domain: "paypal.com" }
  if (fieldKey === "targeted_brand" && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, string>
    return <span>{v.brand ?? ""}{ v.domain ? ` (${v.domain})` : ""}</span>
  }

  // Categories object
  if (fieldKey === "categories" && typeof value === "object" && !Array.isArray(value)) {
    return <CategoryMap value={value as Record<string, string>} />
  }

  // Popularity ranks
  if (fieldKey === "popularity_ranks" && typeof value === "object" && !Array.isArray(value)) {
    return <PopularityRanks value={value as Record<string, { rank: number }>} />
  }

  // Any plain array of strings
  if (Array.isArray(value)) {
    return <ArrayValue items={value.map(String)} />
  }

  // Generic object → key/value (stringify nested values to avoid React child crash)
  if (typeof value === "object") {
    const safe = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v ?? "")])
    )
    return <CategoryMap value={safe} />
  }

  return <span>{String(value)}</span>
}

export function ReputationDisplay({ result, isOverview = false }: ReputationDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const fields = Object.entries({
    ...(isOverview ? result.essential : { ...result.essential, ...result.additional }),
  }).filter(([, v]) => v !== null && v !== undefined)

  if (fields.length === 0) {
    return <div className="text-sm text-muted-foreground">No reputation data available.</div>
  }

  return (
    <FieldTable
      rows={fields.map(([key, value]) => ({ label: key.replace(/_/g, " "), value: <FieldValue fieldKey={key} value={value} /> }))}
    />
  )
}
