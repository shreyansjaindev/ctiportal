import type { IndicatorType, LookupResult } from "@/shared/types/intelligence-harvester"

export type CategoryEntry = {
  indicator: string
  indicatorType?: IndicatorType
  result: LookupResult
}

export type CategoryProvider = {
  id: string
  name: string
  isSelected: boolean
}

export type CategoryTableRow = Record<string, unknown> & {
  observable: string
}
