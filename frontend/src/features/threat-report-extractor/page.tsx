import { useState } from "react"
import { useMutation } from "@tanstack/react-query"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Textarea } from "@/shared/components/ui/textarea"
import { apiPost } from "@/shared/lib/api"

type ThreatEntity = {
  name: string
  role?: string
  aliases?: string[]
  confidence?: number | null
  confidence_label?: string
  reason?: string
  evidence?: string[]
}

type ConfidenceMetaShape = {
  confidence?: number | null
  confidence_label?: string
  reason?: string
  evidence?: string[]
}

type ThreatReportExtraction = {
  summary: string
  victim_organizations: ThreatEntity[]
  victim_industries: ThreatEntity[]
  victim_geographies: ThreatEntity[]
  threat_actors: ThreatEntity[]
  malware: ThreatEntity[]
  relationships: Array<{
    source: string
    source_type?: string
    relationship: string
    target: string
    target_type?: string
    confidence?: number | null
    confidence_label?: string
    reason?: string
    evidence?: string[]
    children?: ThreatReportExtraction["relationships"]
  }>
  campaigns: ThreatEntity[]
  attack_dates: {
    single_dates: string[]
    range_start: string
    range_end: string
    precision: string
    relative_expression: string
    evidence: string[]
  }
  article_iocs: {
    primary: Array<{
      value: string
      type: string
      confidence: number
      source_section: string
      source_url: string
      context_snippet: string
      tags: string[]
    }>
    secondary: Array<{
      value: string
      type: string
      confidence: number
      source_section: string
      source_url: string
      context_snippet: string
      tags: string[]
    }>
    legitimate_tools: Array<{
      value: string
      type: string
      confidence: number
      source_section: string
      source_url: string
      context_snippet: string
      tags: string[]
    }>
    linked_ioc_sources: string[]
    linked_source_iocs: Array<{
      value: string
      type: string
      confidence: number
      source_section: string
      source_url: string
      context_snippet: string
      tags: string[]
    }>
  }
  ttps: Array<{
    description: string
    tactics: string[]
    techniques: string[]
    procedures: string[]
    is_emerging?: boolean
    emergence_reason?: string
    confidence?: number | null
    confidence_label?: string
    reason?: string
    evidence?: string[]
  }>
  detection_rules: Array<{
    type: string
    name: string
    content: string
    description: string
    confidence?: number | null
    confidence_label?: string
    reason?: string
    evidence?: string[]
  }>
  mitre_techniques: string[]
  notes: string[]
  confidence: number | null
  validation_warnings: string[]
  meta: {
    source_length: number
    source_kind: string
    model_enrichment_used: boolean
    title?: string
    article_date?: string
    input_url?: string
    fetched_url?: string
    resolved_primary_source_url?: string
    used_source_url?: string
    source_resolution_strategy?: string
    source_resolution_confidence?: number
  }
}

type SourceMode = "text" | "url" | "file"

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatIocSourceLabel(value: string) {
  if (!value) {
    return "-"
  }
  if (value === "linked IOC source") {
    return "IOC source file"
  }
  return value
}

function getDisplayIocs(articleIocs: ThreatReportExtraction["article_iocs"]) {
  const seen = new Set<string>()
  const combined = [...articleIocs.primary, ...articleIocs.linked_source_iocs]

  return combined.filter((ioc) => {
    const key = [
      ioc.type,
      ioc.value,
      ioc.source_url,
      ioc.source_section,
    ].join("||")
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function csvEscape(value: string) {
  const normalized = value.replaceAll('"', '""')
  return `"${normalized}"`
}

function downloadIocsCsv(iocs: ReturnType<typeof getDisplayIocs>) {
  const rows = [
    [
      "type",
      "value",
      "source_section",
      "source_url",
      "context",
      "tags",
      "confidence",
    ],
    ...iocs.map((ioc) => [
      ioc.type,
      ioc.value,
      ioc.source_section,
      ioc.source_url,
      ioc.context_snippet,
      ioc.tags.join(" | "),
      String(ioc.confidence ?? ""),
    ]),
  ]
  const csv = rows
    .map((row) => row.map((value) => csvEscape(String(value ?? ""))).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "threat-report-iocs.csv"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function parseStructuredSummary(summary: string): Record<string, unknown> | null {
  const trimmed = summary.trim()
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    try {
      const normalized = trimmed
        .replace(/\bNone\b/g, "null")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/'/g, "\"")
      const parsed = JSON.parse(normalized)
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
}

function renderSummaryValue(value: unknown) {
  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-muted-foreground">-</span>
    }
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge key={`${String(item)}-${index}`} variant="secondary">
            {String(item)}
          </Badge>
        ))}
      </div>
    )
  }

  if (value && typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey} className="grid gap-1 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="text-sm font-medium">{toTitleCase(nestedKey)}</div>
            <div className="text-sm text-muted-foreground break-words">
              {typeof nestedValue === "string" || typeof nestedValue === "number"
                ? String(nestedValue)
                : JSON.stringify(nestedValue)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>
  }

  return <span className="text-sm text-muted-foreground break-words">{String(value)}</span>
}

