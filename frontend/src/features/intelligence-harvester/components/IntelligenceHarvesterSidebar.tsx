import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Trash2, Search, Globe, Mail, Link2, MapPin, Info } from "lucide-react"
import { useMemo } from "react"
import { LookupResults } from "./LookupResults"
import type { IndicatorResult } from "@/shared/types/intelligence-harvester"

interface IntelligenceHarvesterSidebarProps {
  indicators?: string[]
  indicatorTypes?: Map<string, string>
  selectedIndicators?: Set<string>
  activeIndicator?: string | null
  lookupResults?: IndicatorResult[]
  isLoading?: boolean
  onRunLookup?: () => void
  canRun?: boolean
  isRunning?: boolean
  onToggleIndicator?: (indicator: string) => void
  onToggleAll?: (checked: boolean) => void
  onRemoveSelected?: () => void
  onRemoveIndicator?: (indicator: string) => void
  onClearAll?: () => void
  onIndicatorClick?: (indicator: string) => void
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  ip: { label: "IP Addresses", icon: MapPin },
  domain: { label: "Domains", icon: Globe },
  url: { label: "URLs", icon: Link2 },
  email: { label: "Email Addresses", icon: Mail },
}

export function IntelligenceHarvesterSidebar({
  indicators = [],
  indicatorTypes = new Map(),
  selectedIndicators = new Set(),
  activeIndicator = null,
  lookupResults = [],
  isLoading = false,
  onRunLookup,
  canRun = false,
  isRunning = false,
  onToggleIndicator,
  onToggleAll,
  onRemoveSelected,
  onRemoveIndicator,
  onClearAll,
  onIndicatorClick,
}: IntelligenceHarvesterSidebarProps) {
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
    <div className="flex h-full w-full">
      {/* Left: Indicator List */}
      <div className="w-80 border-r flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between gap-3 border-b p-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-medium text-foreground">
              Indicators
            </div>
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
            className="flex-shrink-0"
          >
            <Search className="mr-2 h-4 w-4" />
            {isRunning ? "Searching..." : "Run Lookup"}
          </Button>
        </div>

        {/* Indicator List */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4">
          {indicators.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    indicators.length > 0 &&
                    selectedIndicators.size === indicators.length
                  }
                  onCheckedChange={(value) => onToggleAll?.(Boolean(value))}
                />
                <span className="text-xs text-muted-foreground">Select all</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedIndicators.size > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveSelected}
                    className="h-7 text-xs"
                  >
                    Remove ({selectedIndicators.size})
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {indicators.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Info className="h-4 w-4 mx-auto mb-2" />
                <p className="font-medium">No indicators yet</p>
                <p className="text-xs">Add indicators above to begin</p>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {Object.entries(groupedIndicators).map(([type, typeIndicators]) => {
                  const typeInfo = TYPE_LABELS[type] || { label: type, icon: Info }
                  const Icon = typeInfo.icon
                  
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-sidebar-accent/50 rounded-md">
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
                            onClick={() => onIndicatorClick?.(indicator)}
                            className={`group w-full text-left rounded-md px-2 py-2 text-sm transition-colors cursor-pointer
                              ${isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "hover:bg-sidebar-accent/50"
                              }`}
                          >
                            <div className="grid grid-cols-[16px_1fr_28px] items-center gap-2">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleIndicator?.(indicator)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={isActive ? "bg-background border-background" : ""}
                                />
                              </div>
                              <span className="flex-1 truncate font-mono text-xs" title={indicator}>
                                {indicator}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onRemoveIndicator?.(indicator)
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
            )}
          </div>
        </div>
      </div>

      {/* Right: Lookup Results */}
      <div className="flex-1 min-h-0">
        <LookupResults
          results={lookupResults}
          activeIndicator={activeIndicator}
          isLoading={isLoading}
          className="border-0 rounded-none shadow-none h-full"
        />
      </div>
    </div>
  )
}
