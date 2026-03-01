import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"

import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { apiGet } from "@/shared/lib/api"

type AppItem = {
  name: string
  path: string
}

type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  items: T[]
}

export default function HomePage() {
  const appsQuery = useQuery({
    queryKey: ["apps"],
    queryFn: () => apiGet<PaginatedResponse<AppItem>>("/applications/"),
  })
  const appsData = appsQuery.data?.items ?? []

  const subtitleByAppName: Record<string, string> = {
    "Intelligence Harvester": "Investigate indicators and enrich findings.",
    "Domain Monitoring": "Track domain activity and infrastructure changes.",
    "Text Formatter": "Normalize and clean text for analyst workflows.",
    "URL Decoder": "Decode and inspect suspicious URLs safely.",
    "Website Screenshot": "Capture website snapshots for quick review.",
    "Mail Header Analyzer": "Parse message headers and routing details.",
    "Anomali ThreatStream Search": "Search ThreatStream intelligence records.",
    "Microsoft Active Directory Validator": "Validate and inspect Active Directory data.",
  }

  const appsStatusLabel = appsQuery.isLoading
    ? "Loading apps..."
    : appsQuery.isError
      ? "Apps unavailable"
      : `${appsData.length} app${appsData.length === 1 ? "" : "s"} available`

  return (
    <div className="space-y-10 p-6">
      <section id="apps-section" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Apps</h2>
            <p className="text-sm text-muted-foreground">
              Your CTI workspaces in one place. {appsStatusLabel}
            </p>
          </div>
          <Button variant="outline" onClick={() => appsQuery.refetch()}>
            Refresh apps
          </Button>
        </div>

        {appsQuery.isError && (
          <Card>
            <CardHeader>
              <CardTitle>Apps unavailable</CardTitle>
              <CardDescription>Unable to load apps from the API.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {appsQuery.isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <Card key={`app-skeleton-${index}`}>
                  <CardHeader className="pb-2">
                    <div className="h-10 w-10 rounded-md bg-muted" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-3 w-full rounded bg-muted/60" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-full rounded bg-muted/60" />
                  </CardContent>
                </Card>
              ))
            : appsData.map((app) => (
                <Card
                  key={app.name}
                  className="border-border/70 bg-card transition-colors hover:border-border hover:bg-accent/20"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-muted text-foreground"
                      >
                        {app.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                    </div>
                    <CardTitle className="text-base">{app.name}</CardTitle>
                    <CardDescription>
                      {subtitleByAppName[app.name] ?? `Open ${app.name} tools and workflows.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={app.path}>
                        Open
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}

          {!appsQuery.isLoading && !appsQuery.isError && appsData.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardHeader>
                <CardTitle>No apps configured</CardTitle>
                <CardDescription>
                  No application entries were returned by the API.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}

