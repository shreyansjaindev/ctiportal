import { useEffect, useState } from "react"

import { cn } from "@/shared/lib/utils"
import { getLogoPath } from "@/shared/utils/logo.utils"

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

function LetterFallback({
  name,
  size,
  className,
}: {
  name: string
  size: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center text-muted-foreground font-semibold flex-shrink-0",
        sizeClasses[size],
        size === "sm" ? "text-[9px]" : size === "md" ? "text-xs" : "text-sm",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function ProviderLogo({
  providerId,
  providerName,
  className,
  size = "md",
}: ProviderLogoProps) {
  const src = getLogoPath(providerId)
  const name = providerName || providerId
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    setShowFallback(false)
  }, [providerId, src])

  if (showFallback) {
    return <LetterFallback name={name} size={size} className={className} />
  }

  return (
    <img
      src={src}
      alt={name}
      className={cn(sizeClasses[size], "object-contain flex-shrink-0", className)}
      onError={() => setShowFallback(true)}
    />
  )
}
