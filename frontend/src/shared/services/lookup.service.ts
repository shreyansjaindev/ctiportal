/**
 * Lookup orchestration service
 * Handles indicator lookups across multiple providers with provider-aware routing
 */

import * as aggregators from "@/shared/lib/aggregators"
import type { LookupType, IndicatorType, LookupResult, Provider } from "@/shared/types/intelligence-harvester"

export interface LookupRequest {
  indicator: string
  indicatorType: IndicatorType
  selectedTypes: Set<LookupType>
  providers_by_type: Record<string, Provider[]>
  getProviderForType: (type: LookupType) => string[]
  token: string
}

/**
 * Check if a lookup type is applicable to an indicator type
 */
export function isLookupApplicable(type: LookupType, indicatorType: IndicatorType | undefined): boolean {
  if (!indicatorType) return false
  
  const applicabilityMap: Record<LookupType, IndicatorType[]> = {
    whois: ["domain"],
    whois_history: ["domain"],
    dns: ["domain"],
    passive_dns: ["domain"],
    ip_info: ["ipv4", "ipv6"],
    reverse_dns: ["ipv4", "ipv6"],
    reputation: ["ipv4", "ipv6", "domain", "md5", "sha1", "sha256"],
    screenshot: ["domain"],
    email_validator: ["email"],
    website_details: ["domain", "url", "ipv4"],
    cve_details: ["cve"],
  }

  return applicabilityMap[type]?.includes(indicatorType) ?? false
}

/**
 * Resolve provider IDs for a lookup type
 * Returns empty array if no providers selected
 */
function resolveProviders(
  _type: LookupType,
  providerValue: string[],
  availableProviders?: Provider[]
): string[] {
  if (!Array.isArray(providerValue) || providerValue.length === 0) {
    return []
  }

  if (!availableProviders) return []

  const providerIds = availableProviders.map((p) => p.id)
  return providerValue.filter((p) => providerIds.includes(p))
}

/**
 * Execute all applicable lookups for a single indicator
 * Uses unified backend search endpoint
 */
export async function executeIndicatorLookups(request: LookupRequest): Promise<LookupResult[]> {
  const { indicator, indicatorType, selectedTypes, providers_by_type, getProviderForType, token } = request

  const typesToRun = Array.from(selectedTypes).filter((type) => isLookupApplicable(type, indicatorType))

  if (typesToRun.length === 0) {
    return []
  }

  // Build providers_by_type object only with selected providers
  const providersForLookup: Record<string, string[]> = {}
  typesToRun.forEach((type) => {
    const providerValue = getProviderForType(type)
    const availableProviders = providers_by_type[type as keyof typeof providers_by_type]
    const resolvedProviders = resolveProviders(type, providerValue, availableProviders)
    
    console.log(`[Lookup] Type: ${type}, selected providers: ${providerValue}, available: ${availableProviders?.length || 0}, resolved: ${resolvedProviders.length}`)
    
    // If no providers selected, use all available providers for this type
    if (resolvedProviders.length > 0) {
      providersForLookup[type] = resolvedProviders
    } else if (availableProviders && availableProviders.length > 0) {
      // Fallback: use all available providers for this lookup type
      providersForLookup[type] = availableProviders.map(p => p.id)
    }
  })

  console.log("[Lookup] Final providers for lookup:", providersForLookup)

  // Check if we have any providers to lookup with
  if (Object.keys(providersForLookup).length === 0) {
    throw new Error("No providers available for the requested lookup types")
  }

  // Send batch lookup request to backend
  const response = await aggregators.performIndicatorLookups(
    [indicator],
    providersForLookup,
    token
  )

  console.log("[Lookup] Backend response:", response)

  // Transform response to match LookupResult format
  const indicatorResult = response.results[0]
  console.log("[Lookup] indicatorResult:", indicatorResult)
  
  if (!indicatorResult) {
    console.warn("[Lookup] No result found for indicator")
    return []
  }
  
  // Validate results is an array before mapping
  if (!Array.isArray(indicatorResult.results)) {
    console.warn("[Lookup] indicatorResult.results is not an array:", indicatorResult.results)
    return []
  }

  const mappedResults = indicatorResult.results.map((result) => ({
    ...result,
    _lookup_type: result._lookup_type as LookupType,
  })) as LookupResult[]
  
  console.log("[Lookup] Mapped results count:", mappedResults.length)
  if (mappedResults.length > 0) {
    const firstResult = mappedResults[0]
    console.log("[Lookup] First result _lookup_type:", firstResult._lookup_type)
    console.log("[Lookup] First result _provider:", firstResult._provider)
    console.log("[Lookup] First result has error?", firstResult.error)
    console.log("[Lookup] First result essential:", firstResult.essential)
    console.log("[Lookup] First result additional:", firstResult.additional)
    console.log("[Lookup] First result keys:", Object.keys(firstResult))
  }
  return mappedResults
}

