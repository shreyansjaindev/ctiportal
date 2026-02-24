/**
 * Indicator parsing and input utilities
 * @module lib/indicator
 */

import type { IndicatorType } from "@/shared/types/intelligence-harvester"

/**
 * Parse raw indicator input into array of trimmed values
 * 
 * @param {string} raw - Raw input string with comma, space, or newline separated indicators
 * @returns {string[]} Array of trimmed, non-empty indicator values
 * 
 * @example
 * parseIndicators('8.8.8.8 google.com, example.com\ntest.com')
 * // returns ['8.8.8.8', 'google.com', 'example.com', 'test.com']
 */
export const parseIndicators = (raw: string): string[] =>
  raw
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)

/**
 * Simple client-side indicator type detection (fallback for when API identification is pending)
 * 
 * @param {string} indicator - Indicator value to classify
 * @returns {IndicatorType | undefined} Detected indicator type or undefined
 */
export const detectIndicatorType = (indicator: string): IndicatorType | undefined => {
  if (!indicator) return undefined
  
  // IPv4
  if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(indicator)) {
    return "ipv4"
  }
  
  // IPv6
  if (/^([a-f\d]{1,4}:){7}[a-f\d]{1,4}$/i.test(indicator)) {
    return "ipv6"
  }
  
  // Email
  if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(indicator)) {
    return "email"
  }
  
  // URL
  if (/^https?:\/\//i.test(indicator)) {
    return "url"
  }
  
  // CVE
  if (/^(CVE|cve)-\d{4}-\d{4,7}$/.test(indicator)) {
    return "cve"
  }
  
  // Hash detection
  if (/^[A-Fa-f0-9]{64}$/.test(indicator)) {
    return "sha256"
  }
  if (/^[A-Fa-f0-9]{40}$/.test(indicator)) {
    return "sha1"
  }
  if (/^[A-Fa-f0-9]{32}$/.test(indicator)) {
    return "md5"
  }
  
  // Domain (after ruling out IPs and emails)
  if (/^(?!(https?:\/\/|www\.))([a-zA-Z0-9.-]+\.([a-zA-Z]{2,})+)$/.test(indicator)) {
    return "domain"
  }
  
  return undefined
}

/**
 * Get placeholder text for indicator input field
 * 
 * @returns {string} Multi-line placeholder text with example indicators
 */
export const getInputPlaceholder = (): string => {
  return `8.8.8.8
google.com
https://example.com
user@example.com
192.168.1.1, amazon.com`
}
