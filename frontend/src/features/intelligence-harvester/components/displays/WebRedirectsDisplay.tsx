import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { HttpStatusDisplay } from "../HttpStatusDisplay"
import { RedirectChain } from "../RedirectChain"
import { formatValue } from "./utils"
import { FieldTable } from "./FieldTable"

interface WebRedirectsDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

export function WebRedirectsDisplay({ result, isOverview = false }: WebRedirectsDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const renderValue = (key: string, value: unknown) => {
    if (key === "status_code") return <HttpStatusDisplay code={value as number | string} showText={true} />
    if (key === "redirects") return <RedirectChain redirects={value as Array<{ url?: string; code?: string | number }>} />
    return <span className="break-all">{formatValue(value)}</span>
  }

  if (isOverview) {
    const fields = Object.entries(result.essential || {}).filter(([, v]) => v !== null && v !== undefined)
    if (fields.length === 0) return null

    return (
      <FieldTable
        rows={fields.map(([key, value]) => ({ label: key.replace(/_/g, " "), value: renderValue(key, value) }))}
      />
    )
  }

  const allFields = Object.entries({ ...result.essential, ...result.additional }).filter(
    ([, v]) => v !== null && v !== undefined
  )

  if (allFields.length === 0) {
    return <div className="text-sm text-muted-foreground">No data available.</div>
  }

  return (
    <FieldTable
      rows={allFields.map(([key, value]) => ({
        label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        value: renderValue(key, value),
      }))}
    />
  )
}
