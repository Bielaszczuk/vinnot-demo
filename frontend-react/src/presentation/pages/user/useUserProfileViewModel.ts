import { isInternationalPhoneInput } from '@domain/user/contactPhone'
import { useState, useCallback, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { useUserStats } from '@hooks/queries/user/useUserStats'
import { useMyPoints } from '@hooks/queries/user/useMyPoints'
import { useUpdateProfile } from '@hooks/queries/user/useUpdateProfile'
import { useUploadAvatar } from '@hooks/queries/user/useUploadAvatar'
import { usePendingImageCrop } from '@hooks/usePendingImageCrop'
import { useChangePassword } from '@hooks/queries/user/useChangePassword'
import { useRequestPasswordSetup } from '@hooks/queries/user/useRequestPasswordSetup'
import { useDeactivateAccount } from '@hooks/queries/user/useDeactivateAccount'
import { useDeleteAccount } from '@hooks/queries/user/useDeleteAccount'
import { useRequestEmailChange } from '@hooks/queries/user/useRequestEmailChange'
import { emailChangeErrorMessage } from '@presentation/feedback/emailChangeErrorMessage'
import { apiErrorMessage } from '@presentation/feedback/apiErrorMessage'
import { useConfirm } from '@hooks/useConfirm'
import { useAuthStore } from '@stores/auth.store'
import { usernameSchema } from '@domain/user/user.validators'
import { socialAuthService } from '@services/socialAuth.service'
import { useQueryClient } from '@tanstack/react-query'

export type TabKey = 'profile' | 'stats' | 'security' | 'notifications' | 'account'

const TAB_KEYS: readonly TabKey[] = ['profile', 'stats', 'security', 'notifications', 'account']

function isTabKey(value: string | null): value is TabKey {
  return TAB_KEYS.includes(value as TabKey)
}

export function useUserProfileViewModel() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const { confirm } = useConfirm()
  const clearSession = useAuthStore((state) => state.clearSession)
  const queryClient = useQueryClient()

  const [searchParams] = useSearchParams()
  // `?tab=` opens a tab directly, e.g. notifications from an unsubscribe link.
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const requested = searchParams.get('tab')
    return isTabKey(requested) ? requested : 'profile'
  })
  const [profileUsername, setProfileUsername] = useState(() => user?.username || '')
  const [profileFirstName, setProfileFirstName] = useState(() => user?.firstName || '')
  const [profilePhone, setProfilePhone] = useState(() => user?.phoneNumber || '')
  const [profileLastName, setProfileLastName] = useState(() => user?.lastName || '')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(() => user?.avatar || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const deletionInFlight = useRef(false)

  const { data: stats, isLoading: loadingStats } = useUserStats(isAuthenticated)
  const pointsQuery = useMyPoints(isAuthenticated)
  const updateProfileMutation = useUpdateProfile()
  const uploadAvatarMutation = useUploadAvatar()
  const avatarCrop = usePendingImageCrop()
  const openAvatarCrop = avatarCrop.open
  const closeAvatarCrop = avatarCrop.close
  const changePasswordMutation = useChangePassword()
  const requestPasswordSetupMutation = useRequestPasswordSetup()
  const deactivateAccountMutation = useDeactivateAccount()
  const deleteAccountMutation = useDeleteAccount()
  const requestEmailChangeMutation = useRequestEmailChange()

  const displayAvatar = avatarPreview || profileAvatarUrl || user?.avatar || null

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'profile', label: t('profile.tabs.profile'), icon: 'user' },
    { key: 'stats', label: t('profile.tabs.stats'), icon: 'chart' },
    { key: 'security', label: t('profile.tabs.security'), icon: 'shield' },
    { key: 'notifications', label: t('profile.tabs.notifications'), icon: 'bell' },
    { key: 'account', label: t('profile.tabs.account'), icon: 'settings' },
  ]

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  const handleSaveProfile = useCallback(async () => {
    if (profilePhone.trim() && !isInternationalPhoneInput(profilePhone)) {
      addToast({ type: 'warning', message: t('contactPhone.invalid') })
      return
    }
    const usernameResult = usernameSchema.safeParse(profileUsername)
    if (!usernameResult.success) {
      addToast({ type: 'warning', message: t('profile.toastUsernameInvalid') })
      return
    }
    try {
      const updatedUser = await updateProfileMutation.mutateAsync({
        username: usernameResult.data,
        firstName: profileFirstName.trim(),
        lastName: profileLastName.trim(),
        phoneNumber: profilePhone.trim(),
      })
      setProfilePhone(updatedUser.phoneNumber ?? '')
      addToast({ type: 'success', message: t('profile.toastProfileUpdated') })
    } catch (error) {
      addToast({
        type: 'error',
        message: typeof error === 'object' && error !== null && 'code' in error && error.code === 'INVALID_PHONE_NUMBER'
          ? t('contactPhone.invalid') : t('profile.toastProfileError'),
      })
    }
  }, [
    profileUsername,
    profileFirstName,
    profileLastName,
    profilePhone,
    updateProfileMutation,
    addToast,
    t,
  ])

  /** A picked photo is checked, then framed in the crop dialog before anything is uploaded. */
  const handleFileUpload = useCallback((file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      addToast({ type: 'error', message: t('profile.toastInvalidFormat') })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: t('profile.toastFileTooLarge') })
      return
    }
    openAvatarCrop(file)
  }, [openAvatarCrop, addToast, t])

  /** Uploads the framed photo the user confirmed. */
  const confirmAvatarCrop = useCallback(async (file: File) => {
    closeAvatarCrop()
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const avatarUrl = await uploadAvatarMutation.mutateAsync(file)
      setProfileAvatarUrl(avatarUrl)
      setAvatarPreview(null)
      addToast({ type: 'success', message: t('profile.toastAvatarUpdated') })
    } catch {
      setAvatarPreview(null)
      addToast({ type: 'error', message: t('profile.toastAvatarError') })
    }
  }, [closeAvatarCrop, uploadAvatarMutation, addToast, t])

  const onFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFileUpload(file)
    event.target.value = ''
  }, [handleFileUpload])

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false)
  }, [])

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword) {
      addToast({ type: 'warning', message: t('profile.toastPasswordFieldsRequired') })
      return
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'warning', message: t('profile.toastPasswordMismatch') })
      return
    }
    if (newPassword.length < 8) {
      addToast({ type: 'warning', message: t('profile.toastPasswordTooShort') })
      return
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      addToast({ type: 'success', message: t('profile.toastPasswordChanged') })
    } catch {
      addToast({ type: 'error', message: t('profile.toastPasswordError') })
    }
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    changePasswordMutation,
    addToast,
    t,
  ])

  const handleRequestPasswordSetup = useCallback(async () => {
    if (!user?.email) return

    try {
      await requestPasswordSetupMutation.mutateAsync(user.email)
      addToast({ type: 'success', message: t('profile.toastPasswordSetupSent') })
    } catch (error) {
      addToast({
        type: 'error',
        message: apiErrorMessage(error, t, 'profile.toastPasswordSetupError'),
      })
    }
  }, [user?.email, requestPasswordSetupMutation, addToast, t])

  const handleDeactivateAccount = useCallback(async () => {
    const confirmed = await confirm({
      title: t('profile.deactivateAccountConfirmTitle'),
      message: t('profile.deactivateAccountConfirmMessage'),
      confirmLabel: t('profile.deactivateAccount'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await deactivateAccountMutation.mutateAsync()
      clearSession()
      addToast({ type: 'success', message: t('profile.toastAccountDeactivated') })
      navigate('/login', { replace: true })
    } catch (error) {
      addToast({
        type: 'error',
        message: apiErrorMessage(error, t, 'profile.toastAccountDeactivationError'),
      })
    }
  }, [
    confirm,
    t,
    deactivateAccountMutation,
    clearSession,
    addToast,
    navigate,
  ])

  const handleRequestEmailChange = useCallback(async () => {
    const normalizedEmail = newEmail.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      addToast({ type: 'warning', message: t('profile.emailChangeInvalid') })
      return
    }
    if (normalizedEmail === user?.email.toLowerCase()) {
      addToast({ type: 'warning', message: t('profile.emailChangeSame') })
      return
    }

    try {
      await requestEmailChangeMutation.mutateAsync(normalizedEmail)
      setNewEmail('')
      addToast({ type: 'success', message: t('profile.toastEmailChangeRequested') })
    } catch (error) {
      addToast({
        type: 'error',
        message: emailChangeErrorMessage(error, t),
      })
    }
  }, [newEmail, user?.email, requestEmailChangeMutation, addToast, t])

  const handleDeleteAccount = useCallback(async () => {
    if (deletionInFlight.current) return
    deletionInFlight.current = true
    try {
      const confirmed = await confirm({
        title: t('profile.deleteAccountConfirmTitle'),
        message: t('profile.deleteAccountConfirmMessage'),
        confirmLabel: t('profile.deleteAccount'),
        cancelLabel: t('common.cancel'),
        variant: 'danger',
        typedConfirmation: {
          phrase: t('profile.deleteAccountPhrase'),
          label: t('profile.deleteAccountTypePhrase', { phrase: t('profile.deleteAccountPhrase') }),
        },
      })
      if (!confirmed) return

      const appleCredential = user?.socialProviders.includes('APPLE')
        ? await socialAuthService.acquireAppleAccountDeletionCredential()
        : undefined
      await deleteAccountMutation.mutateAsync(appleCredential)
      queryClient.clear()
      clearSession()
      navigate('/login', { replace: true })
    } catch (error) {
      addToast({
        type: 'error',
        message: apiErrorMessage(error, t, 'profile.toastAccountDeletionError'),
      })
    } finally {
      deletionInFlight.current = false
    }
  }, [
    confirm,
    t,
    user?.socialProviders,
    deleteAccountMutation,
    queryClient,
    clearSession,
    navigate,
    addToast,
  ])

  return {
    t,
    i18n,
    user,
    activeTab,
    setActiveTab,
    profileUsername,
    setProfileUsername,
    profileFirstName,
    setProfileFirstName,
    profileLastName,
    setProfileLastName,
    profilePhone,
    setProfilePhone,
    displayAvatar,
    /** Photo being framed before upload, if any. */
    avatarCrop: avatarCrop.pending,
    confirmAvatarCrop,
    cancelAvatarCrop: closeAvatarCrop,
    isDraggingOver,
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    newEmail,
    setNewEmail,
    fileInputRef,
    loadingStats,
    stats,
    /** Points and seal for the header; `undefined` while loading or when unavailable. */
    points: pointsQuery.data,
    loadingPoints: isAuthenticated && pointsQuery.isPending,
    updateProfileMutation,
    uploadAvatarMutation,
    changePasswordMutation,
    requestPasswordSetupMutation,
    deactivateAccountMutation,
    deleteAccountMutation,
    requestEmailChangeMutation,
    tabs,
    triggerFileInput,
    onDrop,
    onDragOver,
    onDragLeave,
    onFileInputChange,
    handleSaveProfile,
    handleChangePassword,
    handleRequestPasswordSetup,
    handleDeactivateAccount,
    handleDeleteAccount,
    handleRequestEmailChange,
  }
}

export type UserProfileViewModel = ReturnType<typeof useUserProfileViewModel>
