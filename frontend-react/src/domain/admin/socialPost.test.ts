import { describe, expect, it } from 'vitest'
import {
  LEGAL_LINES,
  PLANNER_TIME_ZONE,
  SOCIAL_LANGUAGES,
  SOCIAL_POST_STATUSES,
  SOCIAL_NETWORKS,
  allowedActions,
  canRequestIllustration,
  canRetryPublication,
  canToggleAutoApprove,
  captionHasLegalLine,
  contentLanguageFor,
  copyDraftErrors,
  copyFromDraft,
  draftFromCopy,
  emptyCopyDraft,
  instantFromPlannerTime,
  isMediaPending,
  localizedName,
  parseHashtags,
  performanceFactorLabel,
  plannerDateTime,
  queueCopy,
  reportedMetrics,
  slideFileName,
  wineDayYears,
  wineDaysOfCurrentAndNextMonth,
  type SocialPostCopy,
  type SocialPostCopyEdit,
  type SocialPostMedia,
  type WineDay,
} from './socialPost'

const editable: SocialPostCopyEdit = {
  hook: '¿Sabías que el Malbec es francés?',
  slides: [
    { title: 'Origen', body: 'Nació en Cahors.' },
    { title: 'Llegada', body: 'Llegó en 1853.' },
    { title: 'Hoy', body: 'Mendoza lo adoptó.' },
  ],
  caption: `Tres datos sobre el Malbec. ${LEGAL_LINES.es}`,
  hashtags: ['#vinnot', '#malbec', '#vino', '#mendoza', '#datocurioso'],
  altText: 'Carrusel con tres datos sobre el Malbec.',
  cta: '¿Cuál te sorprendió más?',
}
const copy: SocialPostCopy = { ...editable, illustration: 'a bunch of Malbec grapes on an oak barrel' }
const english: SocialPostCopy = {
  ...copy,
  hook: 'Three facts about Malbec',
  caption: `Three facts about Malbec. ${LEGAL_LINES.en}`,
  cta: 'Which one surprised you?',
}

function wineDay(code: string, date: string): WineDay {
  return { code, nameEs: `Día ${code}`, nameEn: `${code} Day`, kind: 'GRAPE', priority: 1, countryCode: null, date }
}

describe('social post statuses', () => {
  it('lists the seven statuses in lifecycle order', () => {
    expect(SOCIAL_POST_STATUSES).toEqual([
      'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'FAILED',
    ])
  })
})

describe('copy draft round trip', () => {
  it('turns a copy into an editable draft and back, keeping the legal line once and never the illustration subject', () => {
    const draft = draftFromCopy(copy)
    expect(draft.hashtags).toBe('#vinnot #malbec #vino #mendoza #datocurioso')
    expect(copyFromDraft(draft, 'es')).toEqual(editable)
    expect(copyFromDraft(draft, 'es')).not.toHaveProperty('illustration')
  })

  it('starts an empty draft with three blank slides', () => {
    const draft = emptyCopyDraft()
    expect(draft.slides).toHaveLength(3)
    expect(draft.hook).toBe('')
  })

  it('trims fields, prefixes hashtags and appends the legal line when it is missing', () => {
    const draft = { ...draftFromCopy(copy), caption: '  Sin la línea legal  ', hashtags: ' vinnot, #Malbec  vino ' }
    const result = copyFromDraft(draft, 'es')
    expect(result.caption).toBe(`Sin la línea legal\n\n${LEGAL_LINES.es}`)
    expect(result.hashtags).toEqual(['#vinnot', '#Malbec', '#vino'])
  })

  it('parses hashtags separated by spaces, commas or line breaks and drops empties', () => {
    expect(parseHashtags('#a, b\n\n#c  ,')).toEqual(['#a', '#b', '#c'])
    expect(parseHashtags('')).toEqual([])
  })

  it('detects the legal line in a caption', () => {
    expect(captionHasLegalLine(copy.caption, 'es')).toBe(true)
    expect(captionHasLegalLine('Sin línea', 'es')).toBe(false)
  })

  it('keeps one legal line per language: the English caption needs the English line', () => {
    expect(LEGAL_LINES).toEqual({
      es: 'Beber con moderación. Prohibida su venta a menores de 18 años.',
      en: 'Drink responsibly. Not for sale to anyone under 18.',
    })
    expect(captionHasLegalLine(english.caption, 'en')).toBe(true)
    expect(captionHasLegalLine(copy.caption, 'en')).toBe(false)
    expect(captionHasLegalLine(english.caption, 'es')).toBe(false)

    const draft = { ...draftFromCopy(english), caption: 'Three facts.' }
    expect(copyFromDraft(draft, 'en').caption).toBe(`Three facts.\n\n${LEGAL_LINES.en}`)
    expect(copyFromDraft(draftFromCopy(english), 'en').caption).toBe(english.caption)
  })
})

