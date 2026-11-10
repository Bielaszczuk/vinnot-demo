import { describe, expect, it } from 'vitest'
import {
  MAX_ORGANIZER_NOTE_LENGTH,
  MAX_SUBMISSION_REASON_LENGTH,
  REGISTRATION_REVIEW_REASONS,
  SUBMISSION_DECISION_REASONS,
  presetReasonText,
  registrationReviewReasons,
} from './moderationReasons'

describe('wine submission decision reasons', () => {
  it('offers its own one-tap presets for every decision, always ending with Other', () => {
    expect(SUBMISSION_DECISION_REASONS).toEqual({
      APPROVE_NEW: ['VERIFIED_LABEL', 'NEW_TO_CATALOG', 'OTHER'],
      MERGE_EXISTING: ['ALREADY_IN_CATALOG', 'SAME_WINE_OTHER_NAME', 'OTHER'],
      REQUEST_CORRECTIONS: ['LABEL_UNREADABLE', 'MISSING_DETAILS', 'WRONG_DETAILS', 'OTHER'],
      REJECT: ['NOT_A_WINE', 'DUPLICATE_SUBMISSION', 'INAPPROPRIATE', 'OTHER'],
    })
  })

  it('keeps the backend reason limit of 500 characters', () => {
    expect(MAX_SUBMISSION_REASON_LENGTH).toBe(500)
  })
})

describe('event registration review reasons', () => {
  it('offers presets for rejecting and waitlisting, starting with no reason, and none for approving', () => {
    expect(REGISTRATION_REVIEW_REASONS).toEqual({
      REJECT: ['NONE', 'EVENT_FULL', 'REQUIREMENTS_NOT_MET', 'DUPLICATE_REGISTRATION', 'OTHER'],
      WAITLIST: ['NONE', 'EVENT_FULL', 'CONFIRMING_AVAILABILITY', 'OTHER'],
    })
    expect(registrationReviewReasons('REJECT')).toBe(REGISTRATION_REVIEW_REASONS.REJECT)
    expect(registrationReviewReasons('WAITLIST')).toBe(REGISTRATION_REVIEW_REASONS.WAITLIST)
    expect(registrationReviewReasons('APPROVE')).toBeNull()
  })

  it('keeps the backend organizer note limit of 1000 characters', () => {
    expect(MAX_ORGANIZER_NOTE_LENGTH).toBe(1000)
  })
})

describe('presetReasonText', () => {
  it('sends the preset label for a preset reason and ignores a note typed earlier', () => {
    expect(presetReasonText('NOT_A_WINE', ' The photo is not of a wine ', 'Private draft', 500)).toBe('The photo is not of a wine')
  })

  it('sends the trimmed note for Other', () => {
    expect(presetReasonText('OTHER', 'Other', '  Label is from another winery  ', 500)).toBe('Label is from another winery')
  })

  it('returns an empty text for No reason, whatever was typed before', () => {
    expect(presetReasonText('NONE', 'No reason', 'Draft', 1000)).toBe('')
  })

  it('returns an empty text for Other without a note', () => {
    expect(presetReasonText('OTHER', 'Other', '   ', 500)).toBe('')
  })

  it('caps the text at the backend limit', () => {
    expect(presetReasonText('OTHER', 'Other', 'x'.repeat(600), 500)).toHaveLength(500)
  })
})
