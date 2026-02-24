import { AlertCircle, Maximize2, Search } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { DataTable } from "@/shared/components/data-table"
import type { LookupResult } from "@/shared/types/intelligence-harvester"
import { HttpStatusDisplay } from "../HttpStatusDisplay"
import { RedirectChain } from "../RedirectChain"

interface WebsiteDetailsDisplayProps {
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

function getUrlscanColumns(): ColumnDef<UrlscanResultRow>[] {
  return [
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => formatValue("time", row.original.time),
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.original.url}>
          {formatValue("url", row.original.url)}
        </div>
      ),
    },
    {
      accessorKey: "domain",
      header: "Domain",
      cell: ({ row }) => formatValue("domain", row.original.domain),
    },
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => formatValue("ip", row.original.ip),
    },
    {
      accessorKey: "asn_name",
      header: "ASN",
      cell: ({ row }) => formatValue("asn_name", row.original.asn_name || row.original.asn),
    },
    {
      accessorKey: "overall_score",
      header: "Score",
      cell: ({ row }) => formatValue("overall_score", row.original.overall_score),
    },
    {
      accessorKey: "overall_malicious",
      header: "Malicious",
      cell: ({ row }) => formatValue("overall_malicious", row.original.overall_malicious),
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
        ) : (
          "—"
        )
      },
    },
  ]
}

function isBase64Image(value: unknown): boolean {
  if (typeof value !== "string") return false
  return value.startsWith("data:image/") || (value.length > 100 && value.match(/^[A-Za-z0-9+/=]+$/) !== null)
}

function resolveImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null
  if (value.startsWith("data:image/")) return value
  if (isBase64Image(value)) return `data:image/png;base64,${value}`
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return null
}

function ImageWithFullscreen({ src, alt }: { src: string; alt: string }) {
  const imageRef = useRef<HTMLImageElement | null>(null)

  const onFullscreen = async () => {
    try {
      await imageRef.current?.requestFullscreen()
    } catch {
      window.open(src, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className="space-y-2">
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-md border"
        style={{ maxHeight: "300px" }}
      />
      <Button type="button" size="sm" variant="outline" onClick={onFullscreen} className="gap-2">
        <Maximize2 className="h-4 w-4" />
        Fullscreen
      </Button>
    </div>
  )
}

function formatValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined) return "—"
  if (value === "") return "Not Found"

  const isImageField = key.toLowerCase().includes("screenshot") || key.toLowerCase().includes("image")
  if (isImageField) {
    const imageSrc = resolveImageSrc(value)
    if (imageSrc) {
      return <ImageWithFullscreen src={imageSrc} alt={key} />
    }
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return JSON.stringify(value, null, 2)
    }
    return value.join(", ")
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

export function WebsiteDetailsDisplay({ result, isOverview = false }: WebsiteDetailsDisplayProps) {
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
  if (isUrlscanResultsArray(urlscanRows)) {
    const filteredRows = urlscanRows.filter((row) => {
      const query = searchQuery.toLowerCase()
      return (
        (row.url?.toLowerCase().includes(query) ?? false) ||
        (row.domain?.toLowerCase().includes(query) ?? false) ||
        (row.ip?.toLowerCase().includes(query) ?? false) ||
        (row.asn_name?.toLowerCase().includes(query) ?? false)
      )
    })

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">URLScan Results</h3>
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
        </div>
        <DataTable columns={getUrlscanColumns()} data={filteredRows} pageSizeOptions={[10, 20, 50]} filterFields={[]} />
      </div>
    )
  }

  if (isOverview) {
    const essentialFields = Object.entries(result.essential || {}).filter(
      ([, value]) => value !== null && value !== undefined
    )

    if (essentialFields.length === 0) return null

    return (
      <div className="grid auto-rows-min grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {essentialFields.map(([key, value]) => (
          <div key={key} className="rounded-lg border p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {key.replace(/_/g, " ")}
            </div>
            <div className={key === "status_code" || key === "redirects" ? "" : "text-sm"}>
              {key === "status_code" ? (
                <HttpStatusDisplay code={value as number | string} showText={true} />
              ) : key === "redirects" ? (
                <RedirectChain redirects={value as Array<{ url?: string; code?: string | number }>} />
              ) : (
                <div className="text-sm break-all whitespace-pre-wrap">
                  {formatValue(key, value)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const allFields = Object.entries({
    ...result.essential,
    ...result.additional
  }).filter(([, value]) => value !== null && value !== undefined)

  if (allFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No data available for this result.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {allFields.map(([key, value]) => {
        const isSpecial = key === "status_code" || key === "redirects"

        return (
          <div key={key} className="pb-2 border-b last:border-0">
            <div className={`grid gap-4 text-sm py-2 ${isSpecial ? "" : "grid-cols-[200px_1fr]"}`}>
              <div className="font-medium text-muted-foreground">
                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
              <div>
                {key === "status_code" ? (
                  <HttpStatusDisplay code={value as number | string} showText={true} />
                ) : key === "redirects" ? (
                  <RedirectChain redirects={value as Array<{ url?: string; code?: string | number }>} />
                ) : (
                  <div className="text-sm break-all whitespace-pre-wrap">
                    {formatValue(key, value)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default WebsiteDetailsDisplay
