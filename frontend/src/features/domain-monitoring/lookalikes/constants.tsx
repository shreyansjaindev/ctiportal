import type { DataTableFilterField } from "@/shared/components/data-table/types"
import type { LookalikeDomain } from "../types"
import { LOOKALIKE_STATUS_OPTIONS } from "../constants"

export const LIMIT_OPTIONS = [25, 50, 100]

export const LOOKALIKE_RISK_OPTIONS = ["critical", "high", "medium", "low", "unknown"]

export const lookalikesFilterFields: DataTableFilterField<LookalikeDomain>[] = [
  {
    label: "Created",
    value: "created",
    type: "timerange",
    defaultOpen: true,
  },
  {
    label: "Source Date",
    value: "source_date",
    type: "timerange",
    defaultOpen: true,
  },
  {
    label: "Source",
    value: "source",
    type: "checkbox",
    defaultOpen: true,
  },
  {
    label: "Watched Resource",
    value: "watched_resource",
    type: "checkbox",
    defaultOpen: false,
  },
  {
    label: "Risk Level",
    value: "potential_risk",
    type: "checkbox",
    defaultOpen: true,
    options: LOOKALIKE_RISK_OPTIONS.map((risk) => ({ label: risk, value: risk })),
  },
  {
    label: "Status",
    value: "status",
    type: "checkbox",
    defaultOpen: true,
    options: LOOKALIKE_STATUS_OPTIONS.map((s) => ({ label: s.label, value: s.value })),
  },
  {
    label: "Company",
    value: "company",
    type: "checkbox",
    defaultOpen: false,
  },
]

export const getRiskVariant = (
  risk: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (risk) {
    case "critical":
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "outline"
  }
}

export const getLookalikeStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "open":
      return "default"
    case "closed":
      return "secondary"
    case "takedown":
    case "legal":
      return "destructive"
    case "not_relevant":
      return "outline"
    default:
      return "outline"
  }
}
