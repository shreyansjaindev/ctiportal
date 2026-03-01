import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listMonitoredDomainAlerts } from "../services"
import type { QueryParams } from "../types"

export const alertsQueryOptions = (params: QueryParams) =>
  queryOptions({
    queryKey: ["monitored-domain-alerts", params],
    queryFn: () => listMonitoredDomainAlerts(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
