import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { listWatchedResources } from "../services"
import type { QueryParams } from "../types"

export const watchedResourcesQueryOptions = (params: QueryParams) =>
  queryOptions({
    queryKey: ["watched-resources", params],
    queryFn: () => listWatchedResources(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