function SummaryContent({ summary }: { summary: string }) {
  const structured = parseStructuredSummary(summary)

  if (!structured) {
    return <p className="text-sm whitespace-pre-wrap break-words">{summary}</p>
  }

  return (
    <div className="space-y-3">
      {Object.entries(structured).map(([key, value]) => (
        <div key={key} className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">{toTitleCase(key)}</div>
          {renderSummaryValue(value)}
        </div>
      ))}
    </div>
  )
}

function ConfidenceMeta({ item }: { item: ConfidenceMetaShape }) {
  const label = item.confidence_label?.trim()
  const score = typeof item.confidence === "number" ? item.confidence.toFixed(2) : ""
  const reason = item.reason?.trim()

  if (!label && !score && !reason) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {label ? <Badge variant="outline">{label} confidence</Badge> : null}
        {score ? <Badge variant="secondary">{score}</Badge> : null}
      </div>
      {reason ? <div className="text-sm text-muted-foreground">{reason}</div> : null}
    </div>
  )
}

function RelationshipNode({
  relationship,
  depth = 0,
}: {
  relationship: ThreatReportExtraction["relationships"][number]
  depth?: number
}) {
  return (
    <div className={depth > 0 ? "space-y-3 border-l pl-4" : "space-y-3"}>
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{relationship.source}</span>
          {relationship.source_type ? (
            <Badge variant="outline">{relationship.source_type.replaceAll("_", " ")}</Badge>
          ) : null}
          <Badge variant="secondary">{relationship.relationship.replaceAll("_", " ")}</Badge>
          <span className="font-medium">{relationship.target}</span>
          {relationship.target_type ? (
            <Badge variant="outline">{relationship.target_type.replaceAll("_", " ")}</Badge>
          ) : null}
        </div>
        <ConfidenceMeta item={relationship} />
        {relationship.evidence?.length ? (
          <div className="space-y-1">
            {relationship.evidence.map((evidence) => (
              <div key={`${relationship.source}-${relationship.relationship}-${evidence}`} className="text-sm text-muted-foreground">
                {evidence}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {relationship.children?.length ? (
        <div className="space-y-3">
          {relationship.children.map((child, index) => (
            <RelationshipNode
              key={`${child.source}-${child.relationship}-${child.target}-${depth + 1}-${index}`}
              relationship={child}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ExtractionLoadingState() {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Extracting threat intelligence</AlertTitle>
        <AlertDescription>
          Fetching the source, resolving report context, collecting report-grounded IOCs, and waiting for model enrichment.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Threat report analysis is still running.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`entity-skeleton-${index}`}>
            <CardHeader>
              <CardTitle><Skeleton className="h-5 w-40" /></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IOCs</CardTitle>
          <CardDescription>Report-grounded indicators are being collected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function EntitySection({ title, items }: { title: string; items: ThreatEntity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${title}-${item.name}`} className="rounded-md border p-3">
                <div className="font-medium">{item.name}</div>
                {item.role ? <div className="text-sm text-muted-foreground">{item.role}</div> : null}
                <div className="mt-2">
                  <ConfidenceMeta item={item} />
                </div>
                {item.aliases?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.aliases.map((alias) => (
                      <Badge key={`${item.name}-${alias}`} variant="secondary">{alias}</Badge>
                    ))}
                  </div>
                ) : null}
                {item.evidence?.length ? (
                  <div className="mt-2 space-y-1">
                    {item.evidence.map((evidence) => (
                      <div key={`${item.name}-${evidence}`} className="text-xs text-muted-foreground">
                        {evidence}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No extracted entities yet.</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ThreatReportExtractorPage() {
  const [query, setQuery] = useState("")
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [sourceMode, setSourceMode] = useState<SourceMode>("text")

  const extractMutation = useMutation({
    mutationFn: async () => {
      if (sourceMode === "file" && file) {
        const formData = new FormData()
        formData.append("file", file)
        return apiPost<ThreatReportExtraction>(
          "/tools/threat-report-extractor/",
          formData,
          null,
          { timeout: 180000 }
        )
      }

      const payload =
        sourceMode === "url"
          ? { url }
          : { query }

      return apiPost<ThreatReportExtraction>(
        "/tools/threat-report-extractor/",
        JSON.stringify(payload),
        "application/json",
        { timeout: 180000 }
      )
    },
  })

  const summaryText = extractMutation.data?.summary || "No contextual summary generated yet."
  const displayIocs = extractMutation.data ? getDisplayIocs(extractMutation.data.article_iocs) : []
  const canSubmit =
    sourceMode === "file"
      ? Boolean(file)
      : sourceMode === "url"
        ? Boolean(url.trim())
        : Boolean(query.trim())

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
          <CardDescription>
            Extract structured CTI intelligence from reports and articles, then review victims, entities, TTPs, dates, and report-grounded IOCs in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              ["text", "Text"],
              ["url", "URL"],
              ["file", "File"],
            ] as const).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                variant={sourceMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>

          {sourceMode === "text" ? (
            <Textarea
              rows={5}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={[
                "UNC1234 targeted Example Bank in March 2026 using Cobalt Strike and phishing emails.",
                "Observed infrastructure included example-login.com and 1.2.3.4.",
                "Mapped to T1566 and T1059.",
              ].join("\n")}
            />
          ) : null}

          {sourceMode === "url" ? (
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/report"
            />
          ) : null}

          {sourceMode === "file" ? (
            <div className="space-y-2">
              <Input
                type="file"
                accept=".txt,.md,.csv,.json,.html,.htm,.eml"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Supported for now: plain text, markdown, CSV, JSON, HTML, and EML-style text files.
              </p>
            </div>
          ) : null}

          <Button
            onClick={() => extractMutation.mutate()}
            disabled={extractMutation.isPending || !canSubmit}
          >
            {extractMutation.isPending ? "Extracting..." : "Extract Context"}
          </Button>
        </CardContent>
      </Card>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 pr-4">
            {extractMutation.isPending ? <ExtractionLoadingState /> : null}
            {extractMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Extraction failed</AlertTitle>
                <AlertDescription>
                  {extractMutation.error instanceof Error
                    ? extractMutation.error.message
                    : "Unable to extract context."}
                </AlertDescription>
              </Alert>
            ) : null}

            {!extractMutation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  {extractMutation.data
                    ? `Current extraction source: ${extractMutation.data.meta.source_kind}. Model enrichment ${extractMutation.data.meta.model_enrichment_used ? "ran successfully" : "is unavailable or returned no usable context"}.`
                    : "Run extraction to review the normalized output schema."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SummaryContent summary={summaryText} />
                {extractMutation.data?.meta.source_kind === "url" ? (
                  <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Article Title</p>
                      <p className="text-sm text-muted-foreground">{extractMutation.data.meta.title || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Article Date</p>
                      <p className="text-sm text-muted-foreground">{extractMutation.data.meta.article_date || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Input URL</p>
                      <p className="text-sm break-all text-muted-foreground">{extractMutation.data.meta.input_url || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Fetched URL</p>
                      <p className="text-sm break-all text-muted-foreground">{extractMutation.data.meta.fetched_url || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resolved Primary Source</p>
                      <p className="text-sm break-all text-muted-foreground">{extractMutation.data.meta.resolved_primary_source_url || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Used Source URL</p>
                      <p className="text-sm break-all text-muted-foreground">{extractMutation.data.meta.used_source_url || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resolution Strategy</p>
                      <p className="text-sm text-muted-foreground">{extractMutation.data.meta.source_resolution_strategy || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resolution Confidence</p>
                      <p className="text-sm text-muted-foreground">
                        {typeof extractMutation.data.meta.source_resolution_confidence === "number"
                          ? extractMutation.data.meta.source_resolution_confidence.toFixed(2)
                          : "-"}
                      </p>
                    </div>
                  </div>
                ) : null}
                {extractMutation.data?.validation_warnings?.length ? (
                  <div className="space-y-2">
                    {extractMutation.data.validation_warnings.map((warning) => (
                      <Alert key={warning}>
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            ) : null}

            {!extractMutation.isPending ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <EntitySection title="Victim Organizations" items={extractMutation.data?.victim_organizations ?? []} />
              <EntitySection title="Victim Industries" items={extractMutation.data?.victim_industries ?? []} />
              <EntitySection title="Victim Geographies" items={extractMutation.data?.victim_geographies ?? []} />
              <EntitySection title="Threat Actors" items={extractMutation.data?.threat_actors ?? []} />
              <EntitySection title="Malware" items={extractMutation.data?.malware ?? []} />
            </div>
            ) : null}

            {!extractMutation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>Relationships</CardTitle>
                <CardDescription>Explicit links between actors, malware, campaigns, and other entities described in the source.</CardDescription>
              </CardHeader>
              <CardContent>
                {extractMutation.data?.relationships.length ? (
                  <div className="space-y-3">
                    {extractMutation.data.relationships.map((relationship, index) => (
                      <RelationshipNode
                        key={`${relationship.source}-${relationship.relationship}-${relationship.target}-${index}`}
                        relationship={relationship}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No explicit relationships extracted yet.</div>
                )}
              </CardContent>
            </Card>
            ) : null}

            {!extractMutation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>Dates &amp; ATT&amp;CK</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Attack Dates</p>
                  {extractMutation.data?.attack_dates.precision ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {extractMutation.data.attack_dates.precision === "exact"
                          ? "Exact"
                          : extractMutation.data.attack_dates.precision === "range"
                            ? "Range"
                            : extractMutation.data.attack_dates.precision === "relative"
                              ? "Relative"
                              : "Mixed"}
                      </Badge>
                    </div>
                  ) : null}
                  {extractMutation.data?.attack_dates.single_dates.length ? (
                    <div className="flex flex-wrap gap-2">
                      {extractMutation.data.attack_dates.single_dates.map((date) => (
                        <Badge key={date} variant="secondary">{date}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attack timeline dates extracted yet.</p>
                  )}
                  {extractMutation.data?.attack_dates.range_start || extractMutation.data?.attack_dates.range_end ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Range: {extractMutation.data.attack_dates.range_start || "?"} to {extractMutation.data.attack_dates.range_end || "?"}
                    </div>
                  ) : null}
                  {extractMutation.data?.attack_dates.relative_expression ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Reported as: {extractMutation.data.attack_dates.relative_expression}
                    </div>
                  ) : null}
                  {extractMutation.data?.attack_dates.evidence?.length ? (
                    <div className="mt-3 space-y-1">
                      {extractMutation.data.attack_dates.evidence.map((evidence) => (
                        <div key={evidence} className="text-xs text-muted-foreground">
                          {evidence}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">MITRE Techniques</p>
                  {extractMutation.data?.mitre_techniques.length ? (
                    <div className="flex flex-wrap gap-2">
                      {extractMutation.data.mitre_techniques.map((technique) => (
                        <Badge key={technique} variant="secondary">{technique}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No ATT&amp;CK technique IDs found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            ) : null}

            {!extractMutation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>Tactics, Techniques &amp; Procedures</CardTitle>
                <CardDescription>Detailed TTP extraction when the source provides enough context.</CardDescription>
              </CardHeader>
              <CardContent>
                {extractMutation.data?.ttps.length ? (
                  <div className="space-y-4">
                    {extractMutation.data.ttps.map((ttp, index) => (
                      <div key={`${ttp.description || "ttp"}-${index}`} className="rounded-md border p-3 space-y-3">
                        {ttp.description ? (
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">Description</p>
                              {ttp.is_emerging ? <Badge variant="outline">Emerging</Badge> : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{ttp.description}</p>
                          </div>
                        ) : null}
                        <ConfidenceMeta item={ttp} />
                        {ttp.is_emerging && ttp.emergence_reason ? (
                          <div>
                            <p className="mb-2 text-sm font-medium">Why It Is Emerging</p>
                            <div className="text-sm text-muted-foreground">{ttp.emergence_reason}</div>
                          </div>
                        ) : null}
                        {ttp.tactics.length ? (
                          <div>
                            <p className="mb-2 text-sm font-medium">Tactics</p>
                            <div className="flex flex-wrap gap-2">
                              {ttp.tactics.map((tactic) => (
                                <Badge key={`${index}-tactic-${tactic}`} variant="secondary">{tactic}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {ttp.techniques.length ? (
                          <div>
                            <p className="mb-2 text-sm font-medium">Techniques</p>
                            <div className="flex flex-wrap gap-2">
                              {ttp.techniques.map((technique) => (
                                <Badge key={`${index}-technique-${technique}`} variant="secondary">{technique}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {ttp.procedures.length ? (
                          <div>
                            <p className="mb-2 text-sm font-medium">Procedures</p>
                            <div className="space-y-2">
                              {ttp.procedures.map((procedure) => (
                                <div key={`${index}-procedure-${procedure}`} className="rounded-md border px-3 py-2 text-sm">
                                  {procedure}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No detailed TTPs extracted yet.</div>
                )}
              </CardContent>
            </Card>
            ) : null}

            {!extractMutation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>Detection Rules</CardTitle>
                <CardDescription>Defensive content such as YARA, Sigma, Snort, Suricata, ClamAV, or other published detections.</CardDescription>
              </CardHeader>
              <CardContent>
                {extractMutation.data?.detection_rules.length ? (
                  <div className="space-y-3">
                    {extractMutation.data.detection_rules.map((rule, index) => (
                      <div key={`${rule.type}-${rule.name}-${index}`} className="rounded-md border p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {rule.type ? <Badge variant="secondary">{rule.type}</Badge> : null}
                          {rule.name ? <span className="text-sm font-medium">{rule.name}</span> : null}
                        </div>
                        {rule.description ? (
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                        ) : null}
                        <ConfidenceMeta item={rule} />
                        {rule.content ? (
                          <pre className="overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap break-all">
                            {rule.content}
                          </pre>
                        ) : null}
                        {rule.evidence?.length ? (
                          <div className="space-y-1">
                            {rule.evidence.map((evidence) => (
                              <div key={`${rule.name}-${evidence}`} className="text-xs text-muted-foreground">
                                {evidence}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No detection rules extracted yet.</div>
                )}
              </CardContent>
            </Card>
            ) : null}

            {!extractMutation.isPending ? (
            <Card>
              <CardHeader>
                <CardTitle>IOCs</CardTitle>
                <CardDescription>
                  IOC extraction is limited to explicit IOC sections, end-of-article appendices, and report-linked IOC artifacts instead of mid-article narrative content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Indicators of Compromise</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!displayIocs.length}
                      onClick={() => downloadIocsCsv(displayIocs)}
                    >
                      Export CSV
                    </Button>
                  </div>
                  {displayIocs.length ? (
                    <div className="rounded-md border">
                      <ScrollArea className="h-[420px]">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow>
                              <TableHead>IOC</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Context</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Tags</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayIocs.map((ioc, index) => (
                              <TableRow key={`${ioc.type}-${ioc.value}-${index}`}>
                                <TableCell className="align-top">
                                  <div className="font-medium break-all">{ioc.value}</div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <Badge variant="secondary">{ioc.type.replaceAll("_", " ")}</Badge>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    {ioc.context_snippet ? (
                                      <div className="break-words">{ioc.context_snippet}</div>
                                    ) : (
                                      <div>-</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <div>{formatIocSourceLabel(ioc.source_section)}</div>
                                    {ioc.source_url ? (
                                      <div className="break-all">{ioc.source_url}</div>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  {ioc.tags.length ? (
                                    <div className="flex flex-wrap gap-1">
                                      {ioc.tags.map((tag) => (
                                        <Badge key={`${ioc.value}-${tag}`} variant="outline">{tag}</Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No report-grounded IOCs extracted.</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Legitimate Tools</p>
                  {extractMutation.data?.article_iocs.legitimate_tools.length ? (
                    <div className="space-y-2">
                      {extractMutation.data.article_iocs.legitimate_tools.map((ioc, index) => (
                        <div key={`${ioc.value}-tool-${index}`} className="rounded-md border p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{ioc.type}</Badge>
                            <span className="text-sm font-medium break-all">{ioc.value}</span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Section: {ioc.source_section}
                          </p>
                          {ioc.tags.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {ioc.tags.map((tag) => (
                                <Badge key={`${ioc.value}-tool-${tag}`} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No legitimate tools separated yet.</p>
                    )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">IOC Source Files</p>
                  {extractMutation.data?.article_iocs.linked_ioc_sources.length ? (
                    <div className="space-y-2">
                      {extractMutation.data.article_iocs.linked_ioc_sources.map((link) => (
                        <div key={link} className="rounded-md border px-3 py-2 text-sm break-all">
                          {link}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No IOC source files found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            ) : null}

        </div>
      </ScrollArea>
    </div>
  )
}
