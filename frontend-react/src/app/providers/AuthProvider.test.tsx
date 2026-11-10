import { act, render, screen } from '@testing-library/react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { queryClient } from './queryClient'

const fixture = vi.hoisted(() => ({ state: {
  initSession: vi.fn(), isInitializing: true,
  user: null as { id: string } | null, accessToken: null as string | null,
} }))
vi.mock('@stores/auth.store', () => ({ useAuthStore: Object.assign(
  (selector: (state: typeof fixture.state) => unknown) => selector(fixture.state),
  { getState: () => fixture.state },
) }))
vi.mock('@infrastructure/http/http', () => ({ configureHttpAuth: vi.fn() }))
vi.mock('@infrastructure/http/browserSession', () => ({ subscribeSession: () => () => {} }))
vi.mock('@services/reauthentication.service', () => ({ reauthenticationService: {} }))
vi.mock('@components/auth/ReauthenticationDialog', () => ({ ReauthenticationDialog: () => null }))
afterEach(() => { queryClient.clear(); fixture.state.user = null; fixture.state.accessToken = null; fixture.state.isInitializing = true })

it('keeps the first restored session query observed until its response arrives', async () => {
  let resolve!: (value: string) => void
  const response = new Promise<string>((done) => { resolve = done })
  function Outcome() {
    const query = useQuery({ queryKey: ['receipt-test'], queryFn: () => response })
    return <p>{query.data ?? 'Waiting'}</p>
  }
  const tree = <QueryClientProvider client={queryClient}><AuthProvider><Outcome /></AuthProvider></QueryClientProvider>
  const view = render(tree)
  fixture.state.isInitializing = false
  fixture.state.user = { id: 'first' }; fixture.state.accessToken = 'fixture'
  view.rerender(tree)
  // Force a provider update with the restored state, as the auth store does.
  view.rerender(<QueryClientProvider client={queryClient}><AuthProvider><Outcome /></AuthProvider></QueryClientProvider>)
  await act(async () => { resolve('Refunded'); await response })
  expect(await screen.findByText('Refunded')).toBeInTheDocument()
})

it('purges private cache when an authenticated identity leaves or switches', () => {
  fixture.state.isInitializing = false
  fixture.state.user = { id: 'first' }; fixture.state.accessToken = 'fixture'
  const view = render(<AuthProvider><p>Account</p></AuthProvider>)
  queryClient.setQueryData(['private-ticket'], 'first-owner-data')
  fixture.state.user = { id: 'second' }
  view.rerender(<AuthProvider><p>Other account</p></AuthProvider>)
  expect(queryClient.getQueryData(['private-ticket'])).toBeUndefined()
  queryClient.setQueryData(['private-ticket'], 'second-owner-data')
  fixture.state.user = null; fixture.state.accessToken = null
  view.rerender(<AuthProvider><p>Signed out</p></AuthProvider>)
  expect(queryClient.getQueryData(['private-ticket'])).toBeUndefined()
})
