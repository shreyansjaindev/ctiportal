import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/lib"

import type {
  BulkCreateResult,
  BulkDeleteResult,
  BulkUpdateResult,
  Company,
  IntegrationQueueResult,
  IntegrationResult,
  LookalikeDomain,
  LookalikeDomainPayload,
  NewlyRegisteredDomain,
  PaginatedResponse,
  QueryParams,
  WatchedResource,
  WatchedResourcePayload,
  MonitoredDomain,
  MonitoredDomainAlert,
} from "../types"

const BASE_PATH = "/domain-monitoring"

function buildQuery(params?: QueryParams): string {
  if (!params) return ""

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        searchParams.append(key, String(item))
      })
      return
    }
    searchParams.append(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

// ============================================================================
// COMPANY OPERATIONS
// ============================================================================

export async function listCompanies(token: string): Promise<Company[]> {
  const response = await apiGet<PaginatedResponse<Company>>(
    `${BASE_PATH}/companies/?limit=1000`,
    token
  )
  return response.items
}

export async function listWatchedResourcesSimple(token: string): Promise<WatchedResource[]> {
  const response = await apiGet<PaginatedResponse<WatchedResource>>(
    `${BASE_PATH}/watched-resources/?limit=1000`,
    token
  )
  return response.items
}

// ============================================================================
// WATCHED RESOURCES
// ============================================================================

// Watched Resources
export async function listWatchedResources(
  params: QueryParams | undefined,
  token: string
): Promise<PaginatedResponse<WatchedResource>> {
  return apiGet<PaginatedResponse<WatchedResource>>(
    `${BASE_PATH}/watched-resources/${buildQuery(params)}`,
    token
  )
}

export async function getWatchedResource(
  id: number,
  token: string
): Promise<WatchedResource> {
  return apiGet<WatchedResource>(`${BASE_PATH}/watched-resources/${id}/`, token)
}

export async function createWatchedResource(
  payload: WatchedResourcePayload,
  token: string
): Promise<WatchedResource> {
  return apiPost<WatchedResource>(
    `${BASE_PATH}/watched-resources/`,
    JSON.stringify(payload),
    token
  )
}

export async function updateWatchedResource(
  id: number,
  payload: Partial<WatchedResourcePayload>,
  token: string
): Promise<WatchedResource> {
  return apiPatch<WatchedResource>(
    `${BASE_PATH}/watched-resources/${id}/`,
    JSON.stringify(payload),
    token
  )
}

export async function deleteWatchedResource(
  id: number,
  token: string
): Promise<null> {
  return apiDelete<null>(`${BASE_PATH}/watched-resources/${id}/`, token)
}

// Lookalike Domains
export async function listLookalikeDomains(
  params: QueryParams | undefined,
  token: string
): Promise<PaginatedResponse<LookalikeDomain>> {
  return apiGet<PaginatedResponse<LookalikeDomain>>(
    `${BASE_PATH}/lookalike-domains/${buildQuery(params)}`,
    token
  )
}

export async function getLookalikeDomain(
  id: number,
  token: string
): Promise<LookalikeDomain> {
  return apiGet<LookalikeDomain>(`${BASE_PATH}/lookalike-domains/${id}/`, token)
}

export async function createLookalikeDomain(
  payload: LookalikeDomainPayload,
  token: string
): Promise<LookalikeDomain> {
  return apiPost<LookalikeDomain>(
    `${BASE_PATH}/lookalike-domains/`,
    JSON.stringify(payload),
    token
  )
}

export async function bulkCreateLookalikeDomains(
  payload: LookalikeDomainPayload[],
  token: string
): Promise<BulkCreateResult> {
  return apiPost<BulkCreateResult>(
    `${BASE_PATH}/lookalike-domains/`,
    JSON.stringify(payload),
    token
  )
}

export async function importLookalikeDomainsCSV(
  file: File,
  token: string
): Promise<BulkCreateResult> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`/api/v1${BASE_PATH}/lookalike-domains/import-csv/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Import failed' }))
    throw new Error(error.error || 'Failed to import CSV')
  }
  
  return response.json()
}

export async function updateLookalikeDomain(
  id: number,
  payload: Partial<LookalikeDomainPayload>,
  token: string
): Promise<LookalikeDomain> {
  return apiPatch<LookalikeDomain>(
    `${BASE_PATH}/lookalike-domains/${id}/`,
    JSON.stringify(payload),
    token
  )
}

export async function deleteLookalikeDomain(
  id: number,
  token: string
): Promise<null> {
  return apiDelete<null>(`${BASE_PATH}/lookalike-domains/${id}/`, token)
}

export async function bulkDeleteLookalikeDomains(
  ids: number[],
  token: string
): Promise<BulkDeleteResult> {
  return apiPost<BulkDeleteResult>(
    `${BASE_PATH}/lookalike-domains/bulk-delete/`,
    JSON.stringify({ ids }),
    token
  )
}

export async function bulkUpdateLookalikeDomains(
  ids: number[],
  status: string,
  token: string
): Promise<BulkUpdateResult> {
  return apiPatch<BulkUpdateResult>(
    `${BASE_PATH}/lookalike-domains/bulk-patch/`,
    JSON.stringify({ ids, status }),
    token
  )
}

// Newly Registered Domains (read-only)
export async function listNewlyRegisteredDomains(
  params: QueryParams | undefined,
  token: string
): Promise<PaginatedResponse<NewlyRegisteredDomain>> {
  return apiGet<PaginatedResponse<NewlyRegisteredDomain>>(
    `${BASE_PATH}/newly-registered-domains/${buildQuery(params)}`,
    token
  )
}

export async function getNewlyRegisteredDomain(
  id: number,
  token: string
): Promise<NewlyRegisteredDomain> {
  return apiGet<NewlyRegisteredDomain>(
    `${BASE_PATH}/newly-registered-domains/${id}/`,
    token
  )
}

// External integrations
export async function addDomainsToTrellix(
  domains: string[],
  token: string
): Promise<IntegrationQueueResult> {
  return apiPost<IntegrationQueueResult>(
    `${BASE_PATH}/integrations/trellix-etp/add-domains/`,
    JSON.stringify({ domains }),
    token
  )
}

export async function addDomainsToProofpoint(
  domains: string[],
  token: string
): Promise<IntegrationResult> {
  return apiPost<IntegrationResult>(
    `${BASE_PATH}/integrations/proofpoint/add-domains/`,
    JSON.stringify({ domains }),
    token
  )
}

export async function listMonitoredDomains(
  params: QueryParams | undefined,
  token: string
): Promise<PaginatedResponse<MonitoredDomain>> {
  return apiGet<PaginatedResponse<MonitoredDomain>>(
    `${BASE_PATH}/monitored-domains/${buildQuery(params)}`,
    token
  )
}

export async function listMonitoredDomainAlerts(
  params: QueryParams | undefined,
  token: string
): Promise<PaginatedResponse<MonitoredDomainAlert>> {
  return apiGet<PaginatedResponse<MonitoredDomainAlert>>(
    `${BASE_PATH}/monitored-domain-alerts/${buildQuery(params)}`,
    token
  )
}
