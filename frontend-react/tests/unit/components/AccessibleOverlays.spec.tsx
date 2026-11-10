/**
 * Overlays converted to the shared accessible Modal: dialog semantics,
 * Escape closes, focus returns to the control that opened them.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import type { Wine, WineSummary } from '@domain/wine/wine.types'
import type { CellarWine } from '@domain/cellar/cellar.types'
import { AdminWineAiConfirmDialog } from '@pages/admin/AdminWineAiConfirmDialog'
import { AdminWineAiRegenerateModal } from '@pages/admin/AdminWineAiProfileSections'
import { WineCellarModal } from '@pages/wines/WineCellarModal'
import { WineCompareSearchModal } from '@pages/wines/WineCompareSearchModal'
import { CellarEditModal } from '@components/features/cellar/CellarEditModal'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { AdminUsersPage } from '@pages/admin/AdminUsersPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }),
}))
const mutate = vi.hoisted(() => vi.fn())
vi.mock('@hooks/queries/cellar/useUpdateCellarEntry', () => ({
  useUpdateCellarEntry: () => ({ mutate, isPending: false }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }) }))
vi.mock('@pages/admin/useAdminUsersViewModel', async () => {
  const { useState: useHookState } = await import('react')
  const user = { id: 'u1', username: 'maria', email: 'maria@example.test', enabled: true, locked: false }
  return {
    useAdminUsersViewModel: () => {
      const [confirmAction, setConfirmAction] = useHookState<{ type: string; user: typeof user } | null>(null)
      return {
        t: (key: string) => key, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
        isLoading: false, isError: false, refetch: vi.fn(), users: [user], totalItems: 1, totalPages: 1,
        confirmAction, actionReason: '', setActionReason: vi.fn(), working: false, handleSearch: vi.fn(),
        resolveUserRole: () => 'ROLE_USER', handleRoleChange: vi.fn(),
        openConfirmAction: (type: string, target: typeof user) => setConfirmAction({ type, user: target }),
        clearConfirmAction: () => setConfirmAction(null), confirmAndAct: vi.fn(),
      }
    },
  }
})
vi.mock('@components/features/admin/AdminBackLink', () => ({ AdminBackLink: () => null }))
vi.mock('@components/features/admin/AdminPageHeader', () => ({ AdminPageHeader: () => null }))

const t = ((key: string) => key) as unknown as TFunction
afterEach(() => { cleanup(); mutate.mockReset() })

function Harness({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>open overlay</button>
      {open && children(() => setOpen(false))}
    </>
  )
}

async function expectAccessibleDialog(name: string, trigger = screen.getByRole('button', { name: 'open overlay' })) {
  const user = userEvent.setup()
  trigger.focus()
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog.contains(document.activeElement)).toBe(true)
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(trigger).toHaveFocus()
}

const wine = { id: 'w1', name: 'Malbec Reserva' } as Wine
const entry = {
  id: 'c1', rating: 3, notes: 'Para el asado', purchasePrice: 15000, addedAt: new Date(),
  wine: { id: 'w1', name: 'Malbec Reserva', winery: 'Bodega Sur', grapeVarieties: [] },
} as unknown as CellarWine

describe('accessible overlays', () => {
  it('AI generation confirmation', async () => {
    render(<Harness>{close => <AdminWineAiConfirmDialog t={t} open onCancel={close} onConfirm={vi.fn()} />}</Harness>)
    await expectAccessibleDialog('admin.wines.generateAiTitle')
  })

  it('AI regeneration confirmation', async () => {
    render(<Harness>{close => <AdminWineAiRegenerateModal t={t} onCancel={close} onConfirm={vi.fn()} />}</Harness>)
    await expectAccessibleDialog('admin.aiProfile.regenerate')
  })

  it('add-to-cellar form', async () => {
    render(<Harness>{close => (
      <WineCellarModal t={t} wine={wine} cellarForm={{ rating: null, purchasePrice: null, notes: '' }}
        setCellarForm={vi.fn()} addingToCellar={false} onClose={close} onConfirm={vi.fn()} />
    )}</Harness>)
    await expectAccessibleDialog('wineDetails.addToCellar')
  })

  it('compare search', async () => {
    render(<Harness>{close => (
      <WineCompareSearchModal open t={t} searchInputRef={{ current: null }} searchListRef={{ current: null }}
        searchQuery="" onSearchChange={vi.fn()} onSearchScroll={vi.fn()} searchingFirstPage={false}
        searching={false} searchPage={0} searchResults={[]} onSelectWine={vi.fn()} onClose={close} />
    )}</Harness>)
    await expectAccessibleDialog('compare.searchWine')
  })

  it('cellar entry editor', async () => {
    render(<Harness>{close => <CellarEditModal entry={entry} onClose={close} />}</Harness>)
    await expectAccessibleDialog('Malbec Reserva')
  })

  it('admin form shell', async () => {
    render(<Harness>{close => (
      <AdminFormDialog open onClose={close} labelledBy="form-title" widthClassName="max-w-2xl">
        <h2 id="form-title">Editar bodega</h2><input aria-label="Nombre" />
      </AdminFormDialog>
    )}</Harness>)
    await expectAccessibleDialog('Editar bodega')
  })

  it('admin user action confirmation', async () => {
    render(<AdminUsersPage />)
    await expectAccessibleDialog('admin.users.confirmBanTitle', screen.getByTitle('admin.users.ban'))
  })
})

describe('previous behaviour of converted overlays', () => {
  it('cellar editor still saves the edited values and ignores an outside click', async () => {
    const onClose = vi.fn()
    render(<CellarEditModal entry={entry} onClose={onClose} />)
    fireEvent.change(screen.getByDisplayValue('Para el asado'), { target: { value: 'Con amigos' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
    expect(mutate).toHaveBeenCalledWith(
      { cellarWineId: 'c1', updates: { rating: 3, purchasePrice: 15000, notes: 'Con amigos' } },
      expect.any(Object),
    )
    fireEvent.click(screen.getByRole('dialog').firstElementChild as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('compare search still selects a wine', () => {
    const onSelectWine = vi.fn()
    const result = { id: 'w2', name: 'Cabernet', winery: 'Bodega Norte', type: 'RED' } as unknown as WineSummary
    render(
      <WineCompareSearchModal open t={t} searchInputRef={{ current: null }} searchListRef={{ current: null }}
        searchQuery="cab" onSearchChange={vi.fn()} onSearchScroll={vi.fn()} searchingFirstPage={false}
        searching={false} searchPage={0} searchResults={[result]} onSelectWine={onSelectWine} onClose={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Cabernet/ }))
    expect(onSelectWine).toHaveBeenCalledWith(result)
  })

  it('admin forms ignore an outside click so unsaved edits survive', () => {
    const onClose = vi.fn()
    render(<AdminFormDialog open onClose={onClose} labelledBy="t"><h2 id="t">Form</h2></AdminFormDialog>)
    fireEvent.click(screen.getByRole('dialog').firstElementChild as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()
  })
})
