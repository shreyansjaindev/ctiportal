import { getLogoPath } from "@/shared/utils/logo.utils"
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

export function ProviderLogo({ 
  providerId, 
  providerName, 
  className,
  size = "md" 
}: ProviderLogoProps) {
  const logoPath = getLogoPath(providerId)
  const name = providerName || providerId

  return (
    <img 
      src={logoPath} 
      alt={name}
      className={cn(sizeClasses[size], "object-contain", className)}
      onError={(e) => {
        // Fallback to letter icon on image load error
        const container = e.currentTarget.parentElement
        if (container) {
          const firstLetter = name.charAt(0).toUpperCase()
          const fallback = document.createElement('div')
          fallback.className = cn(
            "flex items-center justify-center rounded-md bg-muted text-muted-foreground font-bold",
            sizeClasses[size],
            size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm"
          )
          fallback.textContent = firstLetter
          e.currentTarget.replaceWith(fallback)
        }
      }}
    />
  )
}
