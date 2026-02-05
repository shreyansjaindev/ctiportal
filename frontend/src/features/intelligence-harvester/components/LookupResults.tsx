import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { useMemo } from "react"
import { Info, AlertCircle } from "lucide-react"
import type { IndicatorResult, LookupResult } from "@/shared/types/intelligence-harvester"

interface LookupResultsProps {
  results: IndicatorResult[]
  activeIndicator: string | null
}

const LOOKUP_LABELS: Record<string, string> = {
  whois: "WHOIS",
  geolocation: "Geolocation",
  reputation: "Reputation",
  dns: "DNS",
  passive_dns: "Passive DNS",
  whois_history: "WHOIS History",
  reverse_dns: "Reverse DNS",
  asn: "ASN",
  screenshot: "Screenshot",
  email_validation: "Email Validation",
  blacklist: "Blacklist",
  vulnerability: "Vulnerability",
  google_search: "Google Search",
  website_status: "Website Status",
}

export function LookupResults({ results, activeIndicator }: LookupResultsProps) {
  const filteredResults = activeIndicator
    ? results.filter((item) => item.indicator === activeIndicator)
    : results

  const activeResult = filteredResults[0]

  // Group results by lookup type
  const resultsByType = useMemo(() => {
    if (!activeResult) return {}
    const grouped: Record<string, LookupResult[]> = {}
    activeResult.results.forEach((result) => {
      const type = result._lookup_type || "unknown"
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(result)
    })
    return grouped
  }, [activeResult])

  // Only show types that have actual results
  const lookupTypes = Object.keys(resultsByType)
    .filter(type => resultsByType[type].length > 0)
    .sort()

  // Filter types that have actual data (not just errors) for overview
  const typesWithData = lookupTypes.filter(type => 
    resultsByType[type].some(result => {
      if (result.error) return false
      const dataFields = Object.keys(result).filter(k => !k.startsWith('_'))
      return dataFields.length > 0
    })
  )

  return (
    <Card className="h-full flex flex-col rounded-br-lg rounded-bl-none rounded-t-none">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{activeResult ? activeResult.indicator : "Lookup Results"}</CardTitle>
          {activeResult && (
            <Badge variant="secondary" className="text-sm">
              {activeResult.results.length} results
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {!activeResult ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No results yet</AlertTitle>
            <AlertDescription>
              Add indicators and run a lookup to see results here
            </AlertDescription>
          </Alert>
        ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {lookupTypes.map((type) => (
              <TabsTrigger key={type} value={type}>
                {LOOKUP_LABELS[type] || type}
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                  {resultsByType[type].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab - Grid Layout */}
          <TabsContent value="overview" className="space-y-6">
            {typesWithData.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No data available</AlertTitle>
                <AlertDescription>
                  No results were returned from the lookups
                </AlertDescription>
              </Alert>
            ) : (
              typesWithData.map((type) => {
                const typeResults = resultsByType[type]
                
                return (
                  <div key={type} className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {LOOKUP_LABELS[type] || type}
                      </Badge>
                      {typeResults[0]?._provider && (
                        <span className="text-xs text-muted-foreground">
                          • {typeResults[0]._provider}
                        </span>
                      )}
                    </h3>
                    
                    {typeResults.map((result, idx) => {
                      const dataFields = Object.entries(result).filter(([key]) => !key.startsWith("_"))
                      
                      // Skip this result if it has an error or no data
                      if (result.error || dataFields.length === 0) return null
                      
                      return (
                        <div key={idx}>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {dataFields.map(([key, value]) => (
                              <div key={key} className="rounded-lg border p-3">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                  {key.replace(/_/g, " ")}
                                </div>
                                <div className="font-mono text-xs break-all">
                                  {Array.isArray(value)
                                    ? value.join(", ")
                                    : value === null || value === undefined || value === ""
                                    ? "—"
                                    : String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </TabsContent>

          {/* Type-specific tabs */}
          {lookupTypes.map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {resultsByType[type].map((result, idx) => (
                <div key={idx}>
                  {idx > 0 && <Separator className="my-4" />}
                  <div className="space-y-4">
                    {result._provider && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Provider:</span>
                        <Badge variant="outline">{result._provider}</Badge>
                      </div>
                    )}

                    {result.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {result.error}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(result)
                          .filter(([key]) => !key.startsWith("_"))
                          .map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[200px_1fr] gap-4 text-sm">
                              <div className="font-medium text-muted-foreground">
                                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </div>
                              <div className="font-mono text-sm break-all">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : value === null || value === undefined
                                  ? "—"
                                  : String(value)}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

