/**
 * Logo utilities for provider assets
 * @module utils/logo
 */

/**
 * Get logo path for a provider by ID
 * Follows convention: /assets/logos/{provider_id}.svg or .png
 * 
 * @param {string} providerId - Provider ID (case-insensitive)
 * @returns {string} Logo path (SVG preferred, falls back to PNG)
 * 
 * @example
 * getLogoPath('virustotal')  // returns '/assets/logos/virustotal.svg'
 * getLogoPath('abuseipdb')   // returns '/assets/logos/abuseipdb.svg'
 */
const BASE = '/images/providers'

// Explicit file map: provider ID → filename under /images/providers/
// Only needed when the ID doesn't exactly match the filename (minus extension).
const LOGO_MAP: Record<string, string> = {
  ibm_xforce:      'ibm',
  hybrid_analysis: 'hybridanalysis',
  whoisxmlapi:     'whoisxmlapi',
  nvd:             'nist',
}

// Providers whose file is a PNG (everything else defaults to SVG).
const PNG_IDS = new Set([
  'hostio', 'hybridanalysis', 'ibm',
  'ipapi', 'phishtank', 'pulsedive', 'securitytrails',
  'urlscan', 'whoisxmlapi',
])

export function getLogoPath(providerId: string): string {
  const id = providerId.toLowerCase()
  const filename = LOGO_MAP[id] ?? id
  const ext = PNG_IDS.has(filename) ? 'png' : 'svg'
  return `${BASE}/${filename}.${ext}`
}

export function getLogoPathWithFallback(providerId: string): { primary: string; fallback: string } {
  const id = providerId.toLowerCase()
  const filename = LOGO_MAP[id] ?? id
  const isPng = PNG_IDS.has(filename)
  return {
    primary:  `${BASE}/${filename}.${isPng ? 'png' : 'svg'}`,
    fallback: `${BASE}/${filename}.${isPng ? 'svg' : 'png'}`,
  }
}

export function hasLogo(providerId: string): boolean {
  const id = providerId.toLowerCase()
  const filename = LOGO_MAP[id] ?? id
  return [
    'abuseipdb', 'geekflare', 'hostio', 'hybridanalysis', 'ibm',
    'ipapi', 'ipinfoio', 'nist', 'phishtank', 'pulsedive', 'securitytrails',
    'urlscan', 'virustotal', 'whoisxmlapi',
  ].includes(filename)
}
