import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { apiGet } from "@/shared/lib/api"
import { useAuth } from "@/shared/lib/auth"

type AppItem = {
  name: string
  path: string
  color?: string
  icon?: string
  image?: string
  quick_link?: boolean
}

type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  items: T[]
}

const appColorClass: Record<string, string> = {
  "label-primary": "bg-blue-500/10 text-blue-700",
  "label-dark": "bg-neutral-900/10 text-neutral-800",
  "label-warning": "bg-amber-500/10 text-amber-700",
  "label-danger": "bg-red-500/10 text-red-700",
  "label-success": "bg-emerald-500/10 text-emerald-700",
  "label-info": "bg-sky-500/10 text-sky-700",
  light: "bg-neutral-500/10 text-neutral-700",
}

const routeMap: Record<string, string> = {
  "Intelligence Harvester": "/intelligence-harvester",
  "Domain Monitoring": "/domain-monitoring",
  "Text Formatter": "/text-formatter",
  "URL Decoder": "/url-decoder",
  "Website Screenshot": "/screenshot",
  "Mail Header Analyzer": "/mail-header-analyzer",
  "Anomali ThreatStream Search": "/threatstream",
  "Microsoft Active Directory Validator": "/active-directory",
}

export default function HomePage() {
  const { token } = useAuth()
  const appsQuery = useQuery({
    queryKey: ["apps"],
    queryFn: () => apiGet<PaginatedResponse<AppItem>>("/applications/", token),
  })
  const appsData = appsQuery.data?.items ?? []

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Badge className="w-fit">Live Intelligence Feed</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            See emerging threats before they trend.
          </h1>
          <p className="text-lg text-muted-foreground">
            Correlate domains, infrastructure, and attacker TTPs into a single,
            analyst-ready view.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">Start a Hunt</Button>
            <Button variant="outline" size="lg">
              Explore Intelligence
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Quick Triage</CardTitle>
            <CardDescription>
              Paste an indicator to see enrichment and context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use the tools in the sidebar to run quick enrichment tasks.</p>
            <div className="rounded-md border bg-background p-4">
              <p className="font-medium text-foreground">System status</p>
              <p className="mt-1">All integrations operational.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Apps</h2>
            <p className="text-sm text-muted-foreground">
              Quick access to CTI workflows.
            </p>
          </div>
          <Button variant="outline">Manage apps</Button>
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
                  className="transition hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                          (app.color && appColorClass[app.color]) ??
                          "bg-neutral-500/10 text-neutral-700"
                        }`}
                      >
                        {app.image ? (
                          <img
                            src={app.image}
                            alt={app.name}
                            className="h-6 w-6"
                          />
                        ) : (
                          app.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                        )}
                      </span>
                      <Badge variant="secondary">Launch</Badge>
                    </div>
                    <CardTitle className="text-base">{app.name}</CardTitle>
                    <CardDescription>
                      Open the {app.name} workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={routeMap[app.name] ?? "/"}>
                        Open
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>
    </div>
  )
}

