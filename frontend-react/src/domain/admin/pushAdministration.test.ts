import { describe, expect, it } from 'vitest'
import { PUSH_OUTCOMES, completeCounts, sendsPushes } from './pushAdministration'

describe('push administration', () => {
  it('fills every outcome, zero when missing', () => {
    const counts = completeCounts({ SENT: 4, FAILED: 1 })
    expect(Object.keys(counts)).toEqual([...PUSH_OUTCOMES])
    expect(counts.SENT).toBe(4)
    expect(counts.EXPIRED).toBe(0)
  })

  it('counts the engagement outcomes too', () => {
    expect(PUSH_OUTCOMES).toEqual(expect.arrayContaining(['DROPPED_ENGAGEMENT_BUDGET', 'DROPPED_FATIGUE', 'DROPPED_HOLDOUT']))
    expect(completeCounts({ DROPPED_HOLDOUT: 2 }).DROPPED_HOLDOUT).toBe(2)
  })

  it('only the expo provider sends pushes', () => {
    expect(sendsPushes('expo')).toBe(true)
    expect(sendsPushes('log')).toBe(false)
  })
})
