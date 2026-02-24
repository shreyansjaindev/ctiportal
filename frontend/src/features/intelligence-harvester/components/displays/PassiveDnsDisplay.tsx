import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"
import type { DataTableFilterField } from "@/shared/components/data-table/types"
import type { ColumnDef } from "@tanstack/react-table"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { useMemo } from "react"

interface PassiveDnsDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

interface PassiveDnsRecord {
  ip_address?: string
  date?: number | string
  host_name?: string
  hostname?: string
  ip?: string
  timestamp?: number | string
  last_seen?: number | string
  first_seen?: number | string
  [key: string]: unknown
}

function formatDate(value: number | string): string {
  if (!value || value === 0) {
    return "—"
  }
  
  try {
    let date: Date
    
    // If it's a string, parse it directly
    if (typeof value === 'string') {
      date = new Date(value)
    } else {
      // Handle both seconds and milliseconds timestamps
      date = value > 10000000000 
        ? new Date(value)  // Already in milliseconds
        : new Date(value * 1000)  // In seconds, convert to milliseconds
    }
    
    if (isNaN(date.getTime())) {
      return "—"
    }
    
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

function extractRecords(result: LookupResult): PassiveDnsRecord[] {
  // Try to find records in various possible locations
  const records = result.essential?.records || 
                  result.additional?.records || 
                  result.essential || 
                  result.additional

  if (Array.isArray(records)) {
    return records
  }

  return []
}

export function PassiveDnsDisplay({ result, isOverview = false }: PassiveDnsDisplayProps) {
  // Define columns for the DataTable
  const columns = useMemo<ColumnDef<PassiveDnsRecord>[]>(() => [
    {
      id: "ip_address",
      accessorKey: "ip_address",
      accessorFn: (row) => row.ip_address || row.ip || "—",
      enableColumnFilter: true,
      filterFn: (row, id, filterValue) => {
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
          return true
        }
        const value = row.getValue(id) as string
        return filterValue.includes(value)
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP Address" />
      ),
      cell: ({ row }) => {
        const ip = row.original.ip_address || row.original.ip || "—"
        return <span className="font-mono text-sm">{ip}</span>
      },
    },
    {
      id: "date",
      accessorKey: "date",
      accessorFn: (row) => row.date || row.timestamp || row.last_seen || row.first_seen || 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const timestamp = row.original.date || row.original.timestamp || row.original.last_seen || row.original.first_seen
        if (!timestamp) return <span className="text-sm">—</span>
        return <span className="text-sm">{formatDate(timestamp)}</span>
      },
    },
    {
      id: "host_name",
      accessorKey: "host_name",
      accessorFn: (row) => row.host_name || row.hostname || "—",
      enableColumnFilter: true,
      filterFn: (row, id, filterValue) => {
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
          return true
        }
        const value = row.getValue(id) as string
        return filterValue.includes(value)
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Host Name" />
      ),
      cell: ({ row }) => {
        const hostname = row.original.host_name || row.original.hostname || "—"
        return <span className="font-mono text-sm">{hostname}</span>
      },
    },
  ], [])

  // Define filter fields for the DataTable
  const filterFields = useMemo<DataTableFilterField<PassiveDnsRecord>[]>(() => [
    {
      label: "IP Address",
      value: "ip_address",
      type: "checkbox",
      defaultOpen: true,
    },
    {
      label: "Host Name",
      value: "host_name",
      type: "checkbox",
      defaultOpen: true,
    },
  ], [])

  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const records = extractRecords(result)

  if (records.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No passive DNS records found
      </div>
    )
  }

  // For overview mode, limit to 5 records
  const displayRecords = isOverview ? records.slice(0, 5) : records

  return (
    <>
      <DataTable
        columns={columns}
        data={displayRecords}
        pageSizeOptions={isOverview ? undefined : [10, 25, 50, 100]}
        filterFields={isOverview ? undefined : filterFields}
      />

      {isOverview && records.length > 5 && (
        <div className="text-xs text-muted-foreground text-center px-6 py-2">
          Showing 5 of {records.length} records. View the tab for all records.
        </div>
      )}
    </>
  )
}
