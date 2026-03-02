import type { LookupResult, LookupType } from "@/shared/types/intelligence-harvester"
import type * as aggregators from "@/shared/lib/aggregators"
import { ALL_LOOKUP_TYPES } from "@/shared/lib/lookup-config"
import type { Provider } from "@/shared/types/intelligence-harvester"

/**
 * Merges incoming results into an existing array.
 * Results with the same type+provider key overwrite older ones.
 */
export function mergeResults(existing: LookupResult[], incoming: LookupResult[]): LookupResult[] {
  const byKey = new Map<string, LookupResult>()
  existing.forEach((result) => byKey.set(`${result._lookup_type}::${result._provider ?? "unknown"}`, result))
  incoming.forEach((result) => byKey.set(`${result._lookup_type}::${result._provider ?? "unknown"}`, result))
  return Array.from(byKey.values())
}

export function mergeIndicatorResults(
  response: aggregators.IndicatorLookupResponse,
  updateResults: (indicator: string, newResults: LookupResult[]) => void
) {
  response.results.forEach(({ indicator, results }) => {
    if (results.length > 0) {
      updateResults(indicator, results as LookupResult[])
    }
  })
}

export function createEmptyProvidersByType(): Record<LookupType, []> {
  return {
    whois: [],
    ip_info: [],
    reputation: [],
    dns: [],
    passive_dns: [],
    subdomains: [],
    whois_history: [],
    reverse_dns: [],
    screenshot: [],
    email_validator: [],
    cve_details: [],
    web_redirects: [],
    web_scan: [],
  }
}

export function removeIndicatorsFromMap<T>(source: Map<string, T>, indicatorsToRemove: Iterable<string>) {
  const next = new Map(source)
  for (const indicator of indicatorsToRemove) {
    next.delete(indicator)
  }
  return next
}

function serializeSelection(values: string[] | undefined) {
  return [...(values ?? [])].sort().join(",")
}

export function getChangedLookupTypes(
  previous: Partial<Record<LookupType, string[]>>,
  current: Partial<Record<LookupType, string[]>>
) {
  return ALL_LOOKUP_TYPES.filter((type) => serializeSelection(previous[type]) !== serializeSelection(current[type]))
}

export function loadStoredIndicators() {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("ih.indicators")
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch (error) {
    console.error("Failed to parse stored indicators from localStorage:", error)
    return []
  }
}

export function persistIndicators(indicators: string[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("ih.indicators", JSON.stringify(indicators))
}

export function buildProvidersPayloadForTypes(
  types: Iterable<LookupType>,
  providersByType: Record<LookupType, Provider[]>,
  getProviderForType: (type: LookupType) => string[]
) {
  const providersForLookup: Record<string, string[]> = {}

  Array.from(types).forEach((type) => {
    const availableProviders = providersByType[type] ?? []
    const availableIds = new Set(availableProviders.map((provider) => provider.id))
    const selectedProviders = getProviderForType(type).filter((providerId) => availableIds.has(providerId))

    if (selectedProviders.length > 0) {
      providersForLookup[type] = selectedProviders
    }
  })

  return providersForLookup
}

export function requireProvidersPayload(
  types: Iterable<LookupType>,
  providersByType: Record<LookupType, Provider[]>,
  getProviderForType: (type: LookupType) => string[],
  errorMessage: string
) {
  const providersForLookup = buildProvidersPayloadForTypes(types, providersByType, getProviderForType)

  if (Object.keys(providersForLookup).length === 0) {
    throw new Error(errorMessage)
  }

  return providersForLookup
}
