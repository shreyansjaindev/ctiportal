import { cn } from "@/shared/lib/utils"

interface AnomaliIconProps {
  className?: string
}

export function AnomaliIcon({ className }: AnomaliIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      <path
        d="M5 46L23.5 13.5C25.2 10.6 27.8 9 32 9C36.2 9 38.8 10.6 40.5 13.5L59 46"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="24" y="28" width="16" height="8" rx="4" fill="#1E90FF" />
    </svg>
  )
}
