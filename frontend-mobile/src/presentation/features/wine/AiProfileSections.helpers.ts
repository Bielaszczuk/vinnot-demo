import type { ArtItem } from "@/domain/wine/wine.profile-art";
import type { Vignette } from "./profileArt/RotatingVignette";

/** Resolve a numeric score (0-100) from a descriptive string or raw number. */
export function resolveBarScore(score?: number | null, label?: string | null): number {
  if (score != null && score >= 0 && score <= 100) return score;
  if (!label) return 0;
  const lo = label.toLowerCase();
  if (/\b(alto|alta|high|elevad|muy)/i.test(lo)) return 80;
  if (/\b(medio|media|medium|moderate|moderado)/i.test(lo)) return 55;
  if (/\b(bajo|baja|low|light|leve|poco)/i.test(lo)) return 30;
  if (/\b(seco|dry)/i.test(lo)) return 15;
  if (/\b(dulce|sweet)/i.test(lo)) return 75;
  return 50;
}

/** Section art items with their bundled illustration. */
export function toVignettes<Key extends string>(items: ArtItem<Key>[] | undefined, assets: Record<Key, number>): Vignette[] {
  return (items ?? []).map(({ label, art }) => ({ key: art, label, source: assets[art] }));
}
