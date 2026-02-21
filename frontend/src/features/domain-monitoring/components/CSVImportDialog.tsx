import { Upload } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Field, FieldLabel, FieldContent } from "@/shared/components/ui/field"
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
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>Import Lookalike Domains (CSV)</SheetTitle>
          <SheetDescription>
            Upload a CSV file with the following columns: value, source, watched_resource,
            source_date, company, potential_risk (optional), status (optional)
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <Field>
            <FieldLabel htmlFor="csv-file">CSV File</FieldLabel>
            <FieldContent>
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
            </FieldContent>
          </Field>

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

        <SheetFooter className="px-4">
          <Button onClick={onImport} disabled={!file || isImporting}>
            {isImporting ? (
              "Importing..."
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