describe('copy draft validation', () => {
  it('accepts a complete copy', () => {
    expect(copyDraftErrors(draftFromCopy(copy), 'es')).toEqual([])
    expect(copyDraftErrors(draftFromCopy(english), 'en')).toEqual([])
  })

  it('reports the required fields', () => {
    const draft = { ...emptyCopyDraft(), slides: [{ title: '', body: '' }, { title: '', body: '' }] }
    expect(copyDraftErrors(draft, 'es')).toEqual([
      'HOOK_REQUIRED', 'SLIDES_COUNT', 'SLIDE_INCOMPLETE', 'CAPTION_REQUIRED', 'HASHTAGS_COUNT', 'HASHTAGS_VINNOT', 'CTA_REQUIRED',
    ])
  })

  it('reports every S4 length limit', () => {
    const draft = draftFromCopy({
      ...copy,
      hook: 'x'.repeat(61),
      slides: [
        { title: 'y'.repeat(41), body: 'z'.repeat(161) },
        { title: 'a', body: 'b' },
        { title: 'a', body: 'b' },
      ],
      caption: 'c'.repeat(601),
      altText: 'd'.repeat(201),
      hashtags: Array.from({ length: 11 }, (_, index) => `#tag${index}`),
    })
    expect(copyDraftErrors(draft, 'es')).toEqual([
      'HOOK_TOO_LONG', 'SLIDE_TITLE_TOO_LONG', 'SLIDE_BODY_TOO_LONG', 'CAPTION_TOO_LONG', 'HASHTAGS_COUNT', 'HASHTAGS_VINNOT', 'ALT_TEXT_TOO_LONG',
    ])
  })

  it.each(SOCIAL_LANGUAGES)('counts the %s legal line the domain appends inside the caption limit', (language) => {
    const room = 600 - LEGAL_LINES[language].length - 2
    const fits = { ...draftFromCopy(copy), caption: 'c'.repeat(room) }
    const overflow = { ...draftFromCopy(copy), caption: 'c'.repeat(room + 1) }
    expect(copyDraftErrors(fits, language)).toEqual([])
    expect(copyDraftErrors(overflow, language)).toEqual(['CAPTION_TOO_LONG'])
  })

  it('rejects more than seven slides', () => {
    const draft = { ...draftFromCopy(copy), slides: Array.from({ length: 8 }, () => ({ title: 'a', body: 'b' })) }
    expect(copyDraftErrors(draft, 'es')).toEqual(['SLIDES_COUNT'])
  })
})

describe('wine day window', () => {
  it('keeps the days of the current and next month sorted by date', () => {
    const days = [
      wineDay('NEXT', '2026-12-04'),
      wineDay('PAST', '2026-10-31'),
      wineDay('LATE', '2026-11-24'),
      wineDay('EARLY', '2026-11-07'),
      wineDay('FAR', '2027-01-02'),
    ]
    expect(wineDaysOfCurrentAndNextMonth(days, new Date(2026, 10, 15)).map((day) => day.code))
      .toEqual(['EARLY', 'LATE', 'NEXT'])
  })

  it('crosses the year boundary in December', () => {
    const days = [wineDay('DEC', '2026-12-16'), wineDay('JAN', '2027-01-27'), wineDay('FEB', '2027-02-01')]
    expect(wineDaysOfCurrentAndNextMonth(days, new Date(2026, 11, 1)).map((day) => day.code)).toEqual(['DEC', 'JAN'])
    expect(wineDayYears(new Date(2026, 11, 1))).toEqual([2026, 2027])
    expect(wineDayYears(new Date(2026, 5, 1))).toEqual([2026])
  })
})

