import { useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { ProviderLogo } from "@/shared/components/ProviderLogo"
import { LOOKUP_LABELS } from "@/shared/lib/lookup-config"
import { isProviderApplicable } from "@/shared/services/lookup.service"
import { cn } from "@/shared/lib/utils"
import type { IndicatorType, LookupResult, LookupType, Provider } from "@/shared/types/intelligence-harvester"

import { renderLookupDisplay } from "./displays/LookupResultDisplay"
import { getLookupErrorMessage } from "./displays/display-utils"

export interface LookupTypeCardProps {
  type: LookupType
  indicatorType?: IndicatorType
  typeResults: LookupResult[]
  isLoading: boolean
  loadingTarget?: string | null
  isFetched: boolean
  error: string | undefined
  providersByType: Record<string, Provider[]>
  selectedProviders?: string[]
  onLoad: (providerId?: string) => void
  onForceRefresh?: (providerId: string) => void
  onRetry: () => void
  onExpand: () => void
  expanded?: boolean
  onCollapse?: () => void
}

export function LookupTypeCard({
  type, indicatorType, typeResults, isLoading, loadingTarget = null, isFetched, error,
  providersByType, selectedProviders = [], onLoad, onForceRefresh, onRetry, onExpand,
  expanded = false, onCollapse,
}: LookupTypeCardProps) {
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)

  const availableProviders = (providersByType[type] || []).filter(
    (provider) => provider.available && isProviderApplicable(provider, indicatorType)
  )
  const dataResults = typeResults.filter((result) => !result.error && Object.keys(result.essential ?? {}).length > 0)
  const hasData = dataResults.length > 0
  const label = LOOKUP_LABELS[type] || type

  const returnedProviderIds = new Set(typeResults.map((result) => result._provider).filter(Boolean))
  const resolvedProviderId = activeProviderId
    ?? (dataResults[0]?._provider ?? typeResults[0]?._provider ?? null)

  const activeResult = resolvedProviderId
    ? typeResults.find((result) => result._provider === resolvedProviderId) ?? null
    : null
  const activeErrorMessage = getLookupErrorMessage(activeResult?.error)
  const activeResultHasData = activeResult
    ? !activeErrorMessage && Object.keys(activeResult.essential ?? {}).length > 0
    : false
  const activeProviderReturned = resolvedProviderId
    ? returnedProviderIds.has(resolvedProviderId)
    : false
  const isTargetingActiveProvider = resolvedProviderId
    ? isLoading
      && (
        loadingTarget === resolvedProviderId
        || (loadingTarget === "__selected__" && selectedProviders.includes(resolvedProviderId))
      )
    : false
  const isActiveProviderLoading = resolvedProviderId
    ? isLoading
      && !activeProviderReturned
      && isTargetingActiveProvider
    : false
  const isActiveProviderRefreshing = resolvedProviderId
    ? activeProviderReturned && isTargetingActiveProvider
    : false
  const activeTabValue = resolvedProviderId ?? "__none__"

  const isIdleState = !isFetched && !isLoading
  const borderClass = error && !hasData ? "border-destructive/40" : undefined

  return (
    <Card
      className={cn(
        "w-full min-w-0",
        expanded
          ? "h-full min-h-0 py-5"
          : isIdleState
            ? "min-h-[11rem] py-6"
            : "py-5",
        borderClass
      )}
    >
      <CardHeader>
        <div className="flex min-w-0 flex-col">
          <CardTitle className={cn(isIdleState ? "text-base" : "text-sm")}>{label}</CardTitle>
          {isIdleState && availableProviders.length === 0 ? (
            <CardDescription>Click to load</CardDescription>
          ) : null}
          {isLoading && !hasData && (
            <span className="flex items-center text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching data...
            </span>
          )}
          {error && !hasData && (
            <span className="flex items-center text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span className="line-clamp-1">{error}</span>
            </span>
          )}
        </div>
        <CardAction className="row-span-1">
          <div className="flex items-center gap-1">
            {resolvedProviderId && activeProviderReturned && onForceRefresh ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 shrink-0"
                onClick={() => onForceRefresh(resolvedProviderId)}
                title="Force refresh"
                disabled={isActiveProviderRefreshing}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {expanded ? (
              <Button variant="ghost" size="sm" onClick={onCollapse}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : isFetched ? (
              <Button variant="ghost" size="xs" onClick={onExpand} title="View more">
                View more
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>

      {availableProviders.length > 0 ? (
        isIdleState ? (
          <CardContent className="flex flex-wrap gap-3 px-5">
            {availableProviders.map((provider) => {
              const isProviderLoading = isLoading && (
                loadingTarget === provider.id ||
                (loadingTarget === "__selected__" && selectedProviders.includes(provider.id))
              )

              return (
                <Button
                  key={provider.id}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveProviderId(provider.id)
                    if (!returnedProviderIds.has(provider.id) && !isLoading) onLoad(provider.id)
                  }}
                  className="h-auto justify-start gap-3 px-4 py-3"
                >
                  {isProviderLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-black shadow-sm">
                      <ProviderLogo providerId={provider.id} providerName={provider.name} size="md" />
                    </span>
                  )}
                  <span>{provider.name}</span>
                </Button>
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
            <TabsList variant="line" className={cn("justify-start flex-wrap px-5 rounded-none", expanded ? "h-auto" : "h-10")}>
              {availableProviders.map((provider) => {
                const wasReturned = returnedProviderIds.has(provider.id)
                const hasError = wasReturned && typeResults.find((result) => result._provider === provider.id)?.error

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
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white p-1 text-black shadow-sm">
                      <ProviderLogo
                        providerId={provider.id}
                        providerName={provider.name}
                        size={expanded ? "sm" : "md"}
                        className="h-full w-full max-h-4 max-w-4"
                      />
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap transition-all duration-150",
                        expanded
                          ? ""
                          : "max-w-0 overflow-hidden opacity-0 group-hover:max-w-30 group-hover:opacity-100"
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onLoad()}
          className="self-start gap-1.5 text-xs"
        >
          <span>Fetch data</span>
          <ArrowLeft className="h-3 w-3 rotate-180" />
        </Button>
      ) : null}

      {error && !hasData && (
        <Button variant="outline" size="sm" className="mt-3 h-6 self-start gap-1.5 text-xs" onClick={onRetry}>
          <RefreshCw className="h-2.5 w-2.5" /> Retry
        </Button>
      )}

      {resolvedProviderId && activeProviderReturned && (
        <CardContent className={cn("px-5", expanded && "min-h-0 flex-1 overflow-y-auto")}>
          {isActiveProviderRefreshing ? (
            <div className="flex min-h-[8rem] items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : activeErrorMessage ? (
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
      {resolvedProviderId && !activeProviderReturned && isActiveProviderLoading ? (
        <CardContent className={cn("px-5", expanded && "min-h-0 flex-1 overflow-y-auto")}>
          <div className="flex min-h-[8rem] items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}
