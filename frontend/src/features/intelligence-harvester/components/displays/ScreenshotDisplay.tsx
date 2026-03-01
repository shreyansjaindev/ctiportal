import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

import { FieldTable } from "./FieldTable"
import { isBase64Image } from "./utils"

interface ScreenshotDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

function formatValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "-"
  if (value === "") return "Not Found"

  if ((key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")) && typeof value === "string") {
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

function renderImage(value: unknown, className: string) {
  if (typeof value !== "string") return null

  if (value.startsWith("data:image/")) {
    return <img src={value} alt="Screenshot" className={className} />
  }

  if (isBase64Image(value)) {
    return <img src={`data:image/png;base64,${value}`} alt="Screenshot" className={className} />
  }

  return null
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
    const allData = result.essential || {}
    const screenshotField = Object.entries(allData).find(
      ([key]) => key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
    )

    if (!screenshotField) return null

    const [key, value] = screenshotField

    return <div className="flex justify-center">{formatValue(key, value)}</div>
  }

  const allFields = Object.entries({
    ...result.essential,
    ...result.additional,
  }).filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return <div className="text-sm text-muted-foreground">No screenshot available for this result.</div>
  }

  const imageFields = allFields.filter(
    ([key]) => key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
  )
  const regularFields = allFields.filter(
    ([key]) => !key.toLowerCase().includes("screenshot") && !key.toLowerCase().includes("image")
  )

  const primaryImageField = imageFields[0]

  return (
    <div className="space-y-4">
      {primaryImageField && (
        <div className="overflow-hidden rounded-lg border bg-muted/20 p-3">
          <div className="flex justify-center">
            {renderImage(primaryImageField[1], "h-auto max-h-[70vh] w-full rounded-md object-contain") ?? (
              <span className="text-sm text-muted-foreground">
                {formatValue(primaryImageField[0], primaryImageField[1])}
              </span>
            )}
          </div>
        </div>
      )}
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
