import { useQuery } from "@tanstack/react-query"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { apiGet } from "@/shared/lib/api"
import { useAuth } from "@/shared/lib/auth"

type TabItem = {
  id: string
  label: string
  active: boolean
  badge_count: number
  headers: string[]
}

type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  items: T[]
}

export default function DomainMonitoringPage() {
  const { token } = useAuth()
  const tabsQuery = useQuery({
    queryKey: ["domain-tabs"],
    queryFn: () =>
      apiGet<PaginatedResponse<TabItem>>("/domain-monitoring/tabs/", token),
  })
  const tabsData = tabsQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {tabsQuery.isLoading && <p>Loading monitoring tabs...</p>}
        {tabsData.map((tab) => (
          <Card key={tab.id}>
            <CardHeader>
              <CardTitle>{tab.label}</CardTitle>
              <CardDescription>
                Columns: {tab.headers.length} - Alerts: {tab.badge_count}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground">
                {tab.headers.slice(0, 5).map((header) => (
                  <li key={header}>- {header || "-"}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

