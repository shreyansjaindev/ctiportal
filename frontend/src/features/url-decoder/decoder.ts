export type UrlDecoderProvider =
  | "microsoft_safelinks"
  | "mimecast_url_protect"
  | "barracuda_link_protect"
  | "cisco_secure_email"
  | "trend_micro_click_time_protection"
  | "symantec_broadcom_link_protect"
  | "proofpoint_url_defense_v1"
  | "proofpoint_url_defense_v2"
  | "proofpoint_url_defense_v3"
  | "google_redirect"
  | "facebook_redirect"
  | "linkedin_redirect"

export interface DecodedUrlResult {
  input: string
  output: string
  provider: UrlDecoderProvider | null
  status: "decoded" | "unchanged" | "invalid"
  steps: string[]
}

const MICROSOFT_SAFELINKS_HOST = /(^|\.)safelinks\.protection\.outlook\.com$/i
const MIMECAST_HOST = /(^|\.)mimecast\.com$/i
const BARRACUDA_HOST = /(^|\.)cudasvc\.com$/i
const CISCO_HOST = /(^|\.)cisco\.com$/i
const TREND_MICRO_HOST = /(^|\.)trendmicro\.com$/i
const SYMANTEC_BROADCOM_HOST = /(^|\.)((?:securitycloud\.)?symantec|broadcom)\.com$/i
const PROOFPOINT_HOST = /(^|\.)urldefense(?:\.proofpoint)?\.com$/i
const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/i
const FACEBOOK_HOST = /(^|\.)facebook\.com$/i
const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i
const COMMON_TARGET_PARAMS = ["url", "u", "target", "dest", "destination", "redirect", "redirect_url", "redirect_uri", "redir", "r", "q"]

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function decodeRepeated(value: string, iterations = 3) {
  let current = value
  for (let index = 0; index < iterations; index += 1) {
    const next = safeDecodeURIComponent(current)
    if (next === current) break
    current = next
  }
  return current
}

function decodeProofpointV2(value: string) {
  return decodeRepeated(value.replace(/_/g, "/").replace(/-/g, "%"))
}

function decodeProofpointV3(value: string) {
  const normalized = value
    .replace(/\*\*/g, "*")
    .replace(/\*([0-9A-Fa-f]{2})/g, "%$1")
  return decodeRepeated(normalized)
}

function decodeGenericUrl(value: string) {
  const decoded = decodeRepeated(value)
  return decoded.trim()
}

function extractTargetFromParams(parsed: URL, keys: string[]) {
  for (const key of keys) {
    const value = parsed.searchParams.get(key)
    if (!value) continue
    return decodeGenericUrl(value)
  }
  return null
}

