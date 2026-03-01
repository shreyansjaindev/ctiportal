import { ArrowRight } from "lucide-react"

import { HttpStatusBadge } from "./HttpStatusBadge"

interface Redirect {
  url?: string
  code?: string | number
}

interface RedirectChainProps {
  redirects: Redirect[]
}

export function RedirectChain({ redirects }: RedirectChainProps) {
  if (!Array.isArray(redirects) || redirects.length === 0) {
    return <span className="text-muted-foreground">No redirects</span>
  }

  return (
    <div className="space-y-2">
      {redirects.map((redirect, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {redirect.code && (
                <HttpStatusBadge code={redirect.code} showText={false} />
              )}
              {redirect.url && (
                <span className="truncate text-sm text-muted-foreground">
                  {redirect.url}
                </span>
              )}
            </div>
          </div>
          {idx < redirects.length - 1 && (
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}

export default RedirectChain
