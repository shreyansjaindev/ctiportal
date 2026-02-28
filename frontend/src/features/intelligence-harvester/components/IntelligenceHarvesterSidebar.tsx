import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Trash2, Info } from "lucide-react"
import { useMemo } from "react"
import { LookupResults } from "./LookupResults"
import type { IndicatorResult, IndicatorType, LookupType, LookupResult, Provider } from "@/shared/types/intelligence-harvester"

interface IntelligenceHarvesterSidebarProps {
  // Core list props — always provided by the parent page.
  indicators: string[]
  indicatorTypes: Map<string, IndicatorType>
  selectedIndicators: Set<string>
  activeIndicator: string | null
  lookupResults: IndicatorResult[]
  isLoading: boolean
  onToggleIndicator: (indicator: string) => void
  onToggleAll: (checked: boolean) => void
  onRemoveSelected: () => void
  onRemoveIndicator: (indicator: string) => void
  onClearAll: () => void
  onIndicatorClick: (indicator: string) => void
  // Lookup-specific props — optional because the component renders fine
  // without them (lookups are disabled but the indicator list still works).
  token?: string
  getProviderForType?: (type: LookupType) => string[]
  providersByType?: Record<string, Provider[]>
  onResultsUpdate?: (indicator: string, newResults: LookupResult[]) => void
}

const TYPE_LABELS: Record<string, { label: string }> = {
  ip: { label: "IP Addresses" },
  domain: { label: "Domains" },
  url: { label: "URLs" },
  email: { label: "Email Addresses" },
}

export function IntelligenceHarvesterSidebar({
  indicators,
  indicatorTypes,
  selectedIndicators,
  activeIndicator,
  lookupResults,
  isLoading,
  onToggleIndicator,
  onToggleAll,
  onRemoveSelected,
  onRemoveIndicator,
  onClearAll,
  onIndicatorClick,
  token,
  getProviderForType,
  providersByType,
  onResultsUpdate,
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
        <div className="flex items-center gap-3 border-b p-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-medium text-foreground">
              Observables
            </div>
            {indicators.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {indicators.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Indicator List */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {indicators.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1 border-b flex-shrink-0">
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
                    className="h-7 text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {indicators.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Info className="h-4 w-4 mx-auto mb-2" />
                <p className="font-medium text-foreground">No observables yet</p>
                <p>Add observables above to begin</p>
              </div>
            ) : (
              <div>
                {Object.entries(groupedIndicators).map(([type, typeIndicators]) => {
                  const typeInfo = TYPE_LABELS[type] || { label: type }
                  
                  return (
                    <div key={type} className="border-b last:border-b-0">
                      <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent/30">
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
                            onClick={() => onIndicatorClick(indicator)}
                            className={`group w-full text-left border-t px-3 py-1 text-sm transition-colors cursor-pointer
                              ${isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-sidebar-accent/30"
                              }`}
                          >
                            <div className="grid grid-cols-[16px_1fr_28px] items-center gap-2">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleIndicator(indicator)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={isActive ? "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary" : ""}
                                />
                              </div>
                              <span className="flex-1 truncate text-xs" title={indicator}>
                                {indicator}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 ${
                                  isActive ? "text-primary-foreground hover:text-primary-foreground" : "hover:text-destructive"
                                }`}
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
            )}
          </div>
        </div>
      </div>

      {/* Right: Lookup Results */}
      <div className="flex-1 min-h-0 min-w-0">
        <LookupResults
          key={activeIndicator ?? ""}
          results={lookupResults}
          activeIndicator={activeIndicator}
          indicatorTypes={indicatorTypes}
          isLoading={isLoading}
          className="border-0 rounded-none shadow-none h-full"
          token={token}
          getProviderForType={getProviderForType}
          providersByType={providersByType}
          onResultsUpdate={onResultsUpdate}
        />
      </div>
    </div>
  )
}
