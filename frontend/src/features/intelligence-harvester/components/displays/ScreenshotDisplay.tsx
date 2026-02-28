import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { isBase64Image } from "./utils"
import { FieldTable } from "./FieldTable"

interface ScreenshotDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

function formatValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—"
  if (value === "") return "Not Found"
  
  // Handle screenshot/image fields
  if ((key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")) && typeof value === "string") {
    // If it's already a data URL
    if (value.startsWith("data:image/")) {
      return (
        <img 
          src={value} 
          alt="Screenshot" 
          className="max-w-full h-auto rounded-md"
          style={{ maxHeight: "400px" }}
        />
      )
    }
    // If it's base64 without the data URL prefix
    if (isBase64Image(value)) {
      return (
        <img 
          src={`data:image/png;base64,${value}`} 
          alt="Screenshot" 
          className="max-w-full h-auto rounded-md"
          style={{ maxHeight: "400px" }}
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

export function ScreenshotDisplay({ result, isOverview = false }: ScreenshotDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  if (isOverview) {
    // Overview tab - show screenshot image if available
    const allData = result.essential || {}
    const screenshotField = Object.entries(allData).find(([key]) => 
      key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
    )
    
    if (!screenshotField) return null
    
    const [key, value] = screenshotField
    
    return (
      <div className="flex justify-center">
        {formatValue(key, value)}
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
        No screenshot available for this result.
      </div>
    )
  }

  const imageFields = allFields.filter(([key]) =>
    key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
  )
  const regularFields = allFields.filter(([key]) =>
    !key.toLowerCase().includes("screenshot") && !key.toLowerCase().includes("image")
  )

  return (
    <div className="space-y-4">
      {imageFields.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </div>
          {formatValue(key, value)}
        </div>
      ))}
      {regularFields.length > 0 && (
        <FieldTable
          rows={regularFields.map(([key, value]) => ({
            label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            value: <span className="break-all whitespace-pre-wrap">{formatValue(key, value)}</span>,
          }))}
        />
      )}
    </div>
  )
}
