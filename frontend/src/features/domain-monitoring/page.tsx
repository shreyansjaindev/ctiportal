import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

import {
  AlertsTab,
  CSVImportDialog,
  LookalikesTab,
  LookalikeFormSheet,
  MonitoredDomainsTab,
  NewlyRegisteredDomainsTab,
  WatchedResourcesTab,
  WatchedResourceFormSheet,
} from "./components"
import {
  useAlerts,
  useLookalikeDomains,
  useMonitoredDomains,
  useNewlyRegisteredDomains,
  useWatchedResources,
} from "./hooks"

export default function DomainMonitoringPage() {
  const [activeTab, setActiveTab] = useState("lookalikes")

  // Custom hooks for data management
  const lookalikes = useLookalikeDomains()
  const alerts = useAlerts()
  const monitoredDomains = useMonitoredDomains()
  const nrds = useNewlyRegisteredDomains()
  const watched = useWatchedResources()

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList variant="line">
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="lookalikes">Lookalike Domains</TabsTrigger>
          <TabsTrigger value="nrds">Newly Registered Domains</TabsTrigger>
          <TabsTrigger value="monitored-domains">Monitored Domains</TabsTrigger>
          <TabsTrigger value="watched">Watched Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AlertsTab alerts={alerts} />
        </TabsContent>

        <TabsContent value="lookalikes" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LookalikesTab
            lookalikes={lookalikes}
            onOpenImport={() => {
              lookalikes.setImportFile(null)
              lookalikes.setImportResult(null)
              lookalikes.setImportOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="nrds" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <NewlyRegisteredDomainsTab nrds={nrds} />
        </TabsContent>

        <TabsContent value="monitored-domains" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MonitoredDomainsTab monitoredDomains={monitoredDomains} />
        </TabsContent>

        <TabsContent value="watched" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WatchedResourcesTab watched={watched} />
        </TabsContent>
      </Tabs>

      {/* Lookalike Form Sheet */}
      <LookalikeFormSheet
        open={lookalikes.sheetOpen}
        onOpenChange={lookalikes.setSheetOpen}
        initial={lookalikes.editing}
        onSubmit={(data) => lookalikes.saveMutation.mutate(data)}
        isSubmitting={lookalikes.saveMutation.isPending}
      />

      {/* Watched Resource Form Sheet */}
      <WatchedResourceFormSheet
        open={watched.sheetOpen}
        onOpenChange={watched.setSheetOpen}
        initial={watched.editing}
        onSubmit={(data) => watched.saveMutation.mutate(data)}
        isSubmitting={watched.saveMutation.isPending}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={lookalikes.importOpen}
        onOpenChange={lookalikes.setImportOpen}
        file={lookalikes.importFile}
        onFileChange={(file) => {
          lookalikes.setImportFile(file)
          lookalikes.setImportResult(null)
        }}
        result={lookalikes.importResult}
        onImport={() => {
          if (lookalikes.importFile) {
            lookalikes.importCSVMutation.mutate(lookalikes.importFile)
          }
        }}
        isImporting={lookalikes.importCSVMutation.isPending}
      />
    </div>
  )
}

