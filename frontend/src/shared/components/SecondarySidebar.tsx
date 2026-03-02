import { useSidebar } from "@/shared/components/ui/sidebar"
import { cn } from "@/shared/lib/utils"

interface SecondarySidebarProps {
  children: React.ReactNode
  className?: string
}

export function SecondarySidebar({ children, className }: SecondarySidebarProps) {
  const { state } = useSidebar()
  
  // Calculate left offset based on primary sidebar state
  const leftOffset = state === "collapsed" 
    ? "left-[calc(var(--sidebar-width-icon))]"  // 3rem when collapsed
    : "left-[calc(var(--sidebar-width))]"         // 16rem when expanded

  return (
    <div
      className={cn(
        "fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] border-l bg-sidebar text-sidebar-foreground transition-[left] duration-200 ease-linear md:flex",
        leftOffset,
        className
      )}
    >
      <div className="flex h-full w-full flex-col">
        {children}
      </div>
    </div>
  )
}
