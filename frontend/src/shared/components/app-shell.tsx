import { Outlet, useLocation } from "react-router-dom"

import { Input } from "@/shared/components/ui/input"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar"
import { AppSidebar } from "@/shared/components/app-sidebar"
import { ModeToggle } from "@/shared/components/mode-toggle"
import { navItems } from "@/shared/components/navigation"
import { SearchIcon } from "lucide-react"
import { Separator } from "@/shared/components/ui/separator"

export function AppShell() {
  const location = useLocation()
  const current = navItems.find((item) => item.path === location.pathname)

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />

      <SidebarInset>
        <div className="h-screen bg-background flex flex-col">
          <header className="sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
            <div className="flex h-full w-full flex-wrap items-center justify-between gap-3 px-4">
              <div className="flex flex-1 items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="h-4" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {current?.title ?? "Overview"}
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <div className="w-full min-w-0 md:min-w-80 md:max-w-xl lg:max-w-2xl">
                  <div className="relative w-full">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search indicators, apps, or tools..."
                      className="pl-9"
                    />
                  </div>
                </div>
                <ModeToggle />
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 flex flex-col">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

