import { useState } from "react"
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import type { LookupType } from "@/shared/types/intelligence-harvester"

import { renderLookupDisplay } from "../displays/LookupResultDisplay"
import type { CategoryEntry } from "./types"

type CategoryResultsGridProps = {
  resolvedCategory: LookupType
  activeCategoryEntries: CategoryEntry[]
  onForceRefreshEntry?: (indicator: string, providerId: string) => void
  isEntryRefreshing?: (indicator: string, providerId: string) => boolean
}

export function CategoryResultsGrid({
  resolvedCategory,
  activeCategoryEntries,
  onForceRefreshEntry,
  isEntryRefreshing,
}: CategoryResultsGridProps) {
  const [expandedEntryKey, setExpandedEntryKey] = useState<string | null>(null)

  const expandedEntry = expandedEntryKey
    ? activeCategoryEntries.find(({ indicator, result }, index) =>
        `${resolvedCategory}-${indicator}-${result._provider ?? index}` === expandedEntryKey
      )
    : null

  if (expandedEntry) {
    const expandedProviderId = expandedEntry.result._provider

    return (
      <Card className="gap-0 py-4 shadow-none">
        <CardHeader className="px-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-sm" title={expandedEntry.indicator}>
                {expandedEntry.indicator}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {expandedProviderId && onForceRefreshEntry ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 shrink-0"
                  onClick={() => onForceRefreshEntry(expandedEntry.indicator, expandedProviderId)}
                  title="Force refresh"
                  disabled={isEntryRefreshing?.(expandedEntry.indicator, expandedProviderId)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {expandedEntry.result.error ? <Badge variant="destructive" className="shrink-0">Error</Badge> : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 py-0"
                onClick={() => setExpandedEntryKey(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-0">
          {renderLookupDisplay(resolvedCategory, expandedEntry.result, false)}
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className={cn(
        "grid items-start gap-3",
        resolvedCategory === "screenshot" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"
      )}
    >
      {activeCategoryEntries.map(({ indicator, result }, index) => {
        const providerId = result._provider
        const entryKey = `${resolvedCategory}-${indicator}-${result._provider ?? index}`
        const entryRefreshing = providerId ? (isEntryRefreshing?.(indicator, providerId) ?? false) : false

        return (
          <Card key={entryKey} className="gap-0 py-4 shadow-none">
            <CardHeader className="px-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-sm" title={indicator}>{indicator}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {providerId && onForceRefreshEntry ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onForceRefreshEntry(indicator, providerId)}
                      title="Force refresh"
                      disabled={entryRefreshing}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {result.error ? <Badge variant="destructive" className="shrink-0">Error</Badge> : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 py-0"
                    onClick={() => setExpandedEntryKey(entryKey)}
                  >
                    View more
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              {entryRefreshing ? (
                <div className="flex min-h-[8rem] items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                renderLookupDisplay(resolvedCategory, result, true)
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
