import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/shared/components"
import { ThemeProvider } from "@/shared/components/ThemeProvider"
import { useAuth } from "@/shared/lib"
import ActiveDirectoryPage from "@/features/active-directory/page"
import DomainMonitoringPage from "@/features/domain-monitoring/page"
import HomePage from "@/features/home/page"
import IntelligenceHarvesterPage from "@/features/intelligence-harvester/page"
import LoginPage from "@/features/login/page"
import MhaPage from "@/features/mha/page"
import TextFormatterPage from "@/features/text-formatter/page"
import ThreatReportExtractorPage from "@/features/threat-report-extractor/page"
import ThreatstreamPage from "@/features/threatstream/page"
import UrlDecoderPage from "@/features/url-decoder/page"

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Redirects already-authenticated users away from public-only routes (e.g. /login)
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route
            path="/intelligence-harvester"
            element={<IntelligenceHarvesterPage />}
          />
          <Route path="/domain-monitoring" element={<DomainMonitoringPage />} />
          <Route path="/threatstream" element={<ThreatstreamPage />} />
          <Route path="/active-directory" element={<ActiveDirectoryPage />} />
          <Route path="/threat-report-extractor" element={<ThreatReportExtractorPage />} />
          <Route path="/text-formatter" element={<Navigate to="/text-utilities" replace />} />
          <Route path="/text-utilities" element={<TextFormatterPage />} />
          <Route path="/url-decoder" element={<Navigate to="/link-unwrapper" replace />} />
          <Route path="/link-unwrapper" element={<UrlDecoderPage />} />
          <Route path="/screenshot" element={<Navigate to="/intelligence-harvester" replace />} />
          <Route path="/mail-header-analyzer" element={<MhaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
