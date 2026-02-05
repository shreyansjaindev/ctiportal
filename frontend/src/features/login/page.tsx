import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

import { LoginForm } from "@/shared/components/login-form"
import { apiPost } from "@/shared/lib/api"
import { useAuth } from "@/shared/lib/auth"

type TokenResponse = {
  access: string
  refresh: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { saveTokens } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const loginMutation = useMutation({
    mutationFn: async (payload: { username: string; password: string }) => {
      const body = new URLSearchParams()
      body.set("username", payload.username)
      body.set("password", payload.password)
      return apiPost<TokenResponse>(
        "/auth/token/",
        body,
        null,
        "application/x-www-form-urlencoded"
      )
    },
    onSuccess: (data) => {
      saveTokens(data.access, data.refresh)
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
