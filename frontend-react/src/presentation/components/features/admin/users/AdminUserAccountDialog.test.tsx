import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import type { AdminUser } from '@domain/admin/admin.types'
import { AdminUserAccountDialog } from './AdminUserAccountDialog'

afterEach(cleanup)

const user = { id: 'user-1', username: 'ana', firstName: 'Ana', lastName: 'Pérez' } as AdminUser

async function mount(props: Partial<Parameters<typeof AdminUserAccountDialog>[0]> = {}, lng = 'en-US') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({
    lng,
    resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } },
    interpolation: { escapeValue: false },
  })
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <AdminUserAccountDialog user={user} saving={false} error={null} onSave={onSave} onClose={onClose} {...props} />
    </I18nextProvider>,
  )
  return { onSave, onClose, dialog: screen.getByRole('dialog', { name: lng === 'en-US' ? 'Account details' : 'Datos de la cuenta' }) }
}

it('starts from the stored names in labelled fields, with saving disabled until something changes', async () => {
  const { dialog, onSave } = await mount()
  expect(within(dialog).getByText('ana')).toBeInTheDocument()
  expect(within(dialog).getByLabelText('First name')).toHaveValue('Ana')
  expect(within(dialog).getByLabelText('Last name')).toHaveValue('Pérez')
  const save = within(dialog).getByRole('button', { name: 'Save details' })
  expect(save).toBeDisabled()
  fireEvent.change(within(dialog).getByLabelText('First name'), { target: { value: ' Ana ' } })
  expect(save).toBeDisabled()
  fireEvent.click(save)
  expect(onSave).not.toHaveBeenCalled()
})

it('sends both trimmed names together once one of them changes', async () => {
  const { dialog, onSave } = await mount()
  fireEvent.change(within(dialog).getByLabelText('First name'), { target: { value: ' Ana María ' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save details' }))
  expect(onSave).toHaveBeenCalledWith({ firstName: 'Ana María', lastName: 'Pérez' })
})

it('shows an inline error past 100 characters and does not send', async () => {
  const { dialog, onSave } = await mount()
  const lastName = within(dialog).getByLabelText('Last name')
  fireEvent.change(lastName, { target: { value: 'b'.repeat(101) } })
  expect(lastName).toHaveAttribute('aria-invalid', 'true')
  expect(lastName).toHaveAccessibleDescription('Use up to 100 characters.')
  expect(within(dialog).getByLabelText('First name')).toHaveAttribute('aria-invalid', 'false')
  fireEvent.submit(within(dialog).getByRole('button', { name: 'Save details' }).closest('form') as HTMLFormElement)
  expect(onSave).not.toHaveBeenCalled()
})

it('locks the form while saving and shows the failure inside the dialog', async () => {
  const { dialog, onClose, onSave } = await mount({ saving: true, error: "We couldn't save the details. Please try again." })
  expect(within(dialog).getByRole('alert')).toHaveTextContent("We couldn't save the details. Please try again.")
  expect(within(dialog).getByLabelText('First name')).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: /Save details/ })).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: /Save details/ })).toHaveAttribute('aria-busy', 'true')
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  fireEvent.submit(within(dialog).getByRole('button', { name: /Save details/ }).closest('form') as HTMLFormElement)
  expect(onClose).not.toHaveBeenCalled()
  expect(onSave).not.toHaveBeenCalled()
})

it('closes from Cancel when idle', async () => {
  const { dialog, onClose } = await mount()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
})

it('speaks to the administrator with usted in Spanish', async () => {
  const { dialog } = await mount({ error: null }, 'es-AR')
  fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'a'.repeat(101) } })
  expect(within(dialog).getByText('Use hasta 100 caracteres.')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Guardar datos' })).toBeInTheDocument()
})

it('shows the account photo next to the username, falling back to the initial', async () => {
  const { dialog } = await mount({ user: { ...user, avatarUrl: 'https://api.vinnot.com/api/uploads/avatars/ana.webp' } })
  const avatar = within(dialog).getByTestId('admin-user-avatar-user-1')
  const photo = avatar.querySelector('img')
  expect(photo).toHaveAttribute('src', 'https://api.vinnot.com/api/uploads/avatars/ana.webp')
  fireEvent.error(photo!)
  expect(avatar).toHaveTextContent('A')
})
