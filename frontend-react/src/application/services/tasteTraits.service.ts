/**
 * Taste traits service — the signed-in member refines the structure of their taste profile by hand.
 *
 * Flow: presentation hook → taste traits service → taste traits API client → HTTP.
 */
import { tasteTraitsClient } from '@api/clients/tasteTraits.client'
import type { TasteStructureChanges } from '@domain/social/social.types'

export const tasteTraitsService = {
  /** Saves the given hand-set scores; a `null` clears that trait and the traits left out stay as they are. */
  async adjustStructure(changes: TasteStructureChanges): Promise<void> {
    await tasteTraitsClient.adjust({ structure: changes })
  },

  /** Clears every hand-set score, so the profile shows the calculated structure again. */
  async resetStructure(): Promise<void> {
    await tasteTraitsClient.reset()
  },
}
