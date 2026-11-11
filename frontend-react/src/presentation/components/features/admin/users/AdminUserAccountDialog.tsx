import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { AdminUserAvatar } from './AdminUserAvatar'
import type { AdminUser } from '@domain/admin/admin.types'
import {
  ADMIN_USER_NAME_MAX_LENGTH,
  isAdminUserUpdateEmpty,
  toAdminUserDraft,
  toAdminUserUpdate,
  validateAdminUserDraft,
  type AdminUserDraft,
  type AdminUserUpdate,
} from '@domain/admin/adminUserDraft'

interface AdminUserAccountDialogProps {
  user: AdminUser
  saving: boolean
  /** Translated failure of the last save; the dialog stays open to retry. */
  error: string | null
  onSave: (update: AdminUserUpdate) => void
  onClose: () => void
}

/**
 * First and last name of an account. Both names are sent together and only
 * when one changed; the parent remounts it per user (key) to reset the draft.
 */
export function AdminUserAccountDialog({ user, saving, error, onSave, onClose }: AdminUserAccountDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const firstNameId = useId()
  const lastNameId = useId()
  const [draft, setDraft] = useState<AdminUserDraft>(() => toAdminUserDraft(user))
  const errors = validateAdminUserDraft(draft)
  const errorFor = (field: keyof AdminUserDraft) =>
    errors.some((entry) => entry.field === field)
      ? t('admin.users.nameTooLong', { max: ADMIN_USER_NAME_MAX_LENGTH })
      : undefined
  const update = toAdminUserUpdate(user, draft)
  const unchanged = isAdminUserUpdateEmpty(update)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (saving || unchanged || errors.length > 0) return
    onSave(update)
  }

  return (
    <AdminFormDialog open onClose={() => { if (!saving) onClose() }} labelledBy={titleId} panelClassName="p-6">
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <AdminUserAvatar userId={user.id} username={user.username} avatarUrl={user.avatarUrl} />
          <div>
            <h3 id={titleId} className="font-semibold text-gray-900">{t('admin.users.account')}</h3>
            <p className="text-sm text-gray-500">{user.username}</p>
          </div>
        </div>
        <Input
          id={firstNameId}
          label={t('admin.users.firstName')}
          value={draft.firstName}
          autoComplete="off"
          disabled={saving}
          error={errorFor('firstName')}
          onChange={(event) => { const firstName = event.target.value; setDraft((current) => ({ ...current, firstName })) }}
        />
        <Input
          id={lastNameId}
          label={t('admin.users.lastName')}
          value={draft.lastName}
          autoComplete="off"
          disabled={saving}
          error={errorFor('lastName')}
          onChange={(event) => { const lastName = event.target.value; setDraft((current) => ({ ...current, lastName })) }}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" size="sm" isLoading={saving} disabled={unchanged}>{t('admin.users.saveAccount')}</Button>
        </div>
      </form>
    </AdminFormDialog>
  )
}
