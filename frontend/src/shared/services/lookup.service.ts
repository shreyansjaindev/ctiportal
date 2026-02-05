/**
 * Lookup orchestration service
 * Handles indicator lookups across multiple providers with provider-aware routing
 */

import * as aggregators from "@/shared/lib/aggregators"
import type { LookupType, IndicatorKind, LookupResult, Provider } from "@/shared/types/intelligence-harvester"

export interface LookupRequest {
  indicator: string
  kind: IndicatorKind
  selectedTypes: Set<LookupType>
  providers_by_type: Record<string, Provider[]>
  getProviderForType: (type: LookupType) => string | string[]
  token: string
}

/**
 * Check if a lookup type is applicable to an indicator kind
 */
export function isLookupApplicable(type: LookupType, kind: IndicatorKind): boolean {
  const applicabilityMap: Record<LookupType, IndicatorKind[]> = {
    whois: ["domain"],
    whois_history: ["domain"],
    dns: ["domain"],
    passive_dns: ["domain"],
    ip_info: ["ip"],
    reverse_dns: ["ip"],
    reputation: ["ip", "domain", "hash"],
    screenshot: ["domain"],
    email_validator: ["email"],
    web_search: ["domain"],
    website_status: ["domain"],
    vulnerability: ["cve"],
  }

  return applicabilityMap[type]?.includes(kind) ?? false
}

/**
 * Resolve provider IDs for a lookup type
 * Returns empty array if providers should not be used (disabled or auto mode)
 */
function resolveProviders(
  _type: LookupType,
  providerValue: string | string[],
  availableProviders?: Provider[]
): string[] {
  // Handle array values (multi-select)
  if (Array.isArray(providerValue)) {
    if (providerValue.length === 0 || providerValue[0] === "none") return []
    if (providerValue[0] === "auto") return []

    if (!availableProviders) return []

    const providerIds = availableProviders.map((p) => p.id)
    return providerValue.filter((p) => providerIds.includes(p))
  }

  // Handle string values (backward compatibility)
  if (providerValue === "auto" || providerValue === "none") return []
  if (providerValue === "all") return []

  if (!availableProviders) return []

  const providerIds = availableProviders.map((p) => p.id)
  return providerIds.includes(providerValue) ? [providerValue] : []
}

/**
 * Execute all applicable lookups for a single indicator
 * Uses unified backend search endpoint
 */
export async function executeIndicatorLookups(request: LookupRequest): Promise<LookupResult[]> {
  const { indicator, kind, selectedTypes, providers_by_type, getProviderForType, token } = request

  const typesToRun = Array.from(selectedTypes).filter((type) => isLookupApplicable(type, kind))

  if (typesToRun.length === 0) {
    // No applicable lookup types for this indicator kind
    return []
  }

  // Build providers_by_type object only with selected providers
  const providersForLookup: Record<string, string[]> = {}
  typesToRun.forEach((type) => {
    const providerValue = getProviderForType(type)
    const availableProviders = providers_by_type[type as keyof typeof providers_by_type]
    const resolvedProviders = resolveProviders(type, providerValue, availableProviders)
    
    // Only include in request if there are providers selected
    if (resolvedProviders.length > 0) {
      providersForLookup[type] = resolvedProviders
    }
  })

  // Send batch lookup request to backend
  const response = await aggregators.performIndicatorLookups(
    [indicator],
    providersForLookup,
    token
  )

  // Transform response to match LookupResult format
  const indicatorResult = response.results[0]
  if (!indicatorResult) return []
  
  // Validate results is an array before mapping
  if (!Array.isArray(indicatorResult.results)) return []

  return indicatorResult.results.map((result) => ({
    ...result,
    _lookup_type: result._lookup_type as LookupType,
  })) as LookupResult[]
}

