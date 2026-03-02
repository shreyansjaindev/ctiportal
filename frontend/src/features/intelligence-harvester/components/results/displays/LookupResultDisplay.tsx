import type { LookupResult } from "@/shared/types/intelligence-harvester"

import { WebRedirectsDisplay } from "./web-redirects/WebRedirectsDisplay"
import { WebScanDisplay } from "./WebScanDisplay"
import { DnsDisplay } from "./DnsDisplay"
import { WhoisDisplay } from "./WhoisDisplay"
import { ReputationDisplay } from "./ReputationDisplay"
import { ScreenshotDisplay } from "./ScreenshotDisplay"
import { PassiveDnsDisplay } from "./PassiveDnsDisplay"
import { WhoisHistoryDisplay } from "./WhoisHistoryDisplay"
import { SubdomainsDisplay } from "./SubdomainsDisplay"
import { DefaultDisplay } from "./DefaultDisplay"

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
