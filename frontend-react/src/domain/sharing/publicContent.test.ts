import { expect, it } from 'vitest'
import { isPublicEvent, isPublicRoute } from './publicContent'

it('treats every event out of draft as public', () => {
  expect(isPublicEvent({ status: 'DRAFT' })).toBe(false)
  expect(isPublicEvent({ status: 'draft' })).toBe(false)
  for (const status of ['PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED']) expect(isPublicEvent({ status })).toBe(true)
})

it('trusts the API when it says whether the event was ever public', () => {
  expect(isPublicEvent({ status: 'CANCELLED', publiclyVisible: false })).toBe(false)
  expect(isPublicEvent({ status: 'CANCELLED', publiclyVisible: true })).toBe(true)
  expect(isPublicEvent({ status: 'PUBLISHED', publiclyVisible: true })).toBe(true)
})

it('treats only published routes as public', () => {
  expect(isPublicRoute({ isPublished: true })).toBe(true)
  expect(isPublicRoute({ isPublished: false })).toBe(false)
})
