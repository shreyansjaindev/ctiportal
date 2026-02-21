import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

import { clearTokens, getStoredTokens, setAuthContextRef, storeTokens } from "@/shared/lib/api"

type AuthContextValue = {
  token: string | null
  setToken: (token: string | null) => void
  saveTokens: (access: string, refresh?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    getStoredTokens().access
  )

  const setToken = (value: string | null) => {
    setTokenState(value)
    if (!value) {
      clearTokens()
    }
  }

  const saveTokens = (access: string, refresh?: string) => {
    storeTokens(access, refresh)
    setTokenState(access)
  }

  const logout = () => {
    clearTokens()
    setTokenState(null)
  }

  const value = useMemo(
    () => ({
      token,
      setToken,
      saveTokens,
      logout,
    }),
    [token]
  )

  // Register auth context with API client for token refresh
  useEffect(() => {
    setAuthContextRef({
      saveTokens,
      logout,
    })
  }, [saveTokens, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

