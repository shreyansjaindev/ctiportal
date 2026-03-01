/**
 * Shared utilities for lookup result display components.
 */

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
