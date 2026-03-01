import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { API_BASE, setAuthContextRef } from "@/shared/lib/api"

export type UserMe = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  groups: { id: number; name: string }[]
}

type AuthContextValue = {
  user: UserMe | null
  isLoading: boolean
  setUser: (user: UserMe | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, verify session by fetching the current user.
  // Handles three cases:
  //   1. Access cookie valid          → set user, done
  //   2. Access cookie expired, but refresh cookie valid → silent refresh, retry, set user
  //   3. Both expired / no cookies   → user stays null, RequireAuth redirects to /login
  useEffect(() => {
    let cancelled = false

    async function initSession() {
      try {
        let res = await fetch(`${API_BASE}/users/me/`, { credentials: "include" })

        // Access token may be expired — try a silent refresh once
        if (res.status === 401) {
          const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: "POST",
            credentials: "include",
          })
          if (refreshRes.ok) {
            // New access cookie issued — retry the user fetch
            res = await fetch(`${API_BASE}/users/me/`, { credentials: "include" })
          }
        }

        if (!cancelled) {
          if (res.ok) {
            const data: UserMe = await res.json()
            setUser(data)
          } else {
            setUser(null)
          }
        }
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    initSession()

    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null) // immediately clear — redirects to login
    // Fire-and-forget: tell the server to blacklist the refresh token cookie
    fetch(`${API_BASE}/auth/logout/`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {/* server-side cleanup failure is non-fatal */})
  }, [])

  // Register logout callback with the API client so it can trigger logout
  // automatically when a 401 cannot be recovered via token refresh
  useEffect(() => {
    setAuthContextRef({ logout })
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      setUser,
      logout,
    }),
    [user, isLoading, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

