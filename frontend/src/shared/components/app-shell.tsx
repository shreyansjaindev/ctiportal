import { Outlet, useLocation } from "react-router-dom"

import { Input } from "@/shared/components/ui/input"
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar"
import { AppSidebar } from "@/shared/components/app-sidebar"
import { Logo } from "@/shared/components/logo"
import { NavUser } from "@/shared/components/nav-user"
import { navItems } from "@/shared/components/navigation"
import { useAuth } from "@/shared/lib/auth"
import { SearchIcon } from "lucide-react"

export function AppShell() {
  const location = useLocation()
  const { logout } = useAuth()
  const current = navItems.find((item) => item.path === location.pathname)

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar variant="floating" />

      <SidebarInset>
        <div className="h-screen bg-background flex flex-col">
          <header className="sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
            <div className="flex h-full w-full flex-wrap items-center justify-between gap-3 px-4">
              <div className="flex flex-1 items-center gap-3">
                <Logo className="h-6 w-6 text-foreground" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {current?.title ?? "Overview"}
                  </p>
                </div>
              </div>
              <div className="hidden w-full max-w-md items-center md:flex">
                <div className="relative w-full">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search indicators, apps, or tools..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <NavUser
                  user={{
                    name: "CTI Analyst",
                    email: "analyst@cti.local",
                    avatar: "",
                  }}
                  onLogout={logout}
                  variant="header"
                />
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 flex flex-col px-2 pb-2 pt-2 md:pl-[calc(var(--sidebar-width-icon)+1rem)]">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