describe('allowed actions', () => {
  it.each([
    ['PENDING_APPROVAL', copy, ['approve', 'reject', 'edit', 'regenerate']],
    ['PENDING_APPROVAL', null, ['approve', 'reject', 'regenerate']],
    ['APPROVED', copy, ['reject', 'edit', 'regenerate']],
    ['APPROVED', null, ['reject', 'regenerate']],
    ['REJECTED', copy, ['regenerate']],
    ['DRAFT', null, []],
    ['SCHEDULED', copy, []],
    ['PUBLISHED', copy, []],
    ['FAILED', copy, []],
  ] as const)('%s with copy %j allows %j', (status, postCopy, expected) => {
    expect(allowedActions({ status, copies: { es: postCopy, en: postCopy } }, 'es')).toEqual(expected)
  })

  it('edits only the language that has copy; the pending one is filled by regenerating', () => {
    const post = { status: 'PENDING_APPROVAL' as const, copies: { es: copy, en: null } }
    expect(allowedActions(post, 'es')).toEqual(['approve', 'reject', 'edit', 'regenerate'])
    expect(allowedActions(post, 'en')).toEqual(['approve', 'reject', 'regenerate'])
  })
})

describe('content languages', () => {
  it('maps the UI locale to the content language: Spanish for es locales, English otherwise', () => {
    expect(SOCIAL_LANGUAGES).toEqual(['es', 'en'])
    expect(contentLanguageFor('es-AR')).toBe('es')
    expect(contentLanguageFor('ES')).toBe('es')
    expect(contentLanguageFor('en-US')).toBe('en')
    expect(contentLanguageFor('pt-BR')).toBe('en')
  })

  it('shows the queue the copy of the UI language when present, else the other one', () => {
    expect(queueCopy({ copies: { es: copy, en: english } }, 'es-AR')).toBe(copy)
    expect(queueCopy({ copies: { es: copy, en: english } }, 'en-US')).toBe(english)
    expect(queueCopy({ copies: { es: copy, en: null } }, 'en-US')).toBe(copy)
    expect(queueCopy({ copies: { es: null, en: english } }, 'es-AR')).toBe(english)
    expect(queueCopy({ copies: { es: null, en: null } }, 'es-AR')).toBeNull()
  })
})

describe('localized names', () => {
  it('picks the Spanish name for es locales and the English one otherwise', () => {
    const day = wineDay('MALBEC', '2026-04-17')
    expect(localizedName(day, 'es-AR')).toBe('Día MALBEC')
    expect(localizedName(day, 'es')).toBe('Día MALBEC')
    expect(localizedName(day, 'en-US')).toBe('MALBEC Day')
  })
})

describe('rendered media', () => {
  const ready: SocialPostMedia = {
    status: 'READY', source: 'AI', illustrationReason: null, heroUrl: 'https://images.vinnot.com/hero.png',
    slides: { es: { INSTAGRAM: ['ig-1.jpg'], TIKTOK: ['tt-1.jpg'], renderedFor: 'hash' }, en: null }, updatedAt: '2026-11-02T12:00:00Z',
  }

  it('is pending only while the backend renders it', () => {
    expect(isMediaPending({ media: { ...ready, status: 'PENDING' } })).toBe(true)
    expect(isMediaPending({ media: ready })).toBe(false)
    expect(isMediaPending({ media: { ...ready, status: 'FAILED', error: 'TEXT_DOES_NOT_FIT' } })).toBe(false)
    expect(isMediaPending({ media: null })).toBe(false)
    expect(isMediaPending(undefined)).toBe(false)
  })

  it.each([
    ['PENDING_APPROVAL', true, true],
    ['APPROVED', true, true],
    ['REJECTED', true, true],
    ['DRAFT', true, true],
    ['PUBLISHED', true, false],
    ['SCHEDULED', true, false],
    ['FAILED', true, true],
    ['PENDING_APPROVAL', false, false],
  ] as const)('a new illustration for %s (with copy: %s) is allowed: %s', (status, hasCopy, expected) => {
    expect(canRequestIllustration({ status, copies: { es: hasCopy ? copy : null, en: null } })).toBe(expected)
  })

  it('accepts a new illustration when only the English copy exists', () => {
    expect(canRequestIllustration({ status: 'PENDING_APPROVAL', copies: { es: null, en: english } })).toBe(true)
  })

  it('names each downloaded slide after the post, the language, the format and its position', () => {
    expect(slideFileName('3f2a9c1e-0000-4000-8000-000000000001', 'es', 'INSTAGRAM', 1)).toBe('vinnot-3f2a9c1e-es-instagram-01.jpg')
    expect(slideFileName('p1', 'en', 'TIKTOK', 12)).toBe('vinnot-p1-en-tiktok-12.jpg')
  })
})

