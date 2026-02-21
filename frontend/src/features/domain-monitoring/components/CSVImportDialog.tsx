import { Upload } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"

import type { BulkCreateResult } from "../types"

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  onFileChange: (file: File | null) => void
  result: BulkCreateResult | null
  onImport: () => void
  isImporting: boolean
}

export function CSVImportDialog({
  open,
  onOpenChange,
  file,
  onFileChange,
  result,
  onImport,
  isImporting,
}: CSVImportDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Import Lookalike Domains (CSV)</SheetTitle>
          <SheetDescription>
            Upload a CSV file with the following columns: value, source, watched_resource,
            source_date, company, potential_risk (optional), status (optional)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="csv-file" className="text-sm font-medium">
              CSV File
            </label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  onFileChange(file)
                }
              }}
            />
          </div>

          {result && (
            <div className="space-y-2 rounded-md border p-4">
              <p className="text-sm font-medium">
                Import completed: {result.created} created, {result.failed} failed
              </p>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        Row {err.index + 2}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button onClick={onImport} disabled={!file || isImporting}>
            {isImporting ? (
              "Importing..."
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                Import
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
