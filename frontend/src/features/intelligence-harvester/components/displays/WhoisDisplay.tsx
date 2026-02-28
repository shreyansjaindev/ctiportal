import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { formatValue } from "./utils"
import { FieldTable } from "./FieldTable"

interface WhoisDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

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
    const fields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )
    if (fields.length === 0) return null

    return (
      <FieldTable
        rows={fields.map(([key, value]) => ({ label: key.replace(/_/g, " "), value: formatValue(value) }))}
      />
    )
  }

  const allFields = Object.entries({ ...result.essential, ...result.additional })
    .filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return <div className="text-sm text-muted-foreground">No WHOIS data available.</div>
  }

  return (
    <FieldTable
      rows={allFields.map(([key, value]) => ({
        label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        value: formatValue(value),
      }))}
    />
  )
}
