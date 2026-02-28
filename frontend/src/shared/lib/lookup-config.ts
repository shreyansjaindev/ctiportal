// Single source of truth for all lookup type metadata.
// To add a new lookup type: add one entry here — nothing else needs to change.

import type { IndicatorType, LookupType } from "@/shared/types/intelligence-harvester"

export interface LookupTypeConfig {
  id: LookupType
  label: string
  applicableIndicators: IndicatorType[]
  defaultProviders?: string[]
}

export const LOOKUP_TYPE_CONFIG: LookupTypeConfig[] = [
  { id: "whois",          label: "WHOIS",            applicableIndicators: ["domain"],                                defaultProviders: ["builtin_whois"] },
  { id: "ip_info",        label: "IP Info",          applicableIndicators: ["ipv4", "ipv6"],                         defaultProviders: ["builtin_ipinfo"] },
  { id: "reputation",     label: "Reputation",       applicableIndicators: ["ipv4", "ipv6", "domain", "md5", "sha1", "sha256"] },
  { id: "dns",            label: "DNS",              applicableIndicators: ["domain"],                                defaultProviders: ["builtin_dns"] },
  { id: "passive_dns",    label: "Passive DNS",      applicableIndicators: ["domain"] },
  { id: "subdomains",     label: "Subdomains",       applicableIndicators: ["domain"] },
  { id: "reverse_dns",    label: "Reverse DNS",      applicableIndicators: ["ipv4", "ipv6"],                         defaultProviders: ["builtin_dns"] },
  { id: "whois_history",  label: "WHOIS History",    applicableIndicators: ["domain"] },
  { id: "screenshot",     label: "Screenshot",       applicableIndicators: ["domain"] },
  { id: "web_redirects",  label: "Web Redirects",    applicableIndicators: ["domain", "url", "ipv4"],               defaultProviders: ["redirect_checker"] },
  { id: "web_scan",       label: "Web Scan",         applicableIndicators: ["domain", "url", "ipv4"] },
  { id: "email_validator",label: "Email Validation", applicableIndicators: ["email"],                                 defaultProviders: ["builtin_smtp"] },
  { id: "cve_details",    label: "CVE Details",      applicableIndicators: ["cve"] },
]

function fromConfig<V>(fn: (c: LookupTypeConfig) => V): Record<LookupType, V> {
  return Object.fromEntries(LOOKUP_TYPE_CONFIG.map(c => [c.id, fn(c)])) as Record<LookupType, V>
}

export const ALL_LOOKUP_TYPES = LOOKUP_TYPE_CONFIG.map(c => c.id) as LookupType[]
export const LOOKUP_LABELS = fromConfig(c => c.label)
export const APPLICABLE_INDICATORS = fromConfig(c => c.applicableIndicators)
export const DEFAULT_PROVIDER_SELECTIONS = fromConfig(c => c.defaultProviders ?? [])
