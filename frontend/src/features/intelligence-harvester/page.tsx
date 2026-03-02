import { useState } from "react"
import { DownloadIcon, SearchIcon, SettingsIcon } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet"

import { IntelligenceHarvesterSidebar } from "./components/sidebar/IntelligenceHarvesterSidebar"
import { ProviderAutoLoadSetup } from "./components/setup/ProviderAutoLoadSetup"
import { useIntelligenceHarvesterPage } from "./useIntelligenceHarvesterPage"

export default function IntelligenceHarvesterPage() {
  const [quickInput, setQuickInput] = useState("")
  const [configOpen, setConfigOpen] = useState(false)

  const {
    indicators,
    indicatorTypes,
    selectedIndicators,
    activeIndicator,
    setActiveIndicator,
    lookupResults,
    selections,
    setProviderForType,
    getProviderForType,
    providersByType,
    presets,
    isLookupLoading,
    isExporting,
    onResultsUpdate,
    addIndicators,
    toggleIndicator,
    toggleAllIndicators,
    removeSelectedIndicators,
    removeIndicator,
    clearAllIndicators,
    exportResults,
  } = useIntelligenceHarvesterPage()

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          placeholder="Enter observables: IPs, domains, URLs, hashes, CVEs..."
          value={quickInput}
          onChange={(event) => setQuickInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              if (quickInput.trim()) {
                addIndicators(quickInput)
                setQuickInput("")
              }
            }
          }}
          className="min-w-0 flex-1 border-none bg-secondary px-3 shadow-none focus-visible:ring-0"
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={exportResults}
          disabled={isExporting || indicators.length === 0}
          title="Export current observables to Excel"
        >
          <DownloadIcon className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>

        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              title="Provider auto-load setup"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Provider Auto-Load Setup</SheetTitle>
              <SheetDescription>
                Choose which lookup categories should auto-run and which providers should be used for each one.
              </SheetDescription>
            </SheetHeader>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <ProviderAutoLoadSetup
                selections={selections}
                setProviderForType={setProviderForType}
                providersByType={providersByType}
                presets={presets}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="min-h-0 flex-1">
        <IntelligenceHarvesterSidebar
          indicators={indicators}
          indicatorTypes={indicatorTypes}
          selectedIndicators={selectedIndicators}
          activeIndicator={activeIndicator}
          lookupResults={lookupResults}
          isLoading={isLookupLoading}
          onToggleIndicator={toggleIndicator}
          onToggleAll={toggleAllIndicators}
          onRemoveSelected={removeSelectedIndicators}
          onRemoveIndicator={removeIndicator}
          onClearAll={clearAllIndicators}
          onIndicatorClick={setActiveIndicator}
          getProviderForType={getProviderForType}
          providersByType={providersByType}
          onResultsUpdate={onResultsUpdate}
        />
      </div>
    </div>
  )
}
