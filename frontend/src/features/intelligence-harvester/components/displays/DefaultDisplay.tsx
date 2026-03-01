import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

import { FieldTable } from "./FieldTable"
import { isBase64Image } from "./utils"

interface DefaultDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

function isImageKey(key: string) {
  return key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
}

function formatValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "-"
  if (value === "") return "Not Found"

  if (isImageKey(key) && typeof value === "string") {
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
    return value.length > 0 && typeof value[0] === "object" ? JSON.stringify(value, null, 2) : value.join(", ")
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  return String(value)
}

function renderFields(fields: [string, unknown][]) {
  const imageFields = fields.filter(([key]) => isImageKey(key))
  const regularFields = fields.filter(([key]) => !isImageKey(key))

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
            label: key.replace(/_/g, " "),
            value: <span className="break-all">{formatValue(key, value)}</span>,
          }))}
        />
      )}
    </div>
  )
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

  const fields = Object.entries(
    isOverview ? (result.essential || {}) : { ...result.essential, ...result.additional }
  ).filter(([, v]) => v !== null && v !== undefined)

  if (fields.length === 0) {
    return isOverview ? null : <div className="text-sm text-muted-foreground">No data available for this result.</div>
  }

  return renderFields(fields)
}
