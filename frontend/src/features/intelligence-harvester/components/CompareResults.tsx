import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

type WhoisData = Record<string, string | string[] | number | boolean | null | undefined> & {
  error?: string
}

interface CompareResultsProps {
  domain: string
  providers: Record<string, WhoisData>
  providerCount: number
}

export function CompareResults({ domain, providers, providerCount }: CompareResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">WHOIS Provider Comparison</h3>
        <div className="text-sm text-muted-foreground">
          Domain: <span className="font-mono font-medium">{domain}</span>
          {" • "}
          {providerCount} providers
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(providers).map(([providerId, providerData]) => (
          <Card key={providerId}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {providerId}
                {providerData.error ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {providerData.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{providerData.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {Object.entries(providerData)
                    .filter(([key]) => !key.startsWith("_"))
                    .map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-4 text-sm">
                        <div className="font-medium text-muted-foreground">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                        </div>
                        <div className="col-span-2 font-mono break-all">
                          {Array.isArray(value)
                            ? value.join(", ")
                            : value === null
                            ? "N/A"
                            : String(value)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

