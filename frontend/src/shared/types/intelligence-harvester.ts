/**
 * Type definitions for Intelligence Harvester feature
 * @module types/intelligence-harvester
 */

/**
 * Available lookup types for intelligence gathering
 */
export type LookupType =
  | "whois"
  | "ip_info"
  | "reputation"
  | "dns"
  | "passive_dns"
  | "subdomains"
  | "whois_history"
  | "reverse_dns"
  | "screenshot"
  | "email_validator"
  | "cve_details"
  | "web_redirects"
  | "web_scan"

/**
 * Backend indicator type classification from API
 * Used for type detection and routing
 */
export type IndicatorType =
  | "ipv4"
  | "ipv6"
  | "domain"
  | "email"
  | "url"
  | "sha256"
  | "sha1"
  | "md5"
  | "cve"
  | "keyword"

/**
 * Result from a single lookup operation
 * Contains categorized fields for structured display
 */
export type LookupResult = {
  essential?: Record<string, unknown>
  additional?: Record<string, unknown>
  _provider?: string
  _lookup_type?: LookupType
  error?: string
}

/**
 * Collection of all lookup results for a single indicator
 */
export type IndicatorResult = {
  indicator: string
  results: LookupResult[]
}

/**
 * Provider configuration and availability information
 */
export interface Provider {
  id: string
  name: string
  available: boolean
  supported_indicators?: string[]
  type?: "free" | "paid"
  cost?: string
  rate_limit?: string
  description?: string
  features?: string[]
  limitations?: string[]
  color?: string
}

/**
 * Provider preset configuration
 */
export interface ProviderPreset {
  name: string
  description: string
  providers: Record<LookupType, string[]>
}

/**
 * Complete providers metadata response from backend
 */
export interface ProvidersMetadata {
  providers_by_type: Record<LookupType, Provider[]>
  presets: Record<string, ProviderPreset>
  metadata: {
    version: string
    categories: LookupType[]
  }
}
