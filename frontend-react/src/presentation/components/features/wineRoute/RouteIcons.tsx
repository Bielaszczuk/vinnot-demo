import { Car, Footprints, Hotel, Landmark, Map, Mountain, Utensils, Wine, type LucideIcon } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import type { RouteDifficulty, StopType } from '@domain/route/route.types'

const difficultyIcons: Record<RouteDifficulty, LucideIcon> = { short: Footprints, medium: Car, long: Map }
const stopIcons: Record<StopType, LucideIcon> = { winery: Landmark, restaurant: Utensils, viewpoint: Mountain, attraction: Wine, accommodation: Hotel }

export function RouteDifficultyIcon({ difficulty }: { difficulty: RouteDifficulty }) {
  return <Icon icon={difficultyIcons[difficulty] ?? Map} />
}

export function RouteStopTypeIcon({ type }: { type: StopType }) {
  return <Icon icon={stopIcons[type] ?? Map} className="text-wine-700" />
}
