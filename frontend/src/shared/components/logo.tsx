import { branding } from "@/shared/lib/branding"

export function Logo({ className = "" }: { className?: string }) {
  if (branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.logoAlt}
        className={className}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-label={branding.logoAlt}
      role="img"
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14 24h20M24 14v20M18 18l12 12M30 18l-12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