function extractEmbeddedUrl(value: string) {
  const decoded = decodeRepeated(value)
  const encodedMatch = decoded.match(/https?%3A%2F%2F[^/?#\s][^\s]*/i)
  if (encodedMatch?.[0]) {
    return decodeGenericUrl(encodedMatch[0])
  }

  const directMatch = decoded.match(/https?:\/\/[^/\s?#][^\s]*/i)
  if (directMatch?.[0]) {
    return decodeGenericUrl(directMatch[0])
  }

  return null
}

function decodeSingleLayer(value: string): {
  next: string
  provider: UrlDecoderProvider | null
  step: string | null
} {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { next: decodeGenericUrl(value), provider: null, step: null }
  }

  if (MICROSOFT_SAFELINKS_HOST.test(parsed.hostname)) {
    const target = parsed.searchParams.get("url")
    if (!target) return { next: value, provider: "microsoft_safelinks", step: null }

    const decoded = decodeGenericUrl(target)
    return {
      next: decoded,
      provider: "microsoft_safelinks",
      step: "Decoded Microsoft Safe Links wrapper",
    }
  }

  if (MIMECAST_HOST.test(parsed.hostname)) {
    const target = extractTargetFromParams(parsed, ["u", "url"])
    if (!target) {
      return { next: value, provider: "mimecast_url_protect", step: null }
    }

    return {
      next: target,
      provider: "mimecast_url_protect",
      step: "Decoded Mimecast URL Protect wrapper",
    }
  }

  if (BARRACUDA_HOST.test(parsed.hostname)) {
    const target = extractTargetFromParams(parsed, ["u", "url"])
    if (!target) {
      return { next: value, provider: "barracuda_link_protect", step: null }
    }

    return {
      next: target,
      provider: "barracuda_link_protect",
      step: "Decoded Barracuda Link Protect wrapper",
    }
  }

  if (CISCO_HOST.test(parsed.hostname)) {
    const target =
      extractTargetFromParams(parsed, ["url", "u", "q"])
      ?? extractEmbeddedUrl(`${parsed.pathname}${parsed.search}`)

    if (!target) {
      return { next: value, provider: "cisco_secure_email", step: null }
    }

    return {
      next: target,
      provider: "cisco_secure_email",
      step: "Decoded Cisco Secure Email wrapper",
    }
  }

  if (TREND_MICRO_HOST.test(parsed.hostname)) {
    const target = extractTargetFromParams(parsed, ["url", "u"])
    if (!target) {
      return { next: value, provider: "trend_micro_click_time_protection", step: null }
    }

    return {
      next: target,
      provider: "trend_micro_click_time_protection",
      step: "Decoded Trend Micro Click Time Protection wrapper",
    }
  }

  if (SYMANTEC_BROADCOM_HOST.test(parsed.hostname)) {
    const target = extractTargetFromParams(parsed, COMMON_TARGET_PARAMS)
    if (!target) {
      return { next: value, provider: "symantec_broadcom_link_protect", step: null }
    }

    return {
      next: target,
      provider: "symantec_broadcom_link_protect",
      step: "Decoded Symantec / Broadcom link wrapper",
    }
  }

  if (PROOFPOINT_HOST.test(parsed.hostname)) {
    if (parsed.pathname.startsWith("/v1/url") || parsed.pathname.startsWith("/v2/url")) {
      const target = parsed.searchParams.get("u")
      if (!target) {
        return {
          next: value,
          provider: parsed.pathname.startsWith("/v1/url")
            ? "proofpoint_url_defense_v1"
            : "proofpoint_url_defense_v2",
          step: null,
        }
      }

      const decoded = decodeProofpointV2(target)
      return {
        next: decoded,
        provider: parsed.pathname.startsWith("/v1/url")
          ? "proofpoint_url_defense_v1"
          : "proofpoint_url_defense_v2",
        step: `Decoded Proofpoint URL Defense ${parsed.pathname.startsWith("/v1/url") ? "v1" : "v2"} wrapper`,
      }
    }

    if (parsed.pathname.startsWith("/v3/")) {
      const match = parsed.pathname.match(/\/v3\/__(.+?)__;/)
      if (!match?.[1]) {
        return { next: value, provider: "proofpoint_url_defense_v3", step: null }
      }

      const decoded = decodeProofpointV3(match[1])
      return {
        next: decoded,
        provider: "proofpoint_url_defense_v3",
        step: "Decoded Proofpoint URL Defense v3 wrapper",
      }
    }
  }

  if (GOOGLE_HOST.test(parsed.hostname) && parsed.pathname.startsWith("/url")) {
    const target = extractTargetFromParams(parsed, ["q", "url"])
    if (!target) {
      return { next: value, provider: "google_redirect", step: null }
    }

    return {
      next: target,
      provider: "google_redirect",
      step: "Decoded Google redirect wrapper",
    }
  }

  if (FACEBOOK_HOST.test(parsed.hostname) && parsed.pathname.startsWith("/l.php")) {
    const target = extractTargetFromParams(parsed, ["u"])
    if (!target) {
      return { next: value, provider: "facebook_redirect", step: null }
    }

    return {
      next: target,
      provider: "facebook_redirect",
      step: "Decoded Facebook redirect wrapper",
    }
  }

  if (LINKEDIN_HOST.test(parsed.hostname) && (/\/redir\//i.test(parsed.pathname) || parsed.searchParams.has("url") || parsed.searchParams.has("u"))) {
    const target = extractTargetFromParams(parsed, ["url", "u"])
    if (!target) {
      return { next: value, provider: "linkedin_redirect", step: null }
    }

    return {
      next: target,
      provider: "linkedin_redirect",
      step: "Decoded LinkedIn redirect wrapper",
    }
  }

  return { next: decodeGenericUrl(value), provider: null, step: null }
}

export function decodeWrappedUrl(input: string): DecodedUrlResult {
  const normalized = input.trim()
  if (!normalized) {
    return {
      input,
      output: "",
      provider: null,
      status: "invalid",
      steps: [],
    }
  }

  let current = normalized
  let detectedProvider: UrlDecoderProvider | null = null
  const steps: string[] = []

  for (let index = 0; index < 5; index += 1) {
    const { next, provider, step } = decodeSingleLayer(current)

    if (provider && !detectedProvider) {
      detectedProvider = provider
    }

    if (step) {
      steps.push(step)
    }

    if (next === current) {
      break
    }

    current = next
  }

  const status = current !== normalized ? "decoded" : "unchanged"

  return {
    input: normalized,
    output: current,
    provider: detectedProvider,
    status,
    steps,
  }
}

export function getProviderLabel(provider: UrlDecoderProvider | null) {
  switch (provider) {
    case "microsoft_safelinks":
      return "Microsoft Safe Links"
    case "mimecast_url_protect":
      return "Mimecast URL Protect"
    case "barracuda_link_protect":
      return "Barracuda Link Protect"
    case "cisco_secure_email":
      return "Cisco Secure Email"
    case "trend_micro_click_time_protection":
      return "Trend Micro Click Time Protection"
    case "symantec_broadcom_link_protect":
      return "Symantec / Broadcom Link Protect"
    case "proofpoint_url_defense_v1":
      return "Proofpoint URL Defense v1"
    case "proofpoint_url_defense_v2":
      return "Proofpoint URL Defense v2"
    case "proofpoint_url_defense_v3":
      return "Proofpoint URL Defense v3"
    case "google_redirect":
      return "Google Redirect"
    case "facebook_redirect":
      return "Facebook Redirect"
    case "linkedin_redirect":
      return "LinkedIn Redirect"
    default:
      return "Direct / generic decode"
  }
}
