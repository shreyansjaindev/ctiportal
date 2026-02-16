import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/shared/lib/auth"
import * as aggregators from "@/shared/lib/aggregators"
import { IndicatorInput, LookupConfiguration, IntelligenceHarvesterSidebar } from "./components"
import { parseIndicators, getInputPlaceholder } from "@/shared/lib/indicator-utils"
import { useProviderSelection } from "@/shared/hooks"
import { executeIndicatorLookups } from "@/shared/services"
import { getIndicatorKind } from "@/shared/utils"
import type { IndicatorResult, IndicatorType } from "@/shared/types/intelligence-harvester"

export default function IntelligenceHarvesterPage() {
  const { token } = useAuth()
  const [quickInput, setQuickInput] = useState("")
  const [indicators, setIndicators] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem("ih.indicators")
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch (error) {
      console.error("Failed to parse stored indicators from localStorage:", error)
      return []
    }
  })
  const [indicatorTypes, setIndicatorTypes] = useState<Map<string, IndicatorType>>(new Map())
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(new Set())
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null)

  // Use custom hook for provider selection
  const { selections, setters, enabledTypes, getProviderForType } = useProviderSelection()

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("ih.indicators", JSON.stringify(indicators))
  }, [indicators])

  useEffect(() => {
    if (!token || indicators.length === 0) return

    const controller = new AbortController()
    // Debounce identifier lookup by 500ms
    const timer = setTimeout(() => {
      aggregators.identifyIndicators(indicators, token)
        .then((results) => {
          if (controller.signal.aborted) return
          
          // Validate response structure
          if (!Array.isArray(results)) {
            console.error("Invalid identifier response:", results)
            return
          }
          
          setIndicatorTypes(() => {
            const next = new Map<string, IndicatorType>()
            results.forEach((result) => {
              if (result?.value && result?.type) {
                next.set(result.value, result.type)
              }
            })
            return next
          })
        })
        .catch((error) => {
          console.error("Failed to identify indicators:", error)
          // Optionally: show warning toast to user
        })
    }, 500)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [token, indicators])

  // Fetch all providers in a single call
  const allProvidersQuery = useQuery({
    queryKey: ["all-providers"],
    queryFn: () => aggregators.getAllProviders(token!),
    enabled: !!token,
  })

  // Get current providers list
  const providersByType = allProvidersQuery.data?.providers_by_type || {
    whois: [],
    ip_info: [],
    reputation: [],
    dns: [],
    passive_dns: [],
    whois_history: [],
    reverse_dns: [],
    screenshot: [],
    email_validator: [],
    vulnerability: [],
    web_search: [],
    website_status: [],
  }

  const filteredIndicators = useMemo(() => {
    return indicators
  }, [indicators])

  const addIndicators = (raw: string) => {
    const indicatorSet = new Set(indicators)
    const additions = parseIndicators(raw).filter(
      (value) => !indicatorSet.has(value)
    )
    if (!additions.length) return []

    setIndicators((prev) => [...prev, ...additions])
    return additions
  }

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators((prev) => {
      const next = new Set(prev)
      if (next.has(indicator)) {
        next.delete(indicator)
      } else {
        next.add(indicator)
      }
      return next
    })
  }

  const toggleAllIndicators = (checked: boolean) => {
    if (checked) {
      setSelectedIndicators(new Set(filteredIndicators))
    } else {
      setSelectedIndicators(new Set())
    }
  }

  const removeIndicator = (indicator: string) => {
    const updatedIndicators = indicators.filter((value) => value !== indicator)
    setIndicators(updatedIndicators)
    setIndicatorTypes((prev) => {
      const next = new Map(prev)
      next.delete(indicator)
      return next
    })
    setSelectedIndicators((prev) => {
      const next = new Set(prev)
      next.delete(indicator)
      return next
    })
    // Clear activeIndicator if we're removing it or if no indicators remain
    if (activeIndicator === indicator || updatedIndicators.length === 0) {
      setActiveIndicator(null)
    }
    // Reset lookup results if no indicators remain
    if (updatedIndicators.length === 0) {
      lookupMutation.reset()
    }
  }

  const removeSelectedIndicators = () => {
    if (!selectedIndicators.size) return
    const updatedIndicators = indicators.filter((value) => !selectedIndicators.has(value))
    setIndicators(updatedIndicators)
    setIndicatorTypes((prev) => {
      const next = new Map(prev)
      selectedIndicators.forEach((indicator) => next.delete(indicator))
      return next
    })
    setSelectedIndicators(new Set())
    // Clear activeIndicator if it's being removed or if no indicators remain
    if ((activeIndicator && selectedIndicators.has(activeIndicator)) || updatedIndicators.length === 0) {
      setActiveIndicator(null)
    }
    // Reset lookup results if no indicators remain
    if (updatedIndicators.length === 0) {
      lookupMutation.reset()
    }
  }

  const clearAllIndicators = () => {
    setIndicators([])
    setIndicatorTypes(new Map())
    setSelectedIndicators(new Set())
    setActiveIndicator(null)
    lookupMutation.reset()
  }

  // Perform lookup mutation
  const lookupMutation = useMutation({
    mutationFn: async (payload?: { indicatorsOverride?: string[] }) => {
      if (!token) throw new Error("Not authenticated")

      const indicatorsToUse = payload?.indicatorsOverride
        ? payload.indicatorsOverride
        : selectedIndicators.size
        ? Array.from(selectedIndicators)
        : indicators

      if (!indicatorsToUse.length) {
        throw new Error("No indicators selected")
      }

      const tasks = indicatorsToUse.map(async (indicator) => {
        const indicatorType = indicatorTypes.get(indicator)
        const kind = getIndicatorKind(indicatorType)

        const results = await executeIndicatorLookups({
          indicator,
          kind,
          selectedTypes: enabledTypes,
          providers_by_type: providersByType,
          getProviderForType,
          token,
        })

        return { indicator, results }
      })

      return Promise.all(tasks)
    },
    onSuccess: (data) => {
      const results = data as IndicatorResult[]
      const first = results[0]?.indicator ?? null
      setActiveIndicator((prev) => {
        if (prev && results.some((item) => item.indicator === prev)) {
          return prev
        }
        return first
      })
    },
    onError: (error) => {
      console.error("Lookup failed:", error)
      // TODO: Show toast notification to user with error message
    },
  })

  const lookupResults = useMemo<IndicatorResult[]>(() => {
    if (!Array.isArray(lookupMutation.data)) return []
    return lookupMutation.data
      .filter(item => 
        item?.indicator && 
        Array.isArray(item.results)
      )
  }, [lookupMutation.data])

  const handleLookup = () => {
    if (!indicators.length && !quickInput.trim()) return

    if (quickInput.trim()) {
      const additions = addIndicators(quickInput)
      const nextIndicators = Array.from(new Set([...indicators, ...additions]))
      setQuickInput("") // Clear input after adding
      lookupMutation.mutate({ indicatorsOverride: nextIndicators })
      return
    }

    lookupMutation.mutate(undefined)
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-card overflow-hidden">
      {/* Controls - Side by side */}
      <div className="grid gap-0 lg:grid-cols-2 flex-shrink-0 border-b divide-y lg:divide-y-0 lg:divide-x">
        <IndicatorInput
          quickInput={quickInput}
          setQuickInput={setQuickInput}
          onAdd={(input) => {
            addIndicators(input)
            setQuickInput("")
          }}
          indicatorCount={indicators.length}
          placeholder={getInputPlaceholder()}
          className="border-0 rounded-none shadow-none"
        />

        <LookupConfiguration
          whoisProvider={selections.whois}
          setWhoisProvider={setters.setWhois}
          geoProvider={selections.geoLocation}
          setGeoProvider={setters.setGeoLocation}
          reputationProvider={selections.reputation}
          setReputationProvider={setters.setReputation}
          dnsProvider={selections.dns}
          setDnsProvider={setters.setDns}
          passiveDnsProvider={selections.passiveDns}
          setPassiveDnsProvider={setters.setPassiveDns}
          whoisHistoryProvider={selections.whoisHistory}
          setWhoisHistoryProvider={setters.setWhoisHistory}
          reverseDnsProvider={selections.reverseDns}
          setReverseDnsProvider={setters.setReverseDns}
          screenshotProvider={selections.screenshot}
          setScreenshotProvider={setters.setScreenshot}
          emailValidationProvider={selections.emailValidator}
          setEmailValidationProvider={setters.setEmailValidator}
          vulnerabilityProvider={selections.vulnerability}
          setVulnerabilityProvider={setters.setVulnerability}
          webSearchProvider={selections.webSearch}
          setWebSearchProvider={setters.setWebSearch}
          websiteStatusProvider={selections.websiteStatus}
          setWebsiteStatusProvider={setters.setWebsiteStatus}
          providersByType={providersByType}
          presets={allProvidersQuery.data?.presets}
          className="border-0 rounded-none shadow-none"
        />
      </div>

      {/* Secondary Sidebar - Full Width Below */}
      <div className="flex-1 min-h-0">
        <IntelligenceHarvesterSidebar 
          indicators={indicators}
          indicatorTypes={indicatorTypes}
          selectedIndicators={selectedIndicators}
          activeIndicator={activeIndicator}
          lookupResults={lookupResults}
          isLoading={lookupMutation.isPending}
          onRunLookup={handleLookup}
          canRun={Boolean(indicators.length || quickInput.trim())}
          isRunning={lookupMutation.isPending}
          onToggleIndicator={toggleIndicator}
          onToggleAll={toggleAllIndicators}
          onRemoveSelected={removeSelectedIndicators}
          onRemoveIndicator={removeIndicator}
          onClearAll={clearAllIndicators}
          onIndicatorClick={setActiveIndicator}
        />
      </div>
    </div>
  )
}

