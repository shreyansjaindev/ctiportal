/**
 * API client for aggregator endpoints with provider selection
 * @module lib/aggregators
 */

import { apiGet, apiPost, apiPostBlob } from "./api"
import type { IndicatorType, ProvidersMetadata } from "@/shared/types/intelligence-harvester"

const HARVESTER_BULK_TIMEOUT_MS = 90000

/**
 * Request for performing indicator lookups
 */
export interface IndicatorLookupRequest {
  indicators: string[]
  providers_by_type: Record<string, string[]>
}

/**
 * Single lookup result from a provider
 */
export interface LookupResult {
  _lookup_type: string
  _provider: string
  [key: string]: unknown
}

/**
 * Results for a single indicator
 */
export interface IndicatorResult {
  indicator: string
  indicator_type: string
  results: LookupResult[]
}

/**
 * Complete lookup response
 */
export interface IndicatorLookupResponse {
  results: IndicatorResult[]
  indicator_types: Record<string, string>
}

/**
 * Identify indicator types using backend classification
 * 
 * @param {string[]} indicators - Array of indicator values to classify
 * @returns {Promise<Array<{value: string, type: IndicatorType}>>} Array of indicators with detected types
 * 
 * @example
 * const results = await identifyIndicators(['8.8.8.8', 'google.com'])
 * // returns [{ value: '8.8.8.8', type: 'ipv4' }, { value: 'google.com', type: 'domain' }]
 */
export async function identifyIndicators(
  indicators: string[]
): Promise<Array<{ value: string; type: IndicatorType }>> {
  return apiPost<Array<{ value: string; type: IndicatorType }>>(
    "/intelligence-harvester/identifier/", 
    JSON.stringify({ indicators })
  )
}

/**
 * Execute indicator lookups with providers
 * 
 * Performs batch lookups across multiple indicators using specified providers.
 * Lookup types are derived from the providers_by_type keys.
 * 
 * @param indicators - Array of indicator values to lookup
 * @param providers_by_type - Mapping of lookup type to selected provider IDs
 * @returns Structured results organized by indicator
 * 
 * @throws {ApiError} If request fails or is invalid
 * 
 * @example
 * const response = await performIndicatorLookups(
 *   ['example.com'],
 *   { whois: ['whoisxmlapi'], reputation: ['abuseipdb'] }
 * )
 */
export async function performIndicatorLookups(
  indicators: string[],
  providers_by_type: Record<string, string[]>
): Promise<IndicatorLookupResponse> {
  const request: IndicatorLookupRequest = {
    indicators,
    providers_by_type,
  }
  
  return apiPost<IndicatorLookupResponse>(
    "/intelligence-harvester/search/",
    JSON.stringify(request),
    "application/json",
    { timeout: HARVESTER_BULK_TIMEOUT_MS }
  )
}

export async function exportIndicatorLookupsExcel(
  indicators: string[],
  providers_by_type: Record<string, string[]>
): Promise<Blob> {
  const request: IndicatorLookupRequest = {
    indicators,
    providers_by_type,
  }

  return apiPostBlob(
    "/intelligence-harvester/search/?format=xlsx",
    JSON.stringify(request),
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    { timeout: HARVESTER_BULK_TIMEOUT_MS }
  )
}

/**
 * Provider Management
 */
export async function getAllProviders(): Promise<ProvidersMetadata> {
  return apiGet<ProvidersMetadata>("/intelligence-harvester/providers/")
}
