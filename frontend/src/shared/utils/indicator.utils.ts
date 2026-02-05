/**
 * Utility functions for indicator type detection and classification
 */

import type { IndicatorType, IndicatorKind } from "@/shared/types/intelligence-harvester"

/**
 * Convert backend indicator type to frontend kind for UI categorization
 * 
 * @param {IndicatorType | undefined} type - Backend indicator type from API
 * @returns {IndicatorKind} Frontend indicator kind for UI logic
 * 
 * @example
 * getIndicatorKind('ipv4') // returns 'ip'
 * getIndicatorKind('domain') // returns 'domain'
 * getIndicatorKind('cve') // returns 'cve'
 */
export function getIndicatorKind(type: IndicatorType | undefined): IndicatorKind {
  if (!type) return "unknown"

  if (type === "ipv4" || type === "ipv6") return "ip"
  if (type === "domain" || type === "url" || type === "url_with_http" || type === "url_without_http") return "domain"
  if (type === "email") return "email"
  if (type === "cve") return "cve"
  if (type === "md5" || type === "sha1" || type === "sha256") return "hash"

  return "unknown"
}

/**
 * Get human-readable display label for indicator kind
 * 
 * @param {IndicatorKind} kind - Indicator kind
 * @returns {string} Display label
 * 
 * @example
 * getKindLabel('ip') // returns 'IP Address'
 * getKindLabel('domain') // returns 'Domain/URL'
 */
export function getKindLabel(kind: IndicatorKind): string {
  const labels: Record<IndicatorKind, string> = {
    ip: "IP Address",
    domain: "Domain/URL",
    email: "Email",
    cve: "CVE",
    hash: "File Hash",
    unknown: "Unknown",
  }
  return labels[kind]
}

/**
 * Get color class for indicator kind
 */
export function getKindColor(kind: IndicatorKind): string {
  const colors: Record<IndicatorKind, string> = {
    ip: "text-blue-600",
    domain: "text-green-600",
    email: "text-purple-600",
    cve: "text-red-600",
    hash: "text-orange-600",
    unknown: "text-gray-600",
  }
  return colors[kind]
}

/**
 * Get badge variant for indicator kind
 */
export function getKindBadgeVariant(kind: IndicatorKind): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<IndicatorKind, "default" | "secondary" | "destructive" | "outline"> = {
    ip: "default",
    domain: "secondary",
    email: "outline",
    cve: "destructive",
    hash: "secondary",
    unknown: "outline",
  }
  return variants[kind]
}

