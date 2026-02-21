import { useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

import {
  CSVImportDialog,
  LookalikesTab,
  LookalikeFormSheet,
  NRDsTab,
  WatchedResourcesTab,
  WatchedResourceFormSheet,
} from "./components"
import { useLookalikeDomains, useNRDs, useWatchedResources } from "./hooks"

export default function DomainMonitoringPage() {
  const [activeTab, setActiveTab] = useState("lookalikes")

  // Custom hooks for data management
  const lookalikes = useLookalikeDomains()
  const nrds = useNRDs()
  const watched = useWatchedResources()

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lookalikes">Lookalike Domains</TabsTrigger>
          <TabsTrigger value="newly-registered">Newly Registered Domains</TabsTrigger>
          <TabsTrigger value="watched">Watched Resources</TabsTrigger>
        </TabsList>

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

        <TabsContent value="newly-registered">
          <NRDsTab nrds={nrds} />
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

