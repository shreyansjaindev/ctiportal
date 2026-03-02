import type { ComponentProps, FormEvent } from "react"
import { ShieldCheck } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"

export function LoginForm({
  className,
  onSubmit,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  error,
  loading = false,
  ...props
}: ComponentProps<"div"> & {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  username: string
  password: string
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  error?: string | null
  loading?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <ShieldCheck className="size-6" />
              </div>
              <span className="sr-only">CTI Portal</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to CTI Portal</h1>
            <FieldDescription>Sign in with your analyst account.</FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="admin"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}

