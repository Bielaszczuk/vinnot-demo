import { describe, expect, it } from 'vitest'
import {
  MAX_ANNOUNCEMENT_BODY_LENGTH,
  MAX_ANNOUNCEMENT_TITLE_LENGTH,
  draftErrors,
  emptyAnnouncementDraft,
  versionErrors,
  writtenLanguages,
} from './announcement'

describe('announcement draft', () => {
  it('starts as news to every account by email and push, with nothing written', () => {
    const draft = emptyAnnouncementDraft()
    expect(draft.kind).toBe('NEWS')
    expect(draft.audience).toEqual({ email: true, push: true, language: null, countryId: null, regionId: null, role: null })
    expect(writtenLanguages(draft)).toEqual([])
    expect(draftErrors(draft)).toEqual(['CONTENT_REQUIRED'])
  })

  it('needs a channel and checks only the languages that were written', () => {
    const draft = emptyAnnouncementDraft()
    draft.versions.en = { title: 'Harvest', body: '' }
    draft.audience = { ...draft.audience, email: false, push: false }

    expect(writtenLanguages(draft)).toEqual(['en'])
    expect(draftErrors(draft)).toEqual(['CHANNEL_REQUIRED', 'BODY_REQUIRED'])
    draft.versions.en.body = 'Tastings all month.'
    draft.audience.push = true
    expect(draftErrors(draft)).toEqual([])
  })

  it('refuses a missing, multi-line or too long title and an empty or too long body', () => {
    expect(versionErrors({ title: ' ', body: ' ' })).toEqual(['TITLE_REQUIRED', 'BODY_REQUIRED'])
    expect(versionErrors({ title: 'a\nb', body: 'x' })).toEqual(['TITLE_TOO_LONG'])
    expect(versionErrors({ title: 'x'.repeat(MAX_ANNOUNCEMENT_TITLE_LENGTH + 1), body: 'x'.repeat(MAX_ANNOUNCEMENT_BODY_LENGTH + 1) }))
      .toEqual(['TITLE_TOO_LONG', 'BODY_TOO_LONG'])
    expect(versionErrors({ title: 'x'.repeat(MAX_ANNOUNCEMENT_TITLE_LENGTH), body: 'x'.repeat(MAX_ANNOUNCEMENT_BODY_LENGTH) })).toEqual([])
  })
})