describe('publications, metrics and pillar settings (#510)', () => {
  it('lists the four networks in the order the admin shows them', () => {
    expect(SOCIAL_NETWORKS).toEqual(['INSTAGRAM', 'FACEBOOK', 'THREADS', 'TIKTOK'])
  })

  it.each([
    ['QUEUED', false],
    ['PUBLISHING', false],
    ['PUBLISHED', false],
    ['DRAFT_SENT', false],
    ['FAILED', true],
  ] as const)('a %s publication can be retried: %s', (status, expected) => {
    expect(canRetryPublication({ status })).toBe(expected)
  })

  it('keeps only the figures the network reported, in a fixed order', () => {
    expect(reportedMetrics({ views: 1200, reach: null, likes: 0, comments: 4, saves: null, shares: 2, follows: null })).toEqual([
      { metric: 'views', value: 1200 },
      { metric: 'likes', value: 0 },
      { metric: 'comments', value: 4 },
      { metric: 'shares', value: 2 },
    ])
    expect(reportedMetrics(null)).toEqual([])
  })

  it('shows the performance factor as a multiplier with two decimals', () => {
    expect(performanceFactorLabel(1.25)).toBe('×1.25')
    expect(performanceFactorLabel(1)).toBe('×1.00')
    expect(performanceFactorLabel(0.5)).toBe('×0.50')
  })

  it('lets auto-approval change only while the pillar is active', () => {
    expect(canToggleAutoApprove({ active: true })).toBe(true)
    expect(canToggleAutoApprove({ active: false })).toBe(false)
  })
})

describe('planner time (#513)', () => {
  it('plans in Argentina time', () => {
    expect(PLANNER_TIME_ZONE).toBe('America/Argentina/Buenos_Aires')
  })

  it('reads an instant as the date and time of the planner zone, whatever the browser zone', () => {
    expect(plannerDateTime('2026-11-10T12:30:00Z')).toEqual({ date: '2026-11-10', time: '09:30' })
    expect(plannerDateTime('2026-11-11T02:15:00Z')).toEqual({ date: '2026-11-10', time: '23:15' })
    expect(plannerDateTime('2026-11-10T03:00:00Z')).toEqual({ date: '2026-11-10', time: '00:00' })
  })

  it('turns a date and time of the planner zone into the instant the backend expects', () => {
    expect(instantFromPlannerTime('2026-11-10', '09:30')).toBe('2026-11-10T12:30:00.000Z')
    expect(instantFromPlannerTime('2026-11-10', '23:15')).toBe('2026-11-11T02:15:00.000Z')
    expect(instantFromPlannerTime('2026-12-31', '22:00')).toBe('2027-01-01T01:00:00.000Z')
  })

  it('round-trips the instant it builds', () => {
    const { date, time } = plannerDateTime('2026-11-07T22:30:00Z')
    expect(instantFromPlannerTime(date, time)).toBe('2026-11-07T22:30:00.000Z')
  })

  it.each([
    ['', '09:30'], ['2026-11-10', ''], ['2026-02-30', '09:30'], ['2026-11-10', '24:00'], ['2026-11-10', '09:60'], ['10/11/2026', '09:30'],
  ])('rejects an incomplete or impossible date %s and time %s', (date, time) => {
    expect(instantFromPlannerTime(date, time)).toBeNull()
  })
})
