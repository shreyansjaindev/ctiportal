const BASE = "/images/providers"

const LOGO_PATHS: Record<string, string> = {
  abuseipdb: `${BASE}/abuseipdb.svg`,
  geekflare: `${BASE}/geekflare.svg`,
  hostio: `${BASE}/hostio.svg`,
  hybrid_analysis: `${BASE}/hybrid_analysis.svg`,
  ibm_xforce: `${BASE}/ibm_xforce.png`,
  ipapi: `${BASE}/ipapi.png`,
  ipinfoio: `${BASE}/ipinfoio.svg`,
  nvd: `${BASE}/nist.svg`,
  phishtank: `${BASE}/phishtank.png`,
  pulsedive: `${BASE}/pulsedive.svg`,
  securitytrails: `${BASE}/securitytrails.png`,
  urlscan: `${BASE}/urlscan.png`,
  virustotal: `${BASE}/virustotal.svg`,
  whoisxmlapi: `${BASE}/whoisxmlapi.svg`,
}

export function getLogoPath(providerId: string): string {
  return LOGO_PATHS[providerId.toLowerCase()] ?? `${BASE}/${providerId.toLowerCase()}.svg`
}

export function hasLogo(providerId: string): boolean {
  return providerId.toLowerCase() in LOGO_PATHS
}
