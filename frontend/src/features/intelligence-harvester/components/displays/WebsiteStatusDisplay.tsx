import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { HttpStatusDisplay } from "../HttpStatusDisplay"
import { RedirectChain } from "../RedirectChain"

interface WebsiteStatusDisplayProps {
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

export function WebsiteStatusDisplay({ result, isOverview = false }: WebsiteStatusDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  if (isOverview) {
    // Overview tab - grid layout for essential fields only
    const essentialFields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )

    if (essentialFields.length === 0) return null

    return (
      <div className="grid auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {essentialFields.map(([key, value]) => (
          <div key={key} className="rounded-lg border p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {key.replace(/_/g, " ")}
            </div>
            <div className={key === "status_code" || key === "redirects" ? "" : "text-sm"}>
              {key === "status_code" ? (
                <HttpStatusDisplay code={value as number | string} showText={true} />
              ) : key === "redirects" ? (
                <RedirectChain redirects={value as Array<{ url?: string; code?: string | number }>} />
              ) : (
                <div className="text-sm break-all whitespace-pre-wrap">
                  {formatValue(value)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Type-specific tab - all fields merged
  const allFields = Object.entries({
    ...result.essential,
    ...result.additional
  }).filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No data available for this result.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {allFields.map(([key, value]) => {
        const isSpecial = key === "status_code" || key === "redirects"
        
        return (
          <div key={key} className="pb-2 border-b last:border-0">
            <div className={`grid gap-4 text-sm py-2 ${isSpecial ? "" : "grid-cols-[200px_1fr]"}`}>
              <div className="font-medium text-muted-foreground">
                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
              <div>
                {key === "status_code" ? (
                  <HttpStatusDisplay code={value as number | string} showText={true} />
                ) : key === "redirects" ? (
                  <RedirectChain redirects={value as Array<{ url?: string; code?: string | number }>} />
                ) : (
                  <div className="text-sm break-all whitespace-pre-wrap">
                    {formatValue(value)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default WebsiteStatusDisplay
