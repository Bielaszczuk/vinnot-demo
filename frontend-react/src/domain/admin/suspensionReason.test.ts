import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SUSPENSION_REASON,
  MAX_SUSPENSION_NOTE_LENGTH,
  SUSPENSION_REASONS,
  allowsSuspensionNote,
  toBanUserPayload,
} from './suspensionReason'

describe('suspension reasons', () => {
  it('offers the backend reason codes in display order with spam preselected', () => {
    expect(SUSPENSION_REASONS).toEqual(['SPAM', 'HARASSMENT', 'FRAUD', 'IMPERSONATION', 'TERMS_VIOLATION', 'OTHER'])
    expect(DEFAULT_SUSPENSION_REASON).toBe('SPAM')
    expect(MAX_SUSPENSION_NOTE_LENGTH).toBe(255)
  })

  it('only allows a free-text detail for Other', () => {
    expect(SUSPENSION_REASONS.filter(allowsSuspensionNote)).toEqual(['OTHER'])
  })
})

describe('toBanUserPayload', () => {
  it('sends only the reason code for a preset reason, dropping any typed detail', () => {
    expect(toBanUserPayload('FRAUD', 'Stolen card')).toEqual({ reasonCode: 'FRAUD' })
    expect(toBanUserPayload('SPAM')).toEqual({ reasonCode: 'SPAM' })
  })

  it('sends the trimmed detail with Other', () => {
    expect(toBanUserPayload('OTHER', '  Repeated fake events  ')).toEqual({ reasonCode: 'OTHER', reason: 'Repeated fake events' })
  })

  it('omits a blank detail with Other', () => {
    expect(toBanUserPayload('OTHER', '   ')).toEqual({ reasonCode: 'OTHER' })
    expect(toBanUserPayload('OTHER')).toEqual({ reasonCode: 'OTHER' })
  })

  it('caps the detail at the backend limit', () => {
    const payload = toBanUserPayload('OTHER', 'x'.repeat(MAX_SUSPENSION_NOTE_LENGTH + 20))
    expect(payload.reason).toHaveLength(MAX_SUSPENSION_NOTE_LENGTH)
  })
})
