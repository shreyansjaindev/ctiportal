import React, { useState } from "react"
import { AlertCircle, Search } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Input } from "@/shared/components/ui/input"
import { DataTable } from "@/shared/components/data-table"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { FieldTable } from "./FieldTable"

interface WebScanDisplayProps {
  result: LookupResult
  isOverview?: boolean
}

type UrlscanResultRow = {
  id?: string
  time?: string
  url?: string
  domain?: string
  ip?: string
  asn_name?: string
  asn?: string
  overall_score?: number | string
  overall_malicious?: boolean | string
  link?: string
}

function isUrlscanResultsArray(value: unknown): value is UrlscanResultRow[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    ("url" in (value[0] as Record<string, unknown>) || "domain" in (value[0] as Record<string, unknown>))
  )
}

const URLSCAN_COLUMNS: ColumnDef<UrlscanResultRow>[] = [
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => row.original.time ?? "—",
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate" title={row.original.url}>
        {row.original.url ?? "—"}
      </div>
    ),
  },
  {
    accessorKey: "domain",
    header: "Domain",
    cell: ({ row }) => row.original.domain ?? "—",
  },
  {
    accessorKey: "ip",
    header: "IP",
    cell: ({ row }) => row.original.ip ?? "—",
  },
  {
    accessorKey: "asn_name",
    header: "ASN",
    cell: ({ row }) => row.original.asn_name || row.original.asn || "—",
  },
  {
    accessorKey: "overall_score",
    header: "Score",
    cell: ({ row }) => row.original.overall_score ?? "—",
  },
  {
    accessorKey: "overall_malicious",
    header: "Malicious",
    cell: ({ row }) => String(row.original.overall_malicious ?? "—"),
  },
  {
    accessorKey: "link",
    header: "Report",
    cell: ({ row }) => {
      const link = row.original.link
      return link ? (
        <a href={link} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
          Open
        </a>
      ) : "—"
    },
  },
]

export function WebScanDisplay({ result, isOverview = false }: WebScanDisplayProps) {
  const [searchQuery, setSearchQuery] = useState("")

  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    )
  }

  const urlscanRows = result.essential?.results
  if (!isUrlscanResultsArray(urlscanRows)) {
    return <div className="text-sm text-muted-foreground">No scan data available.</div>
  }

  if (isOverview) {
    const uniqueDomains = Array.from(new Set(urlscanRows.map(r => r.domain).filter(Boolean))) as string[]
    const uniqueIps = Array.from(new Set(urlscanRows.map(r => r.ip).filter(Boolean))) as string[]
    const uniqueAsns = Array.from(new Set(urlscanRows.map(r => r.asn_name).filter(Boolean))) as string[]
    const apiTotal = result.essential?.total_results as number | undefined
    const fetched = (result.essential?.fetched_results as number | undefined) ?? urlscanRows.length

    const compact = (items: string[], max = 6): React.ReactNode =>
      items.length === 0 ? "—" : (
        <div className="space-y-0.5">
          {items.slice(0, max).map((item, i) => <div key={i}>{item}</div>)}
          {items.length > max && <div className="text-muted-foreground">+{items.length - max} more</div>}
        </div>
      )

    const stats: { label: string; value: React.ReactNode }[] = [
      ...(apiTotal != null ? [{ label: "Total in database", value: apiTotal }] : []),
      { label: "Results fetched", value: fetched },
      { label: "Domains", value: compact(uniqueDomains) },
      { label: "IPs", value: compact(uniqueIps) },
      { label: "ASNs", value: compact(uniqueAsns) },
    ]

    return <FieldTable rows={stats} />
  }

  const filteredRows = urlscanRows.filter((row) => {
    const q = searchQuery.toLowerCase()
    return (
      (row.url?.toLowerCase().includes(q) ?? false) ||
      (row.domain?.toLowerCase().includes(q) ?? false) ||
      (row.ip?.toLowerCase().includes(q) ?? false) ||
      (row.asn_name?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="space-y-4 px-6 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">URLScan Results</span>
        <span className="text-xs text-muted-foreground">({filteredRows.length} of {urlscanRows.length})</span>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search URL, domain, IP, or ASN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <DataTable columns={URLSCAN_COLUMNS} data={filteredRows} pageSizeOptions={[10, 20, 50]} filterFields={[]} />
    </div>
  )
}
