import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listMonitoredDomains } from "../services"
import type { QueryParams } from "../types"

export const monitoredDomainsQueryOptions = (params: QueryParams, token: string) =>
  queryOptions({
    queryKey: ["monitored-domains", params],
    queryFn: () => listMonitoredDomains(params, token),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
