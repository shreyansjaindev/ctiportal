import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listLookalikeDomains } from "../services"
import type { QueryParams } from "../types"

export const lookalikesQueryOptions = (params: QueryParams, token: string) =>
  queryOptions({
    queryKey: ["lookalike-domains", params],
    queryFn: () => listLookalikeDomains(params, token),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
