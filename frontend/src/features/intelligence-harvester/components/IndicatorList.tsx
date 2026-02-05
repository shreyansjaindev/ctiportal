import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Trash2, Info, Search, Globe, Mail, Link2, MapPin } from "lucide-react"
import { useMemo } from "react"

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
    <Card className="h-full min-h-0 flex flex-col rounded-bl-lg rounded-br-none rounded-t-none">
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
          <div className="grid grid-cols-[16px_1fr_auto] items-center gap-2 text-xs">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={
                  indicators.length > 0 &&
                  selectedIndicators.size === indicators.length
                }
                onCheckedChange={(value) => onToggleAll(Boolean(value))}
              />
            </div>
            <span className="text-muted-foreground">Select all</span>
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
                <div className="grid grid-cols-[16px_1fr_auto] items-center gap-2 py-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {typeInfo.label}
                  </span>
                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                    {typeIndicators.length}
                  </Badge>
                </div>
                
                {typeIndicators.map((indicator) => (
                  <div
                    key={indicator}
                    onClick={() => onSelectIndicator(indicator)}
                    className={`w-full text-left rounded-md px-2 py-2 text-sm transition-colors cursor-pointer
                      ${activeIndicator === indicator
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                      }`}
                  >
                    <div className="grid grid-cols-[16px_1fr_auto_auto] items-center gap-2">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIndicators.has(indicator)}
                          onCheckedChange={() => onToggleIndicator(indicator)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <span className="flex-1 truncate font-mono text-xs">
                        {indicator}
                      </span>
                      {resultCounts.has(indicator) && (
                        <Badge variant="outline" className="text-xs">
                          {resultCounts.get(indicator)}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(event) => {
                          event.stopPropagation()
                          onRemoveIndicator(indicator)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

