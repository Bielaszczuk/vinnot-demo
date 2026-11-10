import { expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { communityErrorMessage } from './communityErrorMessage'

/** Shape of a transport failure as the API layer rejects it. */
const apiError = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code })

const t = ((key: string) => key) as unknown as TFunction

it('explains why a report or block failed and when to retry', () => {
  expect(communityErrorMessage(apiError(422, 'REPORT_LIMIT', 'Daily report limit reached'), t)).toBe('community.errors.reportLimit')
  expect(communityErrorMessage(apiError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests'), t)).toBe('community.errors.rateLimited')
  expect(communityErrorMessage(apiError(422, 'SELF_REPORT', 'own'), t)).toBe('community.errors.ownContent')
  expect(communityErrorMessage(apiError(422, 'SELF_BLOCK', 'self'), t)).toBe('community.errors.selfBlock')
  expect(communityErrorMessage(apiError(404, 'ENTITY_NOT_FOUND', 'Content not found'), t)).toBe('community.errors.notFound')
})

it('keeps the generic message for anything else', () => {
  expect(communityErrorMessage(apiError(500, 'INTERNAL', 'boom'), t)).toBe('community.error')
  expect(communityErrorMessage(new Error('offline'), t)).toBe('community.error')
  expect(communityErrorMessage(null, t)).toBe('community.error')
})
