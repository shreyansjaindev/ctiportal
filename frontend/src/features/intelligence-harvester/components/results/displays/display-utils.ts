/**
 * Shared utilities for lookup result display components.
 */

const UPPERCASE_LABEL_TOKENS = new Set([
  "api",
  "asn",
  "cve",
  "cvss",
  "dns",
  "id",
  "ip",
  "ipv4",
  "ipv6",
  "mx",
  "ns",
  "sha1",
  "sha256",
  "spf",
  "ssl",
  "tls",
  "ttl",
  "txt",
  "url",
  "urls",
  "whois"
])

export function formatFieldLabel(label: string): string {
  return label
    .split(" ")
    .map((token) => {
      if (!token) return token

      const normalized = token.toLowerCase()

      if (UPPERCASE_LABEL_TOKENS.has(normalized) || token === token.toUpperCase()) {
        return token.toUpperCase()
      }

      return token.charAt(0).toUpperCase() + token.slice(1)
    })
    .join(" ")
}

export function formatFieldKey(key: string): string {
  return formatFieldLabel(key.replace(/_/g, " "))
}

export function getLookupErrorMessage(error: unknown): string | null {
  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return String(error)
  }

  if (Array.isArray(error)) {
    const joined = error
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter(Boolean)
      .join(" ")
      .trim()
    return joined || "Lookup failed"
  }

  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>
    if (typeof details.error === "string" && details.error.trim()) return details.error
    if (typeof details.detail === "string" && details.detail.trim()) return details.detail
    return JSON.stringify(details)
  }

  return null
}

/**
 * Format any scalar/array/object value into a human-readable string.
 * Used by display components that render plain text (not JSX).
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-"
  if (value === "") return "Not Found"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return JSON.stringify(value, null, 2)
    }
    return value.join(", ")
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

/**
 * Returns true if the value looks like a base64-encoded image or a data URL.
 */
export function isBase64Image(value: unknown): boolean {
  if (typeof value !== "string") return false
  return value.startsWith("data:image/") || (value.length > 100 && value.match(/^[A-Za-z0-9+/=]+$/) !== null)
}
