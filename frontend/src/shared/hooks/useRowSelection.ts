import { useCallback, useState } from 'react'

export function useRowSelection<TId extends number | string = number>(
  initialIds: Iterable<TId> = [],
) {
  const [selectedIds, setSelectedIds] = useState<Set<TId>>(() => new Set(initialIds))

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return {
    selectedIds,
    setSelectedIds,
    clearSelection,
  }
}
