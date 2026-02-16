import { HttpStatusDisplay } from "./HttpStatusDisplay"
import { ArrowRight } from "lucide-react"

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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {redirect.code && (
                <HttpStatusDisplay code={redirect.code} showText={false} />
              )}
              {redirect.url && (
                <span className="text-sm text-muted-foreground truncate">
                  {redirect.url}
                </span>
              )}
            </div>
          </div>
          {idx < redirects.length - 1 && (
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

export default RedirectChain
