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
  | "whois_history"
  | "reverse_dns"
  | "screenshot"
  | "email_validator"
  | "vulnerability"
  | "web_search"
  | "website_status"

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
  | "url_with_http"
  | "url_without_http"
  | "sha256"
  | "sha1"
  | "md5"
  | "cve"
  | "keyword"

/**
 * Frontend indicator kind for UI categorization
 * Simplified grouping of backend indicator types
 */
export type IndicatorKind = "ip" | "domain" | "email" | "cve" | "hash" | "unknown"

/**
 * Result from a single lookup operation
 * Dynamic structure based on lookup type and provider
 */
export type LookupResult = Record<
  string,
  string | string[] | number | boolean | null | undefined
> & {
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
