import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

import {
  AlertsTab,
  CSVImportDialog,
  LookalikesTab,
  LookalikeFormSheet,
  MonitoredDomainsTab,
  WatchedResourcesTab,
  WatchedResourceFormSheet,
} from "./components"
import {
  useAlerts,
  useLookalikeDomains,
  useMonitoredDomains,
  useWatchedResources,
} from "./hooks"

export default function DomainMonitoringPage() {
  const [activeTab, setActiveTab] = useState("lookalikes")

  // Custom hooks for data management
  const lookalikes = useLookalikeDomains()
  const alerts = useAlerts()
  const monitoredDomains = useMonitoredDomains()
  const watched = useWatchedResources()

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="lookalikes">Lookalike Domains</TabsTrigger>
          <TabsTrigger value="monitored-domains">Monitored Domains</TabsTrigger>
          <TabsTrigger value="watched">Watched Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <AlertsTab alerts={alerts} />
        </TabsContent>

        <TabsContent value="lookalikes">
          <LookalikesTab
            lookalikes={lookalikes}
            onOpenImport={() => {
              lookalikes.setImportFile(null)
              lookalikes.setImportResult(null)
              lookalikes.setImportOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="monitored-domains">
          <MonitoredDomainsTab monitoredDomains={monitoredDomains} />
        </TabsContent>

        <TabsContent value="watched">
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

