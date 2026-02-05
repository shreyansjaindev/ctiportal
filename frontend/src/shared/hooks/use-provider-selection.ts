import { useState, useMemo } from "react"
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
  vulnerability: ProviderValue
  webSearch: ProviderValue
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
  setVulnerability: (value: ProviderValue) => void
  setWebSearch: (value: ProviderValue) => void
  setWebsiteStatus: (value: ProviderValue) => void
}

/**
 * Custom hook for managing provider selection state across all lookup types
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
  const [whois, setWhois] = useState<ProviderValue>(['free_whois'])
  const [geoLocation, setGeoLocation] = useState<ProviderValue>([])
  const [reputation, setReputation] = useState<ProviderValue>([])
  const [dns, setDns] = useState<ProviderValue>([])
  const [passiveDns, setPassiveDns] = useState<ProviderValue>([])
  const [whoisHistory, setWhoisHistory] = useState<ProviderValue>([])
  const [reverseDns, setReverseDns] = useState<ProviderValue>([])
  const [screenshot, setScreenshot] = useState<ProviderValue>([])
  const [emailValidator, setEmailValidator] = useState<ProviderValue>([])
  const [vulnerability, setVulnerability] = useState<ProviderValue>([])
  const [webSearch, setWebSearch] = useState<ProviderValue>([])
  const [websiteStatus, setWebsiteStatus] = useState<ProviderValue>([])

  const selections: ProviderSelection = {
    whois,
    geoLocation,
    reputation,
    dns,
    passiveDns,
    whoisHistory,
    reverseDns,
    screenshot,
    emailValidator,
    vulnerability,
    webSearch,
    websiteStatus,
  }

  const setters: ProviderSelectionSetters = {
    setWhois,
    setGeoLocation,
    setReputation,
    setDns,
    setPassiveDns,
    setWhoisHistory,
    setReverseDns,
    setScreenshot,
    setEmailValidator,
    setVulnerability,
    setWebSearch,
    setWebsiteStatus,
  }

  // Helper to check if a provider value is enabled (non-empty array)
  const isProviderEnabled = (value: ProviderValue): boolean => {
    return Array.isArray(value) && value.length > 0
  }

  // Get enabled lookup types based on provider selections
  const enabledTypes = useMemo(() => {
    const types = new Set<LookupType>()
    if (isProviderEnabled(whois)) types.add("whois")
    if (isProviderEnabled(geoLocation)) types.add("ip_info")
    if (isProviderEnabled(reputation)) types.add("reputation")
    if (isProviderEnabled(dns)) types.add("dns")
    if (isProviderEnabled(passiveDns)) types.add("passive_dns")
    if (isProviderEnabled(whoisHistory)) types.add("whois_history")
    if (isProviderEnabled(reverseDns)) types.add("reverse_dns")
    if (isProviderEnabled(screenshot)) types.add("screenshot")
    if (isProviderEnabled(emailValidator)) types.add("email_validator")
    if (isProviderEnabled(vulnerability)) types.add("vulnerability")
    if (isProviderEnabled(webSearch)) types.add("web_search")
    if (isProviderEnabled(websiteStatus)) types.add("website_status")
    return types
  }, [whois, geoLocation, reputation, dns, passiveDns, whoisHistory, reverseDns, screenshot, emailValidator, vulnerability, webSearch, websiteStatus])

  // Get provider(s) for a specific lookup type
  const getProviderForType = (type: LookupType): ProviderValue => {
    const typeMap: Record<LookupType, ProviderValue> = {
      whois,
      ip_info: geoLocation,
      reputation,
      dns,
      passive_dns: passiveDns,
      whois_history: whoisHistory,
      reverse_dns: reverseDns,
      screenshot,
      email_validator: emailValidator,
      vulnerability,
      web_search: webSearch,
      website_status: websiteStatus,
    }
    return typeMap[type]
  }

  return {
    selections,
    setters,
    enabledTypes,
    getProviderForType,
    isProviderEnabled,
  }
}

