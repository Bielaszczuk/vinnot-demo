import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FactCheckBadge, MockBadge, PillarChip, StatusBadge, WineDayChip } from './SocialPostChips'

const language = vi.hoisted(() => ({ current: 'es-AR' as string | undefined }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US', resolvedLanguage: language.current } }),
}))
afterEach(cleanup)

describe('social post chips', () => {
  it('names the status and localizes the pillar and wine day', () => {
    language.current = 'es-AR'
    render(<>
      <StatusBadge status="PENDING_APPROVAL" />
      <PillarChip pillar={{ nameEs: 'Dato curioso', nameEn: 'Curious fact' }} />
      <WineDayChip wineDay={{ nameEs: 'Día del Merlot', nameEn: 'Merlot Day' }} />
      <MockBadge />
    </>)
    expect(screen.getByText('admin.socialPosts.status.PENDING_APPROVAL')).toBeInTheDocument()
    expect(screen.getByText('Dato curioso')).toBeInTheDocument()
    expect(screen.getByText('Día del Merlot')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.generation.mock')).toHaveAttribute('title', 'admin.socialPosts.generation.mockHelp')
  })

  it('falls back to the i18n language and the English names', () => {
    language.current = undefined
    render(<><PillarChip pillar={{ nameEs: 'Quiz', nameEn: 'Quiz (en)' }} /><WineDayChip wineDay={{ nameEs: 'Día', nameEn: 'Day' }} /></>)
    expect(screen.getByText('Quiz (en)')).toBeInTheDocument()
    expect(screen.getByText('Day')).toBeInTheDocument()
  })

  it('shows the fact-check result and lists the issues only when flagged', () => {
    const { rerender } = render(<FactCheckBadge factCheck={null} issues={[]} />)
    expect(screen.queryByText(/factCheck/)).not.toBeInTheDocument()

    rerender(<FactCheckBadge factCheck="PASSED" issues={['ignored']} />)
    expect(screen.getByText('admin.socialPosts.generation.factCheck.PASSED')).toBeInTheDocument()
    expect(screen.queryByText('ignored')).not.toBeInTheDocument()

    rerender(<FactCheckBadge factCheck="SKIPPED" issues={[]} />)
    expect(screen.getByText('admin.socialPosts.generation.factCheck.SKIPPED')).toBeInTheDocument()

    rerender(<FactCheckBadge factCheck="FLAGGED" issues={[]} />)
    expect(screen.queryByText('admin.socialPosts.generation.issues')).not.toBeInTheDocument()

    rerender(<FactCheckBadge factCheck="FLAGGED" issues={['1853 es discutido', 'Cahors no es Burdeos']} />)
    expect(screen.getByText('admin.socialPosts.generation.factCheck.FLAGGED')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.generation.issues')).toBeInTheDocument()
    expect(screen.getByText('1853 es discutido')).toBeInTheDocument()
    expect(screen.getByText('Cahors no es Burdeos')).toBeInTheDocument()
  })
})
