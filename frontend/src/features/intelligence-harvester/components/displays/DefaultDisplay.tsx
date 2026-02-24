import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

interface DefaultDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

function isBase64Image(value: unknown): boolean {
  if (typeof value !== "string") return false
  // Check if it's a base64 image string or data URL
  return value.startsWith("data:image/") || (value.length > 100 && value.match(/^[A-Za-z0-9+/=]+$/) !== null)
}

function formatValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—"
  if (value === "") return "Not Found"
  
  // Handle image fields
  if ((key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")) && typeof value === "string") {
    // If it's already a data URL
    if (value.startsWith("data:image/")) {
      return (
        <img 
          src={value} 
          alt={key} 
          className="max-w-full h-auto rounded-md border shadow-sm"
          style={{ maxHeight: "300px" }}
        />
      )
    }
    // If it's base64 without the data URL prefix
    if (isBase64Image(value)) {
      return (
        <img 
          src={`data:image/png;base64,${value}`} 
          alt={key} 
          className="max-w-full h-auto rounded-md border shadow-sm"
          style={{ maxHeight: "300px" }}
        />
      )
    }
  }
  
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

export function DefaultDisplay({ result, isOverview = false }: DefaultDisplayProps) {
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
        {essentialFields.map(([key, value]) => {
          const isImageField = key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
          return (
            <div key={key} className={isImageField ? "col-span-full rounded-lg border p-3" : "rounded-lg border p-3"}>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {key.replace(/_/g, " ")}
              </div>
              <div className={isImageField ? "flex justify-center" : "text-sm break-all whitespace-pre-wrap"}>
                {formatValue(key, value)}
              </div>
            </div>
          )
        })}
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
        const isImageField = key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
        return (
          <div key={key} className={isImageField ? "space-y-2 py-2 border-b last:border-0" : "grid grid-cols-[200px_1fr] gap-4 text-sm py-2 border-b last:border-0"}>
            <div className={isImageField ? "font-medium text-sm" : "font-medium text-muted-foreground"}>
              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
            <div className={isImageField ? "" : "text-sm break-all whitespace-pre-wrap"}>
              {formatValue(key, value)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DefaultDisplay
