import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Trash2, Info, Search, Globe, Mail, Link2, MapPin } from "lucide-react"
import { useMemo } from "react"
import { cn } from "@/shared/lib/utils"

interface IndicatorListProps {
  indicators: string[]
  indicatorTypes: Map<string, string>
  selectedIndicators: Set<string>
  activeIndicator: string | null
  resultCounts: Map<string, number>
  onRunLookup: () => void
  canRun: boolean
  isRunning: boolean
  onToggleIndicator: (indicator: string) => void
  onToggleAll: (checked: boolean) => void
  onRemoveSelected: () => void
  onRemoveIndicator: (indicator: string) => void
  onSelectIndicator: (indicator: string) => void
  className?: string
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  ip: { label: "IP Addresses", icon: MapPin },
  domain: { label: "Domains", icon: Globe },
  url: { label: "URLs", icon: Link2 },
  email: { label: "Email Addresses", icon: Mail },
}

export function IndicatorList({
  indicators,
  indicatorTypes,
  selectedIndicators,
  activeIndicator,
  resultCounts,
  onRunLookup,
  canRun,
  isRunning,
  onToggleIndicator,
  onToggleAll,
  onRemoveSelected,
  onRemoveIndicator,
  onSelectIndicator,
  className,
}: IndicatorListProps) {
  // Group indicators by type
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, string[]> = {}
    indicators.forEach(indicator => {
      const type = indicatorTypes.get(indicator) || 'unknown'
      if (!groups[type]) groups[type] = []
      groups[type].push(indicator)
    })
    return groups
  }, [indicators, indicatorTypes])
  return (
    <Card className={cn("h-full min-h-0 flex flex-col rounded-bl-lg rounded-br-none rounded-t-none", className)}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Indicators</CardTitle>
            {indicators.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {indicators.length}
              </Badge>
            )}
          </div>
          <Button
            onClick={onRunLookup}
            disabled={!canRun || isRunning}
            size="sm"
          >
            <Search className="mr-2 h-4 w-4" />
            {isRunning ? "Searching..." : "Run Lookup"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {indicators.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  indicators.length > 0 &&
                  selectedIndicators.size === indicators.length
                }
                onCheckedChange={(value) => onToggleAll(Boolean(value))}
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
            {selectedIndicators.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveSelected}
                className="h-7 text-xs"
              >
                Remove ({selectedIndicators.size})
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {indicators.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No indicators yet</AlertTitle>
              <AlertDescription>
                Add indicators above to begin
              </AlertDescription>
            </Alert>
          )}

          {Object.entries(groupedIndicators).map(([type, typeIndicators]) => {
            const typeInfo = TYPE_LABELS[type] || { label: type, icon: Info }
            const Icon = typeInfo.icon
            
            return (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {typeInfo.label}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {typeIndicators.length}
                  </Badge>
                </div>
                
                {typeIndicators.map((indicator) => {
                  const isActive = activeIndicator === indicator
                  const isSelected = selectedIndicators.has(indicator)
                  
                  return (
                    <div
                      key={indicator}
                      onClick={() => onSelectIndicator(indicator)}
                      className={`group w-full text-left rounded-md px-2 py-2 text-sm transition-colors cursor-pointer
                        ${isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                        }`}
                    >
                      <div className="grid grid-cols-[16px_1fr_auto_auto] items-center gap-2">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleIndicator(indicator)}
                            onClick={(e) => e.stopPropagation()}
                            className={isActive ? "bg-background border-background" : ""}
                          />
                        </div>
                        <span className="flex-1 truncate font-mono text-xs" title={indicator}>
                          {indicator}
                        </span>
                        {resultCounts.has(indicator) && (
                          <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
                            {resultCounts.get(indicator)}
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity
                            ${isActive ? "text-primary-foreground" : "hover:text-destructive"}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            onRemoveIndicator(indicator)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

