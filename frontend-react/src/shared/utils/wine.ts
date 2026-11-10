/**
 * Formats a wine display name with grape varieties.
 *
 * Examples:
 *  - "Lindaflor" + ["Blend"] → "Lindaflor (Blend)"
 *  - "Navarro Correa" + ["Cabernet Sauvignon", "Petit Verdot"] → "Navarro Correa (Cabernet Sauvignon - Petit Verdot)"
 *  - "Some Wine" + [] → "Some Wine"
 */
export function formatWineDisplayName(name: string, grapes?: string[]): string {
  const lowerName = name.toLowerCase()
  // A grape already in the name ("Reserve Pinot Noir") is not repeated.
  const missing = (grapes ?? []).filter((grape) => !lowerName.includes(grape.trim().toLowerCase()))
  if (missing.length === 0) {
    return name
  }
  return `${name}  ${missing.join(' - ')}`
}

/**
 * Returns a default wine bottle image based on type.
 * White and sparkling wines get a lighter bottle, everything else gets a dark bottle.
 */
export function wineDefaultImage(type?: string): string {
  const light = '/images/mock/winebottle2.webp'
  const dark = '/images/mock/winebottle.webp'
  const map: Record<string, string> = {
    white: light,
    sparkling: light,
    red: dark,
    rose: dark,
    rosé: dark,
  }
  return map[type?.toLowerCase() ?? ''] ?? dark
}

