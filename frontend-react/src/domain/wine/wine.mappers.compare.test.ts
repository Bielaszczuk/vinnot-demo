import { describe, expect, it } from 'vitest'
import { mapWineComparisonFromDto } from './wine.mappers.compare'

const richContent = {
  tastingNotes: {
    wineA: { identity: 'Gualtallary altitude sets it apart', appearance: 'Deep violet', nose: 'Violets and graphite', palate: 'Taut, chalky tannins', finish: 'Long and saline' },
    wineB: { identity: 'Oak-aged Luján classic', appearance: 'Garnet rim', nose: 'Plum and vanilla', palate: 'Round and broad', finish: 'Medium, sweet spice' },
  },
  chooseIf: [
    { pick: 'A', situation: 'Grilled lamb with herbs', why: 'Acidity cuts the fat' },
    { pick: 'B', situation: 'A cold winter night', why: 'Its oak feels warm' },
  ],
  pairings: {
    wineA: [{ dish: 'Lamb with chimichurri', why: 'Herbal lift' }],
    wineB: [{ dish: 'Braised short ribs', why: 'Matches the round body' }],
    shared: { dish: 'Aged provoleta', why: 'Both handle the salt' },
  },
  serving: {
    wineA: { temperature: '16-17 °C', decanting: '30 minutes' },
    wineB: { temperature: '17-18 °C', decanting: 'Not needed' },
  },
  aging: { wineA: 'Drink 2026-2032', wineB: 'Drink now to 2028' },
  value: 'Wine B costs less for a similar rating.',
}

const legacyAttributes = [
  { name: 'Body', wineAValue: 'Full', wineBValue: 'Medium', wineAScore: 80, wineBScore: 60 },
  { name: 'Tannin', wineAValue: 'Firm', wineBValue: 'Soft', wineAScore: 70, wineBScore: 40 },
]

describe('mapWineComparisonFromDto richer comparison fields', () => {
  it('maps every new top-level field and the attribute key', () => {
    const result = mapWineComparisonFromDto({
      cached: false,
      ...richContent,
      attributeComparison: { attributes: [{ ...legacyAttributes[0]!, key: 'body' }, { ...legacyAttributes[1]!, key: 'fruitIntensity' }] },
    } as unknown as Parameters<typeof mapWineComparisonFromDto>[0])

    expect(result.tastingNotes).toEqual(richContent.tastingNotes)
    expect(result.chooseIf).toEqual(richContent.chooseIf)
    expect(result.pairings).toEqual(richContent.pairings)
    expect(result.serving).toEqual(richContent.serving)
    expect(result.aging).toEqual(richContent.aging)
    expect(result.value).toBe('Wine B costs less for a similar rating.')
    expect(result.attributeComparison?.attributes.map((a) => a.key)).toEqual(['body', 'fruitIntensity'])
  })

  it('falls back to comparisonContent when the top-level fields are absent', () => {
    const result = mapWineComparisonFromDto({
      cached: true,
      comparisonContent: { summary: 'Nested', ...richContent },
    } as unknown as Parameters<typeof mapWineComparisonFromDto>[0])

    expect(result.tastingNotes).toEqual(richContent.tastingNotes)
    expect(result.chooseIf).toEqual(richContent.chooseIf)
    expect(result.pairings).toEqual(richContent.pairings)
    expect(result.serving).toEqual(richContent.serving)
    expect(result.aging).toEqual(richContent.aging)
    expect(result.value).toBe(richContent.value)
  })

  it('leaves legacy content without the new fields and keeps its attributes unchanged', () => {
    const result = mapWineComparisonFromDto({
      cached: true,
      summary: 'Legacy summary',
      recommendation: 'Legacy verdict',
      attributeComparison: { attributes: legacyAttributes },
    })

    expect(result.tastingNotes).toBeUndefined()
    expect(result.chooseIf).toBeUndefined()
    expect(result.pairings).toBeUndefined()
    expect(result.serving).toBeUndefined()
    expect(result.aging).toBeUndefined()
    expect(result.value).toBeUndefined()
    expect(result.attributeComparison).toEqual({ attributes: legacyAttributes })
    expect(result.attributeComparison?.attributes[0]).not.toHaveProperty('key')
    expect(result).toMatchObject({ summary: 'Legacy summary', recommendation: 'Legacy verdict', fromCache: true })
  })

  it('passes non-object attribute rows through instead of throwing, as before', () => {
    const attributes = [null, 'Body', legacyAttributes[0]] as unknown as typeof legacyAttributes

    const result = mapWineComparisonFromDto({ cached: false, summary: 'S', attributeComparison: { attributes } })

    expect(result.attributeComparison?.attributes).toEqual([null, 'Body', legacyAttributes[0]])
  })

  it('drops malformed pieces and accepts only A or B as a pick', () => {
    const result = mapWineComparisonFromDto({
      cached: false,
      tastingNotes: { wineA: 'not an object', wineB: { identity: '  ', nose: 'Cassis', palate: 7 } },
      chooseIf: [
        { pick: 'C', situation: 'Never', why: 'Invalid pick' },
        { pick: 'b', situation: '  Lunch  ', why: '' },
        { pick: 'A', situation: '', why: 'No situation' },
        null,
        'text',
      ],
      pairings: { wineA: 'nope', wineB: [{ dish: '' }, { dish: 'Trout', why: 3 }, 5], shared: { why: 'No dish' } },
      serving: { wineA: { temperature: 16 }, wineB: { decanting: '1 hour' } },
      aging: { wineA: 2030, wineB: 'Hold until 2027' },
      value: '   ',
      attributeComparison: { attributes: [{ ...legacyAttributes[0]!, key: 'colour' }] },
    } as unknown as Parameters<typeof mapWineComparisonFromDto>[0])

    expect(result.tastingNotes).toEqual({ wineA: null, wineB: { nose: 'Cassis' } })
    expect(result.chooseIf).toEqual([{ pick: 'B', situation: 'Lunch' }])
    expect(result.pairings).toEqual({ wineA: [], wineB: [{ dish: 'Trout' }], shared: null })
    expect(result.serving).toEqual({ wineA: null, wineB: { decanting: '1 hour' } })
    expect(result.aging).toEqual({ wineA: null, wineB: 'Hold until 2027' })
    expect(result.value).toBeUndefined()
    expect(result.attributeComparison?.attributes[0]).not.toHaveProperty('key')

    const noRows = { attributes: null }
    expect(mapWineComparisonFromDto({
      cached: false, attributeComparison: noRows,
    } as unknown as Parameters<typeof mapWineComparisonFromDto>[0]).attributeComparison).toBe(noRows)
  })

  it('treats fully empty or wrongly typed new fields as absent', () => {
    const result = mapWineComparisonFromDto({
      cached: false,
      tastingNotes: { wineA: {}, wineB: null },
      chooseIf: 'none',
      pairings: { wineA: [], wineB: [], shared: null },
      serving: [],
      aging: { wineA: '', wineB: null },
      value: null,
    } as unknown as Parameters<typeof mapWineComparisonFromDto>[0])

    expect(result.tastingNotes).toBeUndefined()
    expect(result.chooseIf).toBeUndefined()
    expect(result.pairings).toBeUndefined()
    expect(result.serving).toBeUndefined()
    expect(result.aging).toBeUndefined()
    expect(result.value).toBeUndefined()
  })
})
