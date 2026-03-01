import type { LookupResult } from "@/shared/types/intelligence-harvester"

import { WebRedirectsDisplay } from "./displays/WebRedirectsDisplay"
import { WebScanDisplay } from "./displays/WebScanDisplay"
import { DnsDisplay } from "./displays/DnsDisplay"
import { WhoisDisplay } from "./displays/WhoisDisplay"
import { ReputationDisplay } from "./displays/ReputationDisplay"
import { ScreenshotDisplay } from "./displays/ScreenshotDisplay"
import { PassiveDnsDisplay } from "./displays/PassiveDnsDisplay"
import { WhoisHistoryDisplay } from "./displays/WhoisHistoryDisplay"
import { SubdomainsDisplay } from "./displays/SubdomainsDisplay"
import { DefaultDisplay } from "./displays/DefaultDisplay"

export function renderLookupDisplay(type: string, result: LookupResult, isOverview: boolean) {
  switch (type) {
    case "web_redirects":  return <WebRedirectsDisplay result={result} isOverview={isOverview} />
    case "web_scan":       return <WebScanDisplay result={result} isOverview={isOverview} />
    case "dns":            return <DnsDisplay result={result} isOverview={isOverview} />
    case "whois":          return <WhoisDisplay result={result} isOverview={isOverview} />
    case "reputation":     return <ReputationDisplay result={result} isOverview={isOverview} />
    case "screenshot":     return <ScreenshotDisplay result={result} isOverview={isOverview} />
    case "passive_dns":    return <PassiveDnsDisplay result={result} isOverview={isOverview} />
    case "subdomains":     return <SubdomainsDisplay result={result} isOverview={isOverview} />
    case "whois_history":  return <WhoisHistoryDisplay result={result} isOverview={isOverview} />
    default:               return <DefaultDisplay result={result} isOverview={isOverview} />
  }
}
