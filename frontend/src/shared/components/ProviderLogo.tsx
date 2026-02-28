import { getLogoPathWithFallback } from "@/shared/utils/logo.utils"
import { cn } from "@/shared/lib/utils"

interface ProviderLogoProps {
  providerId: string
  providerName?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

function letterFallback(name: string, size: "sm" | "md" | "lg"): HTMLDivElement {
  const div = document.createElement('div')
  div.className = cn(
    "flex items-center justify-center rounded bg-muted text-muted-foreground font-semibold flex-shrink-0",
    sizeClasses[size],
    size === "sm" ? "text-[9px]" : size === "md" ? "text-xs" : "text-sm"
  )
  div.textContent = name.charAt(0).toUpperCase()
  return div
}

export function ProviderLogo({ 
  providerId, 
  providerName, 
  className,
  size = "md" 
}: ProviderLogoProps) {
  const { primary, fallback } = getLogoPathWithFallback(providerId)
  const name = providerName || providerId

  return (
    <img
      src={primary}
      alt={name}
      className={cn(sizeClasses[size], "object-contain flex-shrink-0", className)}
      onError={(e) => {
        const img = e.currentTarget
        // Try alternate extension first, then letter avatar
        if (img.src !== window.location.origin + fallback) {
          img.src = fallback
        } else {
          img.replaceWith(letterFallback(name, size))
        }
      }}
    />
  )
}
