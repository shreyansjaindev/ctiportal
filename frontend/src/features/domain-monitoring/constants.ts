import type { StatusOption } from "./components"

export const LOOKALIKE_STATUS_OPTIONS: StatusOption[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "takedown", label: "Takedown" },
  { value: "legal", label: "Legal" },
  { value: "not_relevant", label: "Not Relevant" },
]

export const WATCHED_TYPES = ["domain", "keyword"]
export const WATCHED_STATUS = ["active", "inactive"]
export const LIMIT_OPTIONS = [25, 50, 100]
