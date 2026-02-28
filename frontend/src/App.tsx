import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/shared/components"
import { useAuth } from "@/shared/lib"
import ActiveDirectoryPage from "@/features/active-directory"
import DomainMonitoringPage from "@/features/domain-monitoring"
import HomePage from "@/features/home"
import LoginPage from "@/features/login"
import IntelligenceHarvesterPage from "@/features/intelligence-harvester"
import MhaPage from "@/features/mha"
import ScreenshotPage from "@/features/screenshot"
import TextFormatterPage from "@/features/text-formatter"
import ThreatstreamPage from "@/features/threatstream"
import UrlDecoderPage from "@/features/url-decoder"

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
        <Route path="/text-formatter" element={<TextFormatterPage />} />
        <Route path="/url-decoder" element={<UrlDecoderPage />} />
        <Route path="/screenshot" element={<ScreenshotPage />} />
        <Route path="/mail-header-analyzer" element={<MhaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
