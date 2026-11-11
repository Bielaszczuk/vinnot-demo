import { useCallback, useState } from 'react'
import type { TasteTrait, TasteTraitKey, TasteTraits } from '@domain/social/social.types'
import { clampTasteScore, structureChanges, structureDraft } from '@domain/social/tasteTraits'
import { useAdjustTasteStructure, useResetTasteStructure } from '@hooks/queries/user/useTasteTraits'
import type { TasteStructureEditor } from '@components/features/social/TasteProfileCard'

const NO_STRUCTURE: TasteTrait[] = []

/**
 * Edit state of the own taste profile's structure: the member moves the four bars, then saves only what changed,
 * cancels back to the shown values, or goes back to the calculated values when some score is hand-set.
 */
export function useTasteStructureEditor(traits: TasteTraits | null): TasteStructureEditor {
  const structure = traits?.structure ?? NO_STRUCTURE
  const adjust = useAdjustTasteStructure()
  const reset = useResetTasteStructure()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Record<TasteTraitKey, number>>(() => structureDraft(structure))
  const [touched, setTouched] = useState<ReadonlySet<TasteTraitKey>>(new Set())
  const [failed, setFailed] = useState(false)

  const start = useCallback(() => {
    setValues(structureDraft(structure))
    setTouched(new Set())
    setFailed(false)
    setEditing(true)
  }, [structure])

  const cancel = useCallback(() => {
    setEditing(false)
    setFailed(false)
  }, [])

  const change = useCallback((trait: TasteTraitKey, value: number) => {
    setValues((current) => ({ ...current, [trait]: clampTasteScore(value) }))
    setTouched((current) => new Set(current).add(trait))
  }, [])

  const { mutateAsync: saveChanges } = adjust
  const { mutateAsync: clearAdjustments } = reset

  const save = useCallback(() => {
    const changes = structureChanges(structure, values, touched)
    if (Object.keys(changes).length === 0) {
      setEditing(false)
      return
    }
    setFailed(false)
    saveChanges(changes).then(() => setEditing(false), () => setFailed(true))
  }, [saveChanges, structure, touched, values])

  const restore = useCallback(() => {
    setFailed(false)
    clearAdjustments().then(() => setEditing(false), () => setFailed(true))
  }, [clearAdjustments])

  return {
    editing,
    values,
    start,
    cancel,
    change,
    save,
    reset: restore,
    busy: adjust.isPending || reset.isPending,
    saving: adjust.isPending,
    resetting: reset.isPending,
    canReset: structure.some((entry) => entry.adjusted),
    failed,
  }
}
