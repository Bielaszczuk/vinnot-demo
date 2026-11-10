import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { AiWineProfile } from '@domain/wine/wine.types'
import { winesService } from '@services/wines.service'
import { queryKeys } from '../queryKeys'
import { useGenerateAiProfile } from './useGenerateAiProfile'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'es-AR' } }) }))

afterEach(() => vi.restoreAllMocks())

it('shows the generated profile at once instead of the empty state, and refreshes the related caches', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const profileKey = queryKeys.wines.aiProfile('wine', 'es')
  const related = [queryKeys.wines.aiProfileStatus('wine', 'es'), queryKeys.wines.detail('wine')]
  cache.setQueryData(profileKey, null)
  for (const key of related) cache.setQueryData(key, 'cached')
  const generated = { summary: 'Fresh' } as unknown as AiWineProfile
  const generate = vi.spyOn(winesService, 'generateAiProfile').mockResolvedValue(generated)
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: cache }, children)
  const { result, unmount } = renderHook(() => useGenerateAiProfile('wine'), { wrapper })

  await act(async () => { await result.current.mutateAsync() })

  expect(generate).toHaveBeenCalledWith('wine', 'es')
  expect(cache.getQueryData(profileKey)).toBe(generated)
  for (const key of related) expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  unmount()
  cache.clear()
})
