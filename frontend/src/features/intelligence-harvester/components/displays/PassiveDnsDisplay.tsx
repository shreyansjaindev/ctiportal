import { AlertCircle } from "lucide-react"
import { FieldTable } from "./FieldTable"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { DataTable } from "@/shared/components/data-table"
import { DataTableColumnHeader } from "@/shared/components/data-table/data-table-column-header"
import type { DataTableFilterField } from "@/shared/components/data-table/types"
import type { ColumnDef } from "@tanstack/react-table"
import type { LookupResult } from "@/shared/types/intelligence-harvester"

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

function arrayFilterFn(row: import("@tanstack/react-table").Row<PassiveDnsRecord>, id: string, filterValue: unknown) {
  if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true
  return filterValue.includes(row.getValue(id) as string)
}

const COLUMNS: ColumnDef<PassiveDnsRecord>[] = [
  {
    id: "ip_address",
    accessorKey: "ip_address",
    accessorFn: (row) => row.ip_address || row.ip || "—",
    enableColumnFilter: true,
    filterFn: arrayFilterFn,
    header: ({ column }) => <DataTableColumnHeader column={column} title="IP Address" />,
    cell: ({ row }) => <span>{row.original.ip_address || row.original.ip || "—"}</span>,
  },
  {
    id: "date",
    accessorKey: "date",
    accessorFn: (row) => row.date || row.timestamp || row.last_seen || row.first_seen || 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const ts = row.original.date || row.original.timestamp || row.original.last_seen || row.original.first_seen
      return <span>{ts ? formatDate(ts) : "—"}</span>
    },
  },
  {
    id: "host_name",
    accessorKey: "host_name",
    accessorFn: (row) => row.host_name || row.hostname || "—",
    enableColumnFilter: true,
    filterFn: arrayFilterFn,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Host Name" />,
    cell: ({ row }) => <span>{row.original.host_name || row.original.hostname || "—"}</span>,
  },
]

const FILTER_FIELDS: DataTableFilterField<PassiveDnsRecord>[] = [
  { label: "IP Address", value: "ip_address", type: "checkbox", defaultOpen: true },
  { label: "Host Name", value: "host_name", type: "checkbox", defaultOpen: true },
]

export function PassiveDnsDisplay({ result, isOverview = false }: PassiveDnsDisplayProps) {
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

  if (isOverview) {
    const uniqueIps = Array.from(new Set(records.map(r => r.ip_address || r.ip).filter(Boolean))) as string[]
    const uniqueHosts = Array.from(new Set(records.map(r => r.host_name || r.hostname).filter(Boolean))) as string[]
    const compact = (items: string[], max = 6): React.ReactNode =>
      items.length === 0 ? "—" : (
        <div className="space-y-0.5">
          {items.slice(0, max).map((item, i) => <div key={i}>{item}</div>)}
          {items.length > max && <div className="text-muted-foreground">+{items.length - max} more</div>}
        </div>
      )

    const stats: { label: string; value: React.ReactNode }[] = [
      { label: "Records found", value: records.length },
      { label: "IPs", value: compact(uniqueIps) },
      { label: "Hostnames", value: compact(uniqueHosts) },
    ]

    return <FieldTable rows={stats} />
  }

  return (
    <DataTable
      columns={COLUMNS}
      data={records}
      pageSizeOptions={[10, 25, 50, 100]}
      filterFields={FILTER_FIELDS}
    />
  )
}
