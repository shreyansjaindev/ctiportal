import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

export type StatusOption = {
  value: string
  label: string
}

type BulkActionsBarProps = {
  count: number
  statusOptions?: StatusOption[]
  onClear: () => void
  onDelete: () => void
  onStatusUpdate?: (status: string) => void
  onExportTrellix?: () => void
  onExportProofpoint?: () => void
}

export function BulkActionsBar({
  count,
  statusOptions,
  onClear,
  onDelete,
  onStatusUpdate,
  onExportTrellix,
  onExportProofpoint,
}: BulkActionsBarProps) {
  const [statusValue, setStatusValue] = useState("")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="text-sm font-medium">
        {count} selected
      </Badge>
      {statusOptions && onStatusUpdate && (
        <div className="flex items-center gap-2">
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger size="sm" className="min-w-[160px]">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!statusValue}
            onClick={() => {
              if (!statusValue) return
              onStatusUpdate(statusValue)
              setStatusValue("")
            }}
          >
            Apply
          </Button>
        </div>
      )}

      {onExportTrellix && (
        <Button variant="outline" size="sm" onClick={onExportTrellix}>
          Send to Trellix
        </Button>
      )}
      {onExportProofpoint && (
        <Button variant="outline" size="sm" onClick={onExportProofpoint}>
          Send to Proofpoint
        </Button>
      )}

      <Button variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 className="mr-2 size-4" />
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}
