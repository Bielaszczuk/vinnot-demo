/**
 * useTasteWheelView — the state behind the taste wheel: which view is open (grapes by default, or the first view
 * with entries) and which slice is highlighted. Switching the view clears the highlight; so does picking the same
 * slice again. A view or slice that disappears when the entries change falls back on its own.
 */
import { useCallback, useMemo, useState } from 'react'
import type { TasteWheelEntry, TasteWheelKind } from '@domain/social/social.types'
import { tasteWheelView, tasteWheelViews, type TasteWheelViewSlice } from '@domain/social/tasteWheel'

export interface TasteWheelViewModel {
  /** The views that have entries, in selector order. */
  views: TasteWheelKind[]
  view: TasteWheelKind | null
  choose: (view: TasteWheelKind) => void
  slices: TasteWheelViewSlice[]
  selected: TasteWheelViewSlice | null
  toggle: (key: string) => void
  clear: () => void
}

export function useTasteWheelView(entries: TasteWheelEntry[]): TasteWheelViewModel {
  const views = useMemo(() => tasteWheelViews(entries), [entries])
  const [chosen, setChosen] = useState<TasteWheelKind | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const view = chosen && views.includes(chosen) ? chosen : (views[0] ?? null)
  const slices = useMemo(() => (view ? tasteWheelView(entries, view) : []), [entries, view])
  const selected = slices.find((slice) => slice.key === selectedKey) ?? null

  const choose = useCallback((next: TasteWheelKind) => {
    setChosen(next)
    setSelectedKey(null)
  }, [])
  const toggle = useCallback((key: string) => setSelectedKey((current) => (current === key ? null : key)), [])
  const clear = useCallback(() => setSelectedKey(null), [])

  return { views, view, choose, slices, selected, toggle, clear }
}
