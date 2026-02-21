export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  items: T[]
}

export type Company = {
  id: number
  created: string
  last_modified: string
  name: string
  status: string
}

export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>

export type QueryParams = Record<string, QueryParamValue>

export type BulkCreateResult = {
  created: number
  failed: number
  errors: Array<{ index: number; error: string }>
}

export type BulkDeleteResult = {
  deleted: number
}

export type BulkUpdateResult = {
  updated: number
  failed: number
  errors: string[]
}

export type IntegrationQueueResult = {
  domains_count: number
  status: string
}

export type IntegrationResult = Record<string, unknown>

export type WatchedResource = {
  id: number
  created: string
  last_modified: string
  value: string
  resource_type: string
  properties: unknown[]
  exclude_keywords: unknown[]
  company: string
  status: string
}

export type WatchedResourcePayload = {
  value: string
  resource_type: string
  company: string
  status?: string
  properties?: unknown[]
  exclude_keywords?: unknown[]
}

export type NewlyRegisteredDomain = {
  id: number
  created: string
  source_date: string
  value: string
}

export type LookalikeDomainComment = {
  id: number
  created: string
  last_modified: string
  text: string
  lookalike_domain: number
  user: number | null
  username?: string
}

export type LookalikeDomain = {
  id: number
  created: string
  last_modified: string
  source_date: string
  value: string
  source: string
  watched_resource: string
  potential_risk: string
  status: string
  company: string
  is_monitored?: string
  comments?: LookalikeDomainComment[]
}

export type LookalikeDomainPayload = {
  source_date: string
  value: string
  source: string
  watched_resource: string
  potential_risk?: string
  status?: string
  company: string
}
