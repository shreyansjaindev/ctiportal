export type ApiError = Error & { status?: number }

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "")
const REQUEST_TIMEOUT_MS = 30000 // 30 seconds - prevents hanging requests

// Store for auth context to handle token refresh
let authContextRef: { saveTokens: (access: string, refresh?: string) => void; logout: () => void } | null = null

// Request queue for token refresh to prevent concurrent refresh attempts
let refreshTokenPromise: Promise<string | null> | null = null

export function setAuthContextRef(context: { saveTokens: (access: string, refresh?: string) => void; logout: () => void }) {
  authContextRef = context
}

export function getStoredTokens() {
  return {
    access: localStorage.getItem("cti_access_token"),
    refresh: localStorage.getItem("cti_refresh_token"),
  }
}

export function storeTokens(access: string, refresh?: string) {
  localStorage.setItem("cti_access_token", access)
  if (refresh) {
    localStorage.setItem("cti_refresh_token", refresh)
  }
}

export function clearTokens() {
  localStorage.removeItem("cti_access_token")
  localStorage.removeItem("cti_refresh_token")
}

/**
 * Fetch with timeout support using AbortController
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()
  
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  return fetch(url, { ...fetchOptions, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}

async function refreshAccessToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it instead of starting another
  if (refreshTokenPromise) {
    return refreshTokenPromise
  }

  const { refresh } = getStoredTokens()
  if (!refresh) return null

  // Create the refresh promise and store it for other concurrent requests
  refreshTokenPromise = (async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      })

      if (!response.ok) {
        clearTokens()
        authContextRef?.logout()
        return null
      }

      const data = await response.json()
      if (!data?.access) {
        clearTokens()
        authContextRef?.logout()
        return null
      }
      const newAccessToken = data.access
      storeTokens(newAccessToken, refresh)
      authContextRef?.saveTokens(newAccessToken, refresh)
      return newAccessToken
    } catch {
      clearTokens()
      authContextRef?.logout()
      return null
    } finally {
      // Clear the promise so new refresh attempts can start
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

async function handleResponse<T>(response: Response, token?: string | null): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  
  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401) {
    if (token) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        throw new Error("TOKEN_REFRESHED") // Signal to retry the request
      }
    }
    // If no token or refresh failed, throw auth error
    const error: ApiError = new Error("Authentication failed - please log in again")
    error.status = 401
    clearTokens()
    authContextRef?.logout()
    throw error
  }

  if (!response.ok) {
    // Try to extract error message from response body
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

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  let currentToken = token || getStoredTokens().access
  
  // Early return if no token available
  if (!currentToken) {
    const error: ApiError = new Error("No authentication token available")
    error.status = 401
    throw error
  }
  
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    headers: currentToken
      ? {
          Authorization: `Bearer ${currentToken}`,
        }
      : undefined,
  })

  try {
    return await handleResponse<T>(response, currentToken)
  } catch (error) {
    // If token was refreshed, retry the request
    if ((error as Error).message === "TOKEN_REFRESHED") {
      currentToken = getStoredTokens().access
      if (!currentToken) {
        const retryError: ApiError = new Error("No authentication token available after refresh")
        retryError.status = 401
        throw retryError
      }
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        headers: currentToken
          ? {
              Authorization: `Bearer ${currentToken}`,
            }
          : undefined,
      })
      return handleResponse<T>(retryResponse, null)
    }
    throw error
  }
}

export async function apiPost<T>(
  path: string,
  body: BodyInit,
  token?: string | null,
  contentType = "application/json"
): Promise<T> {
  let currentToken = token ?? getStoredTokens().access
  
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      "Content-Type": contentType,
    },
    body,
  })

  try {
    return await handleResponse<T>(response, currentToken)
  } catch (error) {
    // If token was refreshed, retry the request
    if ((error as Error).message === "TOKEN_REFRESHED") {
      currentToken = getStoredTokens().access
      if (!currentToken) {
        const retryError: ApiError = new Error("No authentication token available after refresh")
        retryError.status = 401
        throw retryError
      }
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          "Content-Type": contentType,
        },
        body,
      })
      return handleResponse<T>(retryResponse, null)
    }
    throw error
  }
}

export async function apiPatch<T>(
  path: string,
  body: BodyInit,
  token?: string | null,
  contentType = "application/json"
): Promise<T> {
  let currentToken = token ?? getStoredTokens().access

  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      "Content-Type": contentType,
    },
    body,
  })

  try {
    return await handleResponse<T>(response, currentToken)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      currentToken = getStoredTokens().access
      if (!currentToken) {
        const retryError: ApiError = new Error("No authentication token available after refresh")
        retryError.status = 401
        throw retryError
      }
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: {
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          "Content-Type": contentType,
        },
        body,
      })
      return handleResponse<T>(retryResponse, null)
    }
    throw error
  }
}

export async function apiDelete<T>(
  path: string,
  token?: string | null,
  body?: BodyInit,
  contentType = "application/json"
): Promise<T> {
  let currentToken = token ?? getStoredTokens().access

  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: {
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(body ? { "Content-Type": contentType } : {}),
    },
    body,
  })

  try {
    return await handleResponse<T>(response, currentToken)
  } catch (error) {
    if ((error as Error).message === "TOKEN_REFRESHED") {
      currentToken = getStoredTokens().access
      if (!currentToken) {
        const retryError: ApiError = new Error("No authentication token available after refresh")
        retryError.status = 401
        throw retryError
      }
      const retryResponse = await fetchWithTimeout(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: {
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...(body ? { "Content-Type": contentType } : {}),
        },
        body,
      })
      return handleResponse<T>(retryResponse, null)
    }
    throw error
  }
}
