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
export function getLogoPath(providerId: string): string {
  // Normalize provider ID to lowercase
  const normalizedId = providerId.toLowerCase()
  
  // Return SVG path - frontend team manages actual file existence
  return `/assets/logos/${normalizedId}.svg`
}

/**
 * Get logo path with fallback extension
 * Tries SVG first, then PNG
 * 
 * @param {string} providerId - Provider ID
 * @returns {string} Logo path with SVG priority
 */
export function getLogoPathWithFallback(providerId: string): {
  svg: string
  png: string
} {
  const normalizedId = providerId.toLowerCase()
  return {
    svg: `/assets/logos/${normalizedId}.svg`,
    png: `/assets/logos/${normalizedId}.png`,
  }
}

/**
 * Check if a logo file likely exists (based on known providers)
 * This is optional - can be used for error handling
 * 
 * @param {string} providerId - Provider ID
 * @returns {boolean} True if provider is likely to have a logo
 */
export function hasLogo(providerId: string): boolean {
  const knownProviders = [
    'whoisxml', 'securitytrails', 'free_whois',
    'virustotal', 'abuseipdb', 'ibm_xforce',
    'urlscan', 'ipapi', 'ipinfo',
    'hostio', 'phishtank', 'pulsedive', 'hybridanalysis', 'hybrid_analysis',
    'nvd', 'vulners',
    'httpstatus', 'requests',
    'system_dns', 'cloudflare', 'google_dns', 'api_ninjas',
    'screenshotmachine',
    'apilayer', 'hunter',
    'google', 'bing',
    'reverse_dns',
  ]
  return knownProviders.includes(providerId.toLowerCase())
}
