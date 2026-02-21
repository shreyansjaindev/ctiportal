import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listNewlyRegisteredDomains } from "../services"
import type { QueryParams } from "../types"

export const nrdsQueryOptions = (params: QueryParams, token: string) =>
  queryOptions({
    queryKey: ["newly-registered-domains", params],
    queryFn: () => listNewlyRegisteredDomains(params, token),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
