import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listMonitoredDomainAlerts } from "../services"
import type { QueryParams } from "../types"

export const alertsQueryOptions = (params: QueryParams, token: string) =>
  queryOptions({
    queryKey: ["monitored-domain-alerts", params],
    queryFn: () => listMonitoredDomainAlerts(params, token),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
