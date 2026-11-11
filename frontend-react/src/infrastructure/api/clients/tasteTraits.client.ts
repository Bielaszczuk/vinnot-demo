import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type { AdjustTasteTraitsRequestDto } from '@api/dto/social.dto'

const TASTE_TRAITS = `${API_ENDPOINTS.USERS}/me/taste-traits`

/**
 * Taste traits API client: the signed-in member's hand-set structure scores.
 */
export const tasteTraitsClient = {
  /** 204; partial, `null` clears a trait. 400 INVALID_TASTE_ADJUSTMENT on an unknown trait or a score out of 0-100. */
  async adjust(data: AdjustTasteTraitsRequestDto): Promise<void> {
    await http.put(TASTE_TRAITS, data)
  },

  /** 204; clears every hand-set score, so the calculated ones show again. */
  async reset(): Promise<void> {
    await http.delete(TASTE_TRAITS)
  },
}
