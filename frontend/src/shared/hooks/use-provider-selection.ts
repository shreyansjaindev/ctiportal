import { useState, useMemo, useEffect } from "react"
import type { LookupType } from "@/shared/types/intelligence-harvester"
import { ALL_LOOKUP_TYPES, DEFAULT_PROVIDER_SELECTIONS } from "@/shared/lib/lookup-config"

/** Provider value — always an array of provider IDs (empty = disabled) */
export type ProviderValue = string[]

/** Provider selections keyed by LookupType — single source of truth */
export type ProviderSelections = Record<LookupType, ProviderValue>

const STORAGE_KEY = "intelligenceHarvester_providerConfig"

function buildDefaults(): ProviderSelections {
  return Object.fromEntries(
    ALL_LOOKUP_TYPES.map(type => [type, DEFAULT_PROVIDER_SELECTIONS[type] ?? []])
  ) as ProviderSelections
}

function loadFromStorage(): ProviderSelections {
  const defaults = buildDefaults()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaults
    const parsed = JSON.parse(stored) as Partial<ProviderSelections>
    return Object.fromEntries(
      ALL_LOOKUP_TYPES.map(type => [
        type,
        Array.isArray(parsed[type])
          ? parsed[type]!
          : defaults[type],
      ])
    ) as ProviderSelections
  } catch {
    return defaults
  }
}

/**
 * Custom hook for managing provider selection state across all lookup types.
 * Persists configuration to localStorage.
 *
 * @example
 * const { selections, setProviderForType, enabledTypes } = useProviderSelection()
 * setProviderForType("whois", ["builtin_whois", "whoisxmlapi"])
 */
export function useProviderSelection() {
  const [providers, setProviders] = useState<ProviderSelections>(() => loadFromStorage())

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(providers)) } catch { /* ignore */ }
  }, [providers])

  const setProviderForType = useMemo(
    () => (type: LookupType, value: ProviderValue) =>
      setProviders(prev => ({ ...prev, [type]: value })),
    []
  )

  const enabledTypes = useMemo(() => {
    const types = new Set<LookupType>()
    for (const [type, value] of Object.entries(providers) as [LookupType, ProviderValue][]) {
      if (value.length > 0) types.add(type)
    }
    return types
  }, [providers])

  const getProviderForType = useMemo(
    () => (type: LookupType): ProviderValue => providers[type] ?? [],
    [providers]
  )

  return { selections: providers, setProviderForType, enabledTypes, getProviderForType }
}

