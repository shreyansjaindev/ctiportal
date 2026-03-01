import { useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { ProviderLogo } from "@/shared/components/ProviderLogo"
import { LOOKUP_LABELS } from "@/shared/lib/lookup-config"
import { cn } from "@/shared/lib/utils"
import type { LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"

import { renderLookupDisplay } from "./LookupResultDisplay"

function getLookupErrorMessage(result: LookupResult | null | undefined): string | null {
  const rawError = result?.error

  if (typeof rawError === "string" && rawError.trim()) {
    return rawError
  }

  if (typeof rawError === "number" || typeof rawError === "boolean") {
    return String(rawError)
  }

  if (Array.isArray(rawError)) {
    const joined = rawError
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter(Boolean)
      .join(" ")
      .trim()
    return joined || "Lookup failed"
  }

  if (rawError && typeof rawError === "object") {
    const details = rawError as Record<string, unknown>
    if (typeof details.error === "string" && details.error.trim()) return details.error
    if (typeof details.detail === "string" && details.detail.trim()) return details.detail
    return JSON.stringify(details)
  }

  return null
}

export interface LookupTypeCardProps {
  type: LookupType
  typeResults: LookupResult[]
  isLoading: boolean
  loadingTarget?: string | null
  isFetched: boolean
  error: string | undefined
  providersByType: Record<string, Provider[]>
  selectedProviders?: string[]
  onLoad: (providerId?: string) => void
  onRetry: () => void
  onExpand: () => void
  showLoadAll?: boolean
  expanded?: boolean
  onCollapse?: () => void
}

export function LookupTypeCard({
  type, typeResults, isLoading, loadingTarget = null, isFetched, error,
  providersByType, selectedProviders = [], onLoad, onRetry, onExpand, showLoadAll = true,
  expanded = false, onCollapse,
}: LookupTypeCardProps) {
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)

  const availableProviders = (providersByType[type] || []).filter((provider) => provider.available)
  const dataResults = typeResults.filter((result) => !result.error && Object.keys(result.essential ?? {}).length > 0)
  const hasData = dataResults.length > 0
  const label = LOOKUP_LABELS[type] || type

  const returnedProviderIds = new Set(typeResults.map((result) => result._provider).filter(Boolean))
  const resolvedProviderId = activeProviderId
    ?? (dataResults[0]?._provider ?? typeResults[0]?._provider ?? null)

  const activeResult = resolvedProviderId
    ? typeResults.find((result) => result._provider === resolvedProviderId) ?? null
    : null
  const activeErrorMessage = getLookupErrorMessage(activeResult)
  const activeResultHasData = activeResult
    ? !activeErrorMessage && Object.keys(activeResult.essential ?? {}).length > 0
    : false
  const activeProviderReturned = resolvedProviderId
    ? returnedProviderIds.has(resolvedProviderId)
    : false
  const activeTabValue = resolvedProviderId ?? "__none__"

  const isIdleState = !isFetched && !isLoading
  const borderClass = error && !hasData
    ? "border-destructive/40"
    : isIdleState
      ? "border-dashed"
      : "border"

  return (
    <Card
      className={cn(
        "w-full min-w-0 gap-0 shadow-none",
        expanded
          ? "h-full min-h-0 bg-background py-4"
          : isIdleState
            ? "min-h-[11rem] bg-muted/20 py-6"
            : "py-4",
        borderClass
      )}
    >
      <CardHeader className={cn("px-4", isIdleState && !expanded && "pb-4", (!isIdleState || expanded) && "pb-2")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className={cn("leading-tight", isIdleState ? "text-base" : "text-sm")}>{label}</CardTitle>
            {isIdleState ? (
              <CardDescription>
                {availableProviders.length > 0 ? null : "Click to load"}
              </CardDescription>
            ) : null}
            {isLoading && !hasData && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Fetching data...
              </span>
            )}
            {error && !hasData && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="line-clamp-1">{error}</span>
              </span>
            )}
          </div>
          <CardAction className="mt-[-2px] flex shrink-0 items-center gap-1 self-start">
            {expanded ? (
              <Button variant="ghost" size="sm" className="gap-2" onClick={onCollapse}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : isFetched ? (
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onExpand} title="View more">
                View more
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : null}
            {showLoadAll && isIdleState && !expanded && selectedProviders.length > 0 && (
              <button
                onClick={() => onLoad()}
                className="group flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Load selected
                <ArrowLeft className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </CardAction>
        </div>
      </CardHeader>

      {availableProviders.length > 0 ? (
        isIdleState ? (
          <CardContent className="flex flex-wrap gap-2 px-4">
            {availableProviders.map((provider) => {
              const isProviderLoading = isLoading && (
                loadingTarget === provider.id ||
                (loadingTarget === "__selected__" && selectedProviders.includes(provider.id))
              )

              return (
                <button
                  key={provider.id}
                  onClick={() => {
                    setActiveProviderId(provider.id)
                    if (!returnedProviderIds.has(provider.id) && !isLoading) onLoad(provider.id)
                  }}
                  className="active:scale-95 flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {isProviderLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-black shadow-sm">
                      <ProviderLogo providerId={provider.id} providerName={provider.name} size="md" />
                    </span>
                  )}
                  <span>{provider.name}</span>
                </button>
              )
            })}
          </CardContent>
        ) : (
          <Tabs
            value={activeTabValue}
            onValueChange={(value) => {
              if (value === "__none__") return
              setActiveProviderId(value)
              if (!returnedProviderIds.has(value) && !isLoading) onLoad(value)
            }}
            className="gap-0 border-b"
          >
            <TabsList variant="line" className={cn("w-full justify-start flex-wrap px-4 rounded-none", expanded ? "h-auto" : "h-10")}>
              {availableProviders.map((provider) => {
                const wasReturned = returnedProviderIds.has(provider.id)
                const hasError = wasReturned && typeResults.find((result) => result._provider === provider.id)?.error
                const isProviderLoading = isLoading && !wasReturned && (
                  loadingTarget === provider.id ||
                  (loadingTarget === "__selected__" && selectedProviders.includes(provider.id))
                )

                return (
                  <TabsTrigger
                    key={provider.id}
                    value={provider.id}
                    title={provider.name}
                    className={cn(
                      "group h-full px-2 gap-1.5 text-xs data-[state=active]:shadow-none",
                      isLoading && !wasReturned && "opacity-30"
                    )}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white p-1 text-black shadow-sm dark:bg-white dark:text-black">
                      {isProviderLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ProviderLogo
                          providerId={provider.id}
                          providerName={provider.name}
                          size={expanded ? "sm" : "md"}
                          className="h-full w-full max-h-4 max-w-4"
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        "truncate",
                        expanded
                          ? ""
                          : "max-w-0 overflow-hidden opacity-0 transition-all duration-150 group-hover:max-w-24 group-hover:opacity-100"
                      )}
                    >
                      {provider.name}
                    </span>
                    {hasError && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {availableProviders.map((provider) => (
              <TabsContent key={provider.id} value={provider.id} className="m-0" />
            ))}
          </Tabs>
        )
      ) : isIdleState ? (
        <button
          onClick={() => onLoad()}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Fetch data</span>
          <ArrowLeft className="h-3 w-3 rotate-180" />
        </button>
      ) : null}

      {error && !hasData && (
        <Button variant="outline" size="sm" className="mt-3 h-6 self-start gap-1.5 text-xs" onClick={onRetry}>
          <RefreshCw className="h-2.5 w-2.5" /> Retry
        </Button>
      )}

      {resolvedProviderId && activeProviderReturned && (
        <CardContent className={cn("px-4", !isIdleState && "pt-4", expanded && "min-h-0 flex-1 overflow-y-auto")}>
          {activeErrorMessage ? (
            <Alert variant="destructive" className={cn("text-xs", expanded && "mx-1")}>
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="break-words">
                {activeErrorMessage}
              </AlertDescription>
            </Alert>
          ) : activeResultHasData && activeResult ? (
            renderLookupDisplay(type, activeResult, !expanded)
          ) : (
            <p className="text-xs text-muted-foreground">
              No data returned for {availableProviders.find((provider) => provider.id === resolvedProviderId)?.name ?? resolvedProviderId}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
