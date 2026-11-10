/**
 * Wine score utilities — shared logic for converting AI profile scores
 * and text descriptors into numeric percentages for bar rendering.
 *
 * Priority: numeric score > text descriptor > default fallback (50)
 */

/**
 * Parse a raw score value (number, string "75", or fraction "3/5") into 0-100.
 * Returns null if the value can't be parsed, so callers can fall back to text.
 */
function parseNumericScore(val: number | string | null | undefined): number | null {
  if (val == null) return null
  if (typeof val === 'number') {
    return (val >= 0 && val <= 100) ? val : null
  }
  const str = String(val).trim()
  // Fraction like "3/5"
  const frac = str.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (frac && frac[1] && frac[2]) {
    const n = (parseFloat(frac[1]) / parseFloat(frac[2])) * 100
    return Math.max(0, Math.min(100, n))
  }
  // Plain number like "75"
  const num = Number(str)
  if (!isNaN(num) && num >= 0 && num <= 100) return num
  return null
}

/**
 * Maps a text descriptor (Spanish/English) to a 0-100 numeric score.
 * Ordered from most specific to least specific to avoid false substring matches.
 */
export function textToScore(text: string | null | undefined): number {
  if (!text) return 50
  const lower = text.toLowerCase().trim()

  const descriptors: [string, number][] = [
    // Very specific (check first)
    ['bone dry', 10], ['muy seco', 10], ['bien seco', 10],
    ['very low', 10], ['muy bajo', 10], ['muy baja', 10], ['muy ligero', 10], ['muy suave', 10],
    ['very high', 90], ['muy alto', 90], ['muy alta', 90], ['muy intenso', 90], ['muy pronunciado', 90],
    ['medium-full', 65], ['medio-completo', 65], ['medio completo', 65],
    ['medium-high', 65], ['medio-alto', 65], ['medio-alta', 65], ['media-alta', 65], ['medio alto', 65], ['media alta', 65],
    ['medium-light', 35], ['medio-ligero', 35], ['medio ligero', 35], ['medio-liviano', 35],
    ['medium-low', 35], ['medio-bajo', 35], ['medio-baja', 35], ['media-baja', 35], ['medio bajo', 35],
    ['medium+', 65], ['medio+', 65], ['media+', 65],
    ['medium-', 35], ['medio-', 35], ['media-', 35],
    ['off-dry', 35], ['semi-seco', 35], ['semiseco', 35],
    // English keywords
    ['none', 5], ['absent', 5],
    ['low', 20], ['light', 20], ['subtle', 20], ['delicate', 25],
    ['medium', 50], ['moderate', 50], ['balanced', 55],
    ['high', 80], ['full', 85], ['pronounced', 80], ['bold', 85],
    ['powerful', 90], ['intense', 85], ['robust', 85], ['opaque', 90],
    ['dry', 20], ['sweet', 85],
    ['grippy', 80], ['firm', 75], ['chalky', 70], ['structured', 70],
    ['silky', 40], ['smooth', 35], ['soft', 30], ['velvety', 45], ['elegant', 45],
    // Spanish keywords
    ['nulo', 5], ['ausente', 5], ['ninguno', 5],
    ['bajo', 20], ['baja', 20], ['ligero', 20], ['ligera', 20], ['liviano', 20], ['liviana', 20],
    ['sutil', 20], ['suave', 30], ['delicado', 25], ['delicada', 25],
    ['medio', 50], ['media', 50], ['moderado', 50], ['moderada', 50], ['equilibrado', 55], ['equilibrada', 55],
    ['alto', 80], ['alta', 80], ['completo', 85], ['completa', 85],
    ['pronunciado', 80], ['pronunciada', 80], ['intenso', 85], ['intensa', 85],
    ['robusto', 85], ['robusta', 85], ['potente', 90], ['poderoso', 90],
    ['seco', 20], ['dulce', 85],
    ['firme', 75], ['tánico', 75], ['estructurado', 70], ['estructurada', 70],
    ['sedoso', 40], ['sedosa', 40], ['aterciopelado', 45], ['aterciopelada', 45],
    ['elegante', 45], ['refinado', 45], ['refinada', 45],
    ['carnoso', 70], ['carnosa', 70], ['untuoso', 65], ['untuosa', 65],
    ['amplio', 70], ['amplia', 70], ['redondo', 55], ['redonda', 55],
    ['fresco', 65], ['fresca', 65], ['vibrante', 70], ['crocante', 70], ['crujiente', 70],
  ]

  for (const [key, val] of descriptors) {
    if (lower.includes(key)) return val
  }
  return 50
}

/**
 * Resolve a bar score for rendering.
 *
 * Priority:
 *  1. Numeric score (sweetnessScore, acidityScore, etc.) — always wins if valid 0-100
 *  2. Text descriptor ("Seco", "Medium+") — converted to 0-100 via textToScore
 *  3. Default: 50
 *
 * @returns A clamped 0-100 value for use as bar width percentage
 */
export function resolveBarScore(
  numericScore: number | string | null | undefined,
  text: string | null | undefined,
): number {
  const parsed = parseNumericScore(numericScore)
  if (parsed != null) return parsed
  return textToScore(text)
}

