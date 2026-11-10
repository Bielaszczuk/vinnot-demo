/**
 * An administrator's edit of an account's names.
 * PATCH /admin/users/{id} (UpdateUserAdminRequest) keeps every field sent as null, so the
 * update carries only what changed. Names travel together: the backend fills a missing one
 * from the stored value, which may itself be null. Deactivating an account goes through the
 * suspension flow (reason and email), never through this edit.
 */

/** users.first_name / last_name columns; the request has no @Valid, so the app enforces it. */
export const ADMIN_USER_NAME_MAX_LENGTH = 100

export interface AdminUserDraft {
  firstName: string
  lastName: string
}

export interface AdminUserSource {
  firstName?: string | null
  lastName?: string | null
}

/** Both names, trimmed, as PATCH sends them. */
export interface AdminUserNames {
  firstName: string
  lastName: string
}

/** Nothing to send, or both names together. */
export type AdminUserUpdate = AdminUserNames | Record<string, never>

export type AdminUserDraftError = { field: keyof AdminUserDraft; code: 'tooLong' }

export function toAdminUserDraft(user: AdminUserSource): AdminUserDraft {
  return { firstName: user.firstName ?? '', lastName: user.lastName ?? '' }
}

export function validateAdminUserDraft(draft: AdminUserDraft): AdminUserDraftError[] {
  const errors: AdminUserDraftError[] = []
  if (draft.firstName.trim().length > ADMIN_USER_NAME_MAX_LENGTH) errors.push({ field: 'firstName', code: 'tooLong' })
  if (draft.lastName.trim().length > ADMIN_USER_NAME_MAX_LENGTH) errors.push({ field: 'lastName', code: 'tooLong' })
  return errors
}

export function toAdminUserUpdate(user: AdminUserSource, draft: AdminUserDraft): AdminUserUpdate {
  const firstName = draft.firstName.trim()
  const lastName = draft.lastName.trim()
  if (firstName === (user.firstName ?? '').trim() && lastName === (user.lastName ?? '').trim()) return {}
  return { firstName, lastName }
}

export function isAdminUserUpdateEmpty(update: AdminUserUpdate): update is Record<string, never> {
  return !('firstName' in update)
}
