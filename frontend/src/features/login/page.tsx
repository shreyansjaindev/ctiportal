import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

import { LoginForm } from "@/shared/components/login-form"
import { API_BASE } from "@/shared/lib/api"
import { useAuth, type UserMe } from "@/shared/lib/auth"

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const loginMutation = useMutation({
    mutationFn: async (payload: { username: string; password: string }) => {
      // Step 1: Login — dj-rest-auth sets httpOnly access + refresh cookies
      const loginRes = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: payload.username, password: payload.password }),
      })
      if (!loginRes.ok) {
        throw new Error("Invalid credentials")
      }

      // Step 2: Fetch the full user object (with groups) using the new cookie
      const userRes = await fetch(`${API_BASE}/users/me/`, { credentials: "include" })
      if (!userRes.ok) throw new Error("Failed to load user profile")

      return userRes.json() as Promise<UserMe>
    },
    onSuccess: (userData) => {
      setUser(userData)
      navigate("/", { replace: true })
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-between rounded-2xl border bg-background p-10 shadow-sm lg:flex">
            <div>
              <span className="inline-flex w-fit rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                CTI Portal
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-foreground">
                Modern threat intelligence, centralized.
              </h1>
              <p className="mt-3 text-muted-foreground">
                Correlate domains, infrastructure, and attacker TTPs into a
                single analyst console.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Today&apos;s signal readiness
              </p>
              <p className="mt-2">
                Connect your data sources and start an investigation in
                minutes.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border bg-background p-8 shadow-sm">
            <LoginForm
              onSubmit={(event) => {
                event.preventDefault()
                loginMutation.mutate({ username, password })
              }}
              username={username}
              password={password}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              error={
                loginMutation.isError
                  ? "Login failed. Check credentials."
                  : null
              }
              loading={loginMutation.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
