import { describe, expect, it } from 'vitest'
import { clampTasteScore, structureChanges, structureDraft, tasteLevel } from './tasteTraits'

describe('taste level', () => {
  it('reads a 0-100 score as low under 34, medium under 67 and high from 67', () => {
    expect(tasteLevel(0)).toBe('LOW')
    expect(tasteLevel(33)).toBe('LOW')
    expect(tasteLevel(33.9)).toBe('LOW')
    expect(tasteLevel(34)).toBe('MEDIUM')
    expect(tasteLevel(66)).toBe('MEDIUM')
    expect(tasteLevel(67)).toBe('HIGH')
    expect(tasteLevel(100)).toBe('HIGH')
  })
})

describe('adjusting the structure', () => {
  const structure = [
    { trait: 'ACIDITY' as const, score: 20.4, wines: 9, adjusted: false },
    { trait: 'TANNIN' as const, score: 80, wines: 7, adjusted: true },
  ]

  it('keeps an adjusted score a whole number from 0 to 100', () => {
    expect(clampTasteScore(-3)).toBe(0)
    expect(clampTasteScore(104)).toBe(100)
    expect(clampTasteScore(62.6)).toBe(63)
  })

  it('starts from the shown scores, and from the middle for the traits without data', () => {
    expect(structureDraft(structure)).toEqual({ ACIDITY: 20, BODY: 50, TANNIN: 80, SWEETNESS: 50 })
  })

  it('sends only the traits that changed, and the traits without data only when touched', () => {
    const draft = { ACIDITY: 20, BODY: 50, TANNIN: 65, SWEETNESS: 50 }
    expect(structureChanges(structure, draft, new Set())).toEqual({ TANNIN: 65 })
    expect(structureChanges(structure, draft, new Set(['BODY', 'ACIDITY'] as const))).toEqual({ TANNIN: 65, BODY: 50 })
    expect(structureChanges(structure, structureDraft(structure), new Set())).toEqual({})
  })
})
