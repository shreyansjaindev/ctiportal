import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Trash2, Info, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { LookupResults } from "./LookupResults"
import type { IndicatorResult, IndicatorType, LookupType, LookupResult, Provider } from "@/shared/types/intelligence-harvester"
import { cn } from "@/shared/lib/utils"

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
  getProviderForType?: (type: LookupType) => string[]
  providersByType?: Record<string, Provider[]>
  onResultsUpdate?: (indicator: string, newResults: LookupResult[]) => void
}

const TYPE_LABELS: Record<string, { label: string }> = {
  ipv4: { label: "IPv4" },
  ipv6: { label: "IPv6" },
  domain: { label: "Domains" },
  url: { label: "URLs" },
  email: { label: "Email Addresses" },
  cve: { label: "CVE" },
  sha256: { label: "SHA256" },
  sha1: { label: "SHA1" },
  md5: { label: "MD5" },
  keyword: { label: "Keywords" },
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
  getProviderForType,
  providersByType,
  onResultsUpdate,
}: IntelligenceHarvesterSidebarProps) {
  const [activeIndicatorType, setActiveIndicatorType] = useState<IndicatorType | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  // Group indicators by type
  const groupedIndicators = useMemo(() => {
    const groups = new Map<IndicatorType | "unknown", string[]>()
    indicators.forEach(indicator => {
      const type = indicatorTypes.get(indicator) || "unknown"
      const existing = groups.get(type) ?? []
      existing.push(indicator)
      groups.set(type, existing)
    })
    return Array.from(groups.entries())
  }, [indicators, indicatorTypes])

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left: Indicator List */}
      <div className="w-80 border-r flex flex-col flex-shrink-0">
        <div className="border-b p-3 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-base font-medium text-foreground">Observables</div>
            <Badge variant="secondary" className="text-xs">
              {indicators.length}
            </Badge>
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
                {groupedIndicators.map(([type, typeIndicators]) => {
                  const typeInfo = TYPE_LABELS[type] || { label: type }
                  const isTypeActive = activeIndicatorType === type
                  
                  return (
                    <div key={type} className="border-b last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (type === "unknown") return
                          setActiveIndicatorType(type)
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                          isTypeActive ? "bg-sidebar-accent/50 text-foreground" : "bg-sidebar-accent/30 hover:bg-sidebar-accent/50"
                        )}
                      >
                        <span className={cn(
                          "text-xs font-medium uppercase tracking-wide",
                          isTypeActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {typeInfo.label}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {isTypeActive && resultsLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : null}
                          <Badge variant="secondary" className="text-xs">
                            {typeIndicators.length}
                          </Badge>
                        </div>
                      </button>
                      
                      {typeIndicators.map((indicator) => {
                        const isActive = activeIndicatorType === null && activeIndicator === indicator
                        const isSelected = selectedIndicators.has(indicator)
                        
                        return (
                          <div
                            key={indicator}
                            onClick={() => {
                              setActiveIndicatorType(null)
                              onIndicatorClick(indicator)
                            }}
                            className={`group w-full text-left border-t px-3 py-1 text-sm transition-colors cursor-pointer
                              ${isActive
                                ? "bg-muted text-foreground"
                                : "hover:bg-sidebar-accent/30"
                              }`}
                          >
                            <div className="grid grid-cols-[16px_1fr_16px_28px] items-center gap-2">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleIndicator(indicator)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <span className="flex-1 truncate text-xs" title={indicator}>
                                {indicator}
                              </span>
                              <div className="flex items-center justify-center">
                                {isActive && resultsLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 ${
                                  isActive ? "text-foreground hover:text-foreground" : "hover:text-destructive"
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
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        <LookupResults
          key={activeIndicatorType ?? activeIndicator ?? "results"}
          indicators={indicators}
          results={lookupResults}
          activeIndicator={activeIndicator}
          activeIndicatorTypeFilter={activeIndicatorType}
          indicatorTypes={indicatorTypes}
          isLoading={isLoading}
          className="border-0 rounded-none shadow-none h-full"
          getProviderForType={getProviderForType}
          providersByType={providersByType}
          onResultsUpdate={onResultsUpdate}
          onActiveLoadingChange={setResultsLoading}
        />
      </div>
    </div>
  )
}
