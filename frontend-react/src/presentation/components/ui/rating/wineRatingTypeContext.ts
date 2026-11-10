/**
 * The wine type the glass ratings below a provider are drawn for, so a review
 * list or a form does not pass it through every card.
 */

import { createContext, useContext } from 'react'
import type { WineType } from '@domain/wine/wine.types'

export const WineRatingTypeContext = createContext<WineType | string | null>(null)

/** The explicit type when given, else the surrounding provider's, else `null` (drawn as red). */
export function useWineRatingType(explicit?: WineType | string | null): WineType | string | null {
  const inherited = useContext(WineRatingTypeContext)
  return explicit ?? inherited
}
