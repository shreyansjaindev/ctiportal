/**
 * Lookup orchestration service
 * Handles indicator lookups across multiple providers with provider-aware routing
 */

import * as aggregators from "@/shared/lib/aggregators"
import type { LookupType, IndicatorType, LookupResult, Provider } from "@/shared/types/intelligence-harvester"
import { APPLICABLE_INDICATORS } from "@/shared/lib/lookup-config"

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
  return APPLICABLE_INDICATORS[type]?.includes(indicatorType) ?? false
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

    if (resolvedProviders.length > 0) {
      providersForLookup[type] = resolvedProviders
    }
  })

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

  // Transform response to match LookupResult format
  const indicatorResult = response.results[0]

  if (!indicatorResult) {
    return []
  }

  // Validate results is an array before mapping
  if (!Array.isArray(indicatorResult.results)) {
    return []
  }

  return indicatorResult.results.map((result) => ({
    ...result,
    _lookup_type: result._lookup_type as LookupType,
  })) as LookupResult[]
}

