import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

interface SubdomainsDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

export function SubdomainsDisplay({ result, isOverview = false }: SubdomainsDisplayProps) {
  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const subdomains: string[] = Array.isArray(result.essential?.subdomains) ? (result.essential.subdomains as string[]) : []
  const total: number = typeof result.essential?.total_count === "number" ? (result.essential.total_count as number) : subdomains.length
  const max = isOverview ? 10 : subdomains.length

  if (subdomains.length === 0) {
    return <span className="text-sm text-muted-foreground">No subdomains found</span>
  }

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      {subdomains.slice(0, max).map((sub, i) => (
        <span key={i}>{sub}</span>
      ))}
      {total > max && (
        <span className="text-muted-foreground">+{total - max} more</span>
      )}
    </div>
  )
}
