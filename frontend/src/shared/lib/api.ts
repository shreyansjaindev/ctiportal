export type ApiError = Error & { status?: number }

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "")
const REQUEST_TIMEOUT_MS = 30000 // 30 seconds - prevents hanging requests
export type ApiRequestOptions = {
  timeout?: number
}

// Store for auth context to trigger logout on unrecoverable 401
let authContextRef: { logout: () => void } | null = null

// Deduplication: prevent concurrent refresh calls when multiple requests 401 simultaneously
let refreshTokenPromise: Promise<boolean> | null = null

export function setAuthContextRef(context: { logout: () => void }) {
  authContextRef = context
}

/**
 * Fetch with timeout support using AbortController.
 * All requests use `credentials: "include"` so httpOnly auth cookies
 * are sent automatically — no manual Authorization headers needed.
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()

  const timeoutId = setTimeout(() => controller.abort(), timeout)

  return fetch(url, { ...fetchOptions, signal: controller.signal, credentials: "include" })
    .finally(() => clearTimeout(timeoutId))
}

/**
 * Attempt to silently refresh the access token using the httpOnly refresh cookie.
 * Returns true if a new access cookie was issued, false if the session is expired.
 */
async function refreshAccessToken(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshTokenPromise) return refreshTokenPromise

  refreshTokenPromise = (async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/token/refresh/`, {
        method: "POST",
      })
      if (!response.ok) {
        authContextRef?.logout()
        return false
      }
      return true
    } catch {
      authContextRef?.logout()
      return false
    } finally {
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""

  // Expired access token — try refresh once, then signal the caller to retry
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      throw new Error("TOKEN_REFRESHED") // signal to caller: retry with new cookie
    }
    const error: ApiError = new Error("Authentication failed - please log in again")
    error.status = 401
    throw error
  }

  if (!response.ok) {
    let errorMessage = "Request failed"
    try {
      if (contentType.includes("application/json")) {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage
      } else {
        const text = await response.text()
        if (text) errorMessage = text
      }
    } catch {
      // Use default message if parsing fails
    }
    const error: ApiError = new Error(`${errorMessage} (${response.status})`)
    error.status = response.status
    throw error
  }

  if (response.status === 204 || response.status === 205) {
    return null as T
  }

  if (!contentType.includes("application/json")) {
    const error: ApiError = new Error("Unexpected response")
    error.status = response.status
    throw error
  }

  return response.json() as Promise<T>
}

async function handleBlobResponse(response: Response): Promise<Blob> {
  const contentType = response.headers.get("content-type") ?? ""

  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      throw new Error("TOKEN_REFRESHED")
    }
    const error: ApiError = new Error("Authentication failed - please log in again")
    error.status = 401
    throw error
  }

  if (!response.ok) {
    let errorMessage = "Request failed"
    try {
      if (contentType.includes("application/json")) {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage
      } else {
        const text = await response.text()
        if (text) errorMessage = text
      }
    } catch {
      // Use default message if parsing fails
    }
    const error: ApiError = new Error(`${errorMessage} (${response.status})`)
    error.status = response.status
    throw error
  }

  return response.blob()
}

// Token parameters are kept for backward compatibility with existing service layer
// calls but are intentionally ignored — auth is handled via httpOnly cookies.

export async function apiGet<T>(path: string, _token?: string | null): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`)
  try {
    return await handleResponse<T>(response)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`)
      return handleResponse<T>(retryResponse)
    }
    throw error
  }
}

export async function apiPost<T>(
  path: string,
  body: BodyInit,
  _token?: string | null,
  contentType = "application/json",
  options: ApiRequestOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    timeout: options.timeout,
  })
  try {
    return await handleResponse<T>(response)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body,
        timeout: options.timeout,
      })
      return handleResponse<T>(retryResponse)
    }
    throw error
  }
}

export async function apiPostBlob(
  path: string,
  body: BodyInit,
  _token?: string | null,
  contentType = "application/json",
  accept = "application/octet-stream",
  options: ApiRequestOptions = {}
): Promise<Blob> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": contentType, Accept: accept },
    body,
    timeout: options.timeout,
  })
  try {
    return await handleBlobResponse(response)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": contentType, Accept: accept },
        body,
        timeout: options.timeout,
      })
      return handleBlobResponse(retryResponse)
    }
    throw error
  }
}

export async function apiPatch<T>(
  path: string,
  body: BodyInit,
  _token?: string | null,
  contentType = "application/json"
): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": contentType },
    body,
  })
  try {
    return await handleResponse<T>(response)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": contentType },
        body,
      })
      return handleResponse<T>(retryResponse)
    }
    throw error
  }
}

export async function apiDelete<T>(
  path: string,
  _token?: string | null,
  body?: BodyInit,
  contentType = "application/json"
): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...(body ? { "Content-Type": contentType } : {}) },
    body,
  })
  try {
    return await handleResponse<T>(response)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: { ...(body ? { "Content-Type": contentType } : {}) },
        body,
      })
      return handleResponse<T>(retryResponse)
    }
    throw error
  }
}
