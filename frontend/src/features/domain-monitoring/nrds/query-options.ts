import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listNewlyRegisteredDomains } from "../services"
import type { QueryParams } from "../types"

export const nrdsQueryOptions = (params: QueryParams) =>
  queryOptions({
    queryKey: ["newly-registered-domains", params],
    queryFn: () => listNewlyRegisteredDomains(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
