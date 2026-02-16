import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { cn } from "@/shared/lib/utils"
import { useMemo } from "react"
import { Info } from "lucide-react"
import type { IndicatorResult, LookupResult } from "@/shared/types/intelligence-harvester"

// Import display components
import { WebsiteStatusDisplay } from "./displays/WebsiteStatusDisplay"
import { DnsDisplay } from "./displays/DnsDisplay"
import { WhoisDisplay } from "./displays/WhoisDisplay"
import { ReputationDisplay } from "./displays/ReputationDisplay"
import { DefaultDisplay } from "./displays/DefaultDisplay"

interface LookupResultsProps {
  results: IndicatorResult[]
  activeIndicator: string | null
  isLoading?: boolean
  className?: string
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

// Router function to select the appropriate display component
function getDisplayComponent(lookupType: string, result: LookupResult, isOverview: boolean) {
  switch (lookupType) {
    case "website_status":
      return <WebsiteStatusDisplay result={result} isOverview={isOverview} />
    case "dns":
      return <DnsDisplay result={result} isOverview={isOverview} />
    case "whois":
      return <WhoisDisplay result={result} isOverview={isOverview} />
    case "reputation":
      return <ReputationDisplay result={result} isOverview={isOverview} />
    default:
      return <DefaultDisplay result={result} isOverview={isOverview} />
  }
}

export function LookupResults({ results, activeIndicator, isLoading = false, className }: LookupResultsProps) {
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
      // Only show types with essential data in overview
      const hasEssential = result.essential && Object.keys(result.essential).length > 0
      return hasEssential
    })
  )

  return (
    <Card className={cn("h-full flex flex-col rounded-br-lg rounded-bl-none rounded-t-none", className)}>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-4">
                  <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-32 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : !activeResult ? (
          <div className="p-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No results yet</AlertTitle>
              <AlertDescription>
                Add indicators and run a lookup to see results here
              </AlertDescription>
            </Alert>
          </div>
        ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto px-6">
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

          {/* Overview Tab - Essential Fields Only */}
          <TabsContent value="overview" className="space-y-6 px-6 py-4">
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
                    </h3>
                    
                    {typeResults.map((result, idx) => {
                      // Skip results with errors or no essential data
                      if (result.error || !result.essential || Object.keys(result.essential).length === 0) return null
                      
                      return (
                        <div key={idx}>
                          {result._provider && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-muted-foreground">
                                {result._provider}
                              </span>
                            </div>
                          )}
                          {getDisplayComponent(type, result, true)}
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
            <TabsContent key={type} value={type} className="space-y-4 px-6 py-4">
              {resultsByType[type].map((result, idx) => (
                <div key={idx}>
                  {idx > 0 && <div className="my-6 border-t" />}
                  <div className="space-y-4">
                    {result._provider && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{result._provider}</Badge>
                      </div>
                    )}
                    {getDisplayComponent(type, result, false)}
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

export default LookupResults

