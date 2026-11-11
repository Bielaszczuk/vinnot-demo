/**
 * Taste traits hooks: the signed-in member saves hand-set structure scores or clears them.
 * Flow: page → hook → service → client → http
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { tasteTraitsService } from '@services/tasteTraits.service'
import { useAuth } from '@hooks/useAuth'
import type { TasteStructureChanges } from '@domain/social/social.types'

/** After a change the own profile is fetched again; the mutation settles once the fresh profile is in. */
function useRefreshOwnProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => (user ? queryClient.invalidateQueries({ queryKey: queryKeys.social.profile(user.id) }) : Promise.resolve())
}

/** Saves the given hand-set structure scores. */
export function useAdjustTasteStructure() {
  const refresh = useRefreshOwnProfile()
  return useMutation<void, Error, TasteStructureChanges>({
    mutationFn: (changes) => tasteTraitsService.adjustStructure(changes),
    onSuccess: () => refresh(),
  })
}

/** Clears every hand-set structure score, back to the calculated ones. */
export function useResetTasteStructure() {
  const refresh = useRefreshOwnProfile()
  return useMutation<void, Error, void>({
    mutationFn: () => tasteTraitsService.resetStructure(),
    onSuccess: () => refresh(),
  })
}
