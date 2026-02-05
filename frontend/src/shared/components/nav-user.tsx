import { LogOut } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/shared/components/ui/sidebar"

export function NavUser({
  user,
  onLogout,
  variant = "sidebar",
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => void
  variant?: "sidebar" | "header"
}) {
  const { isMobile } = useSidebar()

  const menuContent = (
    <DropdownMenuContent
      className="min-w-56 rounded-lg"
      side={isMobile ? "bottom" : variant === "header" ? "bottom" : "right"}
      align="end"
      sideOffset={6}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onLogout} className="cursor-pointer">
        <LogOut />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="cursor-pointer">
            <Avatar className="h-7 w-7 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div className="hidden text-left text-xs leading-tight md:block">
              <div className="font-medium text-neutral-900">{user.name}</div>
              <div className="text-neutral-500">{user.email}</div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {menuContent}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

