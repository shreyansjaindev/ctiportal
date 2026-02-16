import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Badge } from "@/shared/components/ui/badge"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

interface ReputationDisplayProps {
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

function getScoreColor(score: number | string): string {
  const numScore = typeof score === "string" ? parseFloat(score) : score
  if (isNaN(numScore)) return "bg-gray-100 dark:bg-gray-900"
  if (numScore >= 75) return "bg-red-100 dark:bg-red-950" // High risk
  if (numScore >= 50) return "bg-orange-100 dark:bg-orange-950" // Medium risk
  if (numScore >= 25) return "bg-yellow-100 dark:bg-yellow-950" // Low risk
  return "bg-green-100 dark:bg-green-950" // Safe
}

function getRiskBadgeVariant(
  value: unknown
): "default" | "secondary" | "destructive" | "outline" {
  if (typeof value === "boolean") {
    return value ? "destructive" : "secondary"
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase()
    if (lower === "malicious" || lower === "high" || lower === "critical") return "destructive"
    if (lower === "suspicious" || lower === "medium") return "outline"
    if (lower === "safe" || lower === "low" || lower === "benign") return "secondary"
  }
  return "default"
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

  if (isOverview) {
    // Overview tab - highlight risk scores
    const essentialFields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )

    if (essentialFields.length === 0) return null

    // Sort to put risk indicators first
    const sorted = essentialFields.sort(([keyA], [keyB]) => {
      const riskKeys = ["risk_level", "is_malicious", "threat_score", "abuse_confidence_score", "score"]
      const indexA = riskKeys.some(k => keyA.includes(k)) ? 0 : 1
      const indexB = riskKeys.some(k => keyB.includes(k)) ? 0 : 1
      return indexA - indexB
    })

    return (
      <div className="grid auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map(([key, value]) => {
          const isRiskMetric = ["risk_level", "is_malicious", "threat_score", "abuse_confidence_score", "score"].some(k => key.includes(k))
          const scoreColor = isRiskMetric && (typeof value === "string" || typeof value === "number") ? getScoreColor(value) : ""

          return (
            <div
              key={key}
              className={`rounded-lg border p-3 ${isRiskMetric ? scoreColor : ""}`}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {key.replace(/_/g, " ")}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {formatValue(value)}
                </div>
                {isRiskMetric && (
                  <Badge variant={getRiskBadgeVariant(value)} className="ml-2">
                    {typeof value === "boolean" ? (value ? "Risk" : "Safe") : ""}
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Type-specific tab - all fields sorted with risk indicators first
  const allFields = Object.entries({
    ...result.essential,
    ...result.additional
  }).filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No reputation data available.
      </div>
    )
  }

  // Sort to put risk indicators first
  const riskKeys = ["risk_level", "is_malicious", "threat_score", "abuse_confidence_score"]
  const sorted = allFields.sort(([keyA], [keyB]) => {
    const isRiskA = riskKeys.some(k => keyA.includes(k))
    const isRiskB = riskKeys.some(k => keyB.includes(k))
    if (isRiskA && !isRiskB) return -1
    if (!isRiskA && isRiskB) return 1
    return 0
  })

  return (
    <div className="space-y-2">
      {sorted.map(([key, value]) => {
        const isRiskMetric = riskKeys.some(k => key.includes(k))
        
        return (
          <div key={key} className="grid grid-cols-[200px_1fr] gap-4 text-sm py-2 border-b last:border-0">
            <div className="font-medium text-muted-foreground">
              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
            <div className="flex items-center gap-2">
                <div className="text-sm break-all whitespace-pre-wrap">
                {formatValue(value)}
              </div>
              {isRiskMetric && typeof value === "boolean" && (
                <Badge variant={getRiskBadgeVariant(value)} className="whitespace-nowrap ml-2">
                  {value ? "⚠️ Risk" : "✓ Safe"}
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ReputationDisplay
