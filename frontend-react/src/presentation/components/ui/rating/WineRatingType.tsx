import type { ReactNode } from 'react'
import type { WineType } from '@domain/wine/wine.types'
import { WineRatingTypeContext } from './wineRatingTypeContext'

/** Draws every glass rating inside with the art of this wine type. */
export function WineRatingTypeProvider({ type, children }: { type?: WineType | string | null; children: ReactNode }) {
  return <WineRatingTypeContext.Provider value={type ?? null}>{children}</WineRatingTypeContext.Provider>
}
