/**
 * Winery domain validators (Zod schemas)
 */

import { z } from 'zod'

export const wineryFilterSchema = z.object({
  search: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
})

export type WineryFilterInput = z.infer<typeof wineryFilterSchema>

