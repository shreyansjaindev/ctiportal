import { useState, useMemo, useCallback, useEffect } from "react"
import type { LookupType } from "@/shared/types/intelligence-harvester"

/**
 * Provider value type - always an array of provider IDs
 * "none" is represented as empty array for consistency
 */
export type ProviderValue = string[]

/**
 * Provider selection state for all lookup types
 */
export interface ProviderSelection {
  whois: ProviderValue
  geoLocation: ProviderValue
  reputation: ProviderValue
  dns: ProviderValue
  passiveDns: ProviderValue
  whoisHistory: ProviderValue
  reverseDns: ProviderValue
  screenshot: ProviderValue
  emailValidator: ProviderValue
  cveDetails: ProviderValue
  websiteStatus: ProviderValue
}

export interface ProviderSelectionSetters {
  setWhois: (value: ProviderValue) => void
  setGeoLocation: (value: ProviderValue) => void
  setReputation: (value: ProviderValue) => void
  setDns: (value: ProviderValue) => void
  setPassiveDns: (value: ProviderValue) => void
  setWhoisHistory: (value: ProviderValue) => void
  setReverseDns: (value: ProviderValue) => void
  setScreenshot: (value: ProviderValue) => void
  setEmailValidator: (value: ProviderValue) => void
  setCveDetails: (value: ProviderValue) => void
  setWebsiteStatus: (value: ProviderValue) => void
}

// Mapping between display keys and API lookup types
const KEY_TO_LOOKUP_TYPE: Record<keyof ProviderSelection, LookupType> = {
  whois: "whois",
  geoLocation: "ip_info",
  reputation: "reputation",
  dns: "dns",
  passiveDns: "passive_dns",
  whoisHistory: "whois_history",
  reverseDns: "reverse_dns",
  screenshot: "screenshot",
  emailValidator: "email_validator",
  cveDetails: "cve_details",
  websiteStatus: "website_details",
}

// LocalStorage key for provider configuration
const STORAGE_KEY = "intelligenceHarvester_providerConfig"

// Default provider configuration
const DEFAULT_PROVIDERS: ProviderSelection = {
  whois: ['free_whois'],
  geoLocation: [],
  reputation: [],
  dns: [],
  passiveDns: [],
  whoisHistory: [],
  reverseDns: [],
  screenshot: [],
  emailValidator: [],
  cveDetails: [],
  websiteStatus: [],
}

/**
 * Load provider configuration from localStorage
 */
function loadProvidersFromStorage(): ProviderSelection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PROVIDERS
    
    const parsed = JSON.parse(stored) as ProviderSelection
    // Validate structure and ensure arrays
    const validated: ProviderSelection = { ...DEFAULT_PROVIDERS }
    for (const key in DEFAULT_PROVIDERS) {
      const k = key as keyof ProviderSelection
      if (parsed[k] && Array.isArray(parsed[k])) {
        validated[k] = parsed[k]
      }
    }
    return validated
  } catch (error) {
    console.error("Error loading provider config from localStorage:", error)
    return DEFAULT_PROVIDERS
  }
}

/**
 * Save provider configuration to localStorage
 */
function saveProvidersToStorage(providers: ProviderSelection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
  } catch (error) {
    console.error("Error saving provider config to localStorage:", error)
  }
}

/**
 * Custom hook for managing provider selection state across all lookup types
 * Persists configuration to localStorage
 * 
 * @returns {Object} Provider selection state and utilities
 * @returns {ProviderSelection} selections - Current provider selections for all lookup types
 * @returns {ProviderSelectionSetters} setters - Setter functions for each lookup type
 * @returns {Set<LookupType>} enabledTypes - Set of currently enabled lookup types
 * @returns {Function} getProviderForType - Get provider value for a specific lookup type
 * @returns {Function} isProviderEnabled - Check if a provider value represents an enabled state
 * 
 * @example
 * const { selections, setters, enabledTypes } = useProviderSelection()
 * setters.setWhois(['free_whois', 'whoisxml'])
 * console.log(enabledTypes) // Set { 'whois' }
 */
export function useProviderSelection() {
  // Load initial state from localStorage
  const [providers, setProviders] = useState<ProviderSelection>(() => loadProvidersFromStorage())

  // Save to localStorage whenever providers change
  useEffect(() => {
    saveProvidersToStorage(providers)
  }, [providers])

  // Generate setter functions dynamically
  const setters: ProviderSelectionSetters = useMemo(() => ({
    setWhois: (value: ProviderValue) => setProviders(prev => ({ ...prev, whois: value })),
    setGeoLocation: (value: ProviderValue) => setProviders(prev => ({ ...prev, geoLocation: value })),
    setReputation: (value: ProviderValue) => setProviders(prev => ({ ...prev, reputation: value })),
    setDns: (value: ProviderValue) => setProviders(prev => ({ ...prev, dns: value })),
    setPassiveDns: (value: ProviderValue) => setProviders(prev => ({ ...prev, passiveDns: value })),
    setWhoisHistory: (value: ProviderValue) => setProviders(prev => ({ ...prev, whoisHistory: value })),
    setReverseDns: (value: ProviderValue) => setProviders(prev => ({ ...prev, reverseDns: value })),
    setScreenshot: (value: ProviderValue) => setProviders(prev => ({ ...prev, screenshot: value })),
    setEmailValidator: (value: ProviderValue) => setProviders(prev => ({ ...prev, emailValidator: value })),
    setCveDetails: (value: ProviderValue) => setProviders(prev => ({ ...prev, cveDetails: value })),
    setWebsiteStatus: (value: ProviderValue) => setProviders(prev => ({ ...prev, websiteStatus: value })),
  }), [])

  // Helper to check if a provider value is enabled (non-empty array)
  const isProviderEnabled = useCallback((value: ProviderValue): boolean => {
    return Array.isArray(value) && value.length > 0
  }, [])

  // Get enabled lookup types based on provider selections
  const enabledTypes = useMemo(() => {
    const types = new Set<LookupType>()
    Object.entries(providers).forEach(([key, value]) => {
      if (isProviderEnabled(value)) {
        types.add(KEY_TO_LOOKUP_TYPE[key as keyof ProviderSelection])
      }
    })
    return types
  }, [providers, isProviderEnabled])

  // Get provider(s) for a specific lookup type
  const getProviderForType = useCallback((type: LookupType): ProviderValue => {
    const key = Object.entries(KEY_TO_LOOKUP_TYPE).find(([_, t]) => t === type)?.[0] as keyof ProviderSelection
    return key ? providers[key] : []
  }, [providers])

  return {
    selections: providers,
    setters,
    enabledTypes,
    getProviderForType,
    isProviderEnabled,
  }
}

