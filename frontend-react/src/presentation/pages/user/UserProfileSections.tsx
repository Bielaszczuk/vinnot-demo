import type { ComponentType } from 'react'
import { Camera, ShieldCheck, User } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { Spinner } from '@components/ui/Spinner'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { ProfilePointsHeader } from '@components/features/points/ProfilePointsHeader'
import { ImageCropDialog } from '@components/features/media/ImageCropDialog'
import { IMAGE_ASPECT } from '@domain/media/imageAspect'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { UserProfileAccountTab } from './UserProfileAccountTab'
import { UserProfileProfileTab } from './UserProfileProfileTab'
import { UserProfileSecurityTab } from './UserProfileSecurityTab'
import { UserProfileStatsTab } from './UserProfileStatsTab'
import { UserProfileNotificationsTab } from './UserProfileNotificationsTab'
import { UserProfileSocialCard } from './UserProfileSocialCard'
import {
  BellIcon,
  ChartIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from './UserProfileShared'
import { formatProfileDate } from './UserProfileFormatters'

const TAB_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  user: UserIcon,
  chart: ChartIcon,
  shield: ShieldIcon,
  bell: BellIcon,
  settings: SettingsIcon,
}

interface UserProfileSectionProps {
  vm: UserProfileViewModel
}

export function UserProfileHeroSection({ vm }: UserProfileSectionProps) {
  const {
    t,
    user,
    stats,
    points,
    loadingPoints,
    displayAvatar,
    isDraggingOver,
    uploadAvatarMutation,
    fileInputRef,
    triggerFileInput,
    onDrop,
    onDragOver,
    onDragLeave,
    onFileInputChange,
    avatarCrop,
    confirmAvatarCrop,
    cancelAvatarCrop,
  } = vm

  return (
    <div className="relative isolate mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 shadow-lg shadow-wine-950/10 ring-1 ring-white/5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-rating/15 blur-3xl" />
      </div>

      <div className="relative px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative" onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
          <button
            type="button"
            className="group relative block cursor-pointer rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            aria-label={t('profile.changeAvatar')}
            onClick={triggerFileInput}
          >
            <div className={`h-28 w-28 overflow-hidden rounded-full border-4 shadow-xl transition-all duration-300 ${isDraggingOver ? 'scale-105 border-white ring-4 ring-white/40' : 'border-white/30 group-hover:border-white/60'}`}>
              <ImageWithFallback src={displayAvatar ?? undefined} alt="" className="h-28 w-28 rounded-full object-cover" />
            </div>

            <div className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-200 ${uploadAvatarMutation.isPending ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
              {uploadAvatarMutation.isPending ? (
                <Spinner size="md" className="text-white" />
              ) : (
                <div className="text-center">
                  <Icon icon={Camera} size="lg" className="mx-auto mb-1 text-white" />
                  <span className="text-xs font-medium text-white" aria-hidden="true">{t('profile.changeAvatar')}</span>
                </div>
              )}
            </div>
          </button>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" tabIndex={-1} aria-hidden="true" onChange={onFileInputChange} />
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{user?.name || t('profile.title')}</h1>
            {user?.username && <p className="mt-1 text-wine-200">@{user.username}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {(user?.roles || []).map((role) => (
                <span key={role} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <Icon icon={role === 'ROLE_ADMIN' ? ShieldCheck : User} size="xs" />
                  {t(`admin.users.roles.${role.replace('ROLE_', '').toLowerCase()}`)}
                </span>
              ))}
              <span className="text-xs text-wine-200/70">· {t('profile.memberSince', { date: formatProfileDate(user?.createdAt) })}</span>
            </div>
            <div className="mt-4 w-full max-w-sm text-left">
              <ProfilePointsHeader summary={points} loading={loadingPoints} />
            </div>
          </div>

          <div className="flex gap-6 sm:ml-auto">
            <HeroStat value={stats?.totalReviews ?? 0} label={t('profile.statsReviews')} />
            <HeroStat value={stats?.cellarSize ?? 0} label={t('profile.statsCellar')} />
            <HeroStat value={stats?.totalEventsAttended ?? 0} label={t('profile.statsEvents')} />
          </div>
        </div>
      </div>
      {avatarCrop && (
        <ImageCropDialog image={avatarCrop} aspect={IMAGE_ASPECT.AVATAR} shape="round" onConfirm={confirmAvatarCrop} onCancel={cancelAvatarCrop} />
      )}
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-wine-200/80">{label}</div>
    </div>
  )
}

export function UserProfileTabNavigation({ vm }: UserProfileSectionProps) {
  const { tabs, activeTab, setActiveTab } = vm

  return (
    <div className="mb-6 border-b border-border">
      <nav className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.icon]
          return (
            <button
              key={tab.key}
              type="button"
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? 'border-wine-700 text-wine-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function UserProfileTabContent({ vm }: UserProfileSectionProps) {
  return (
    <div className="max-w-4xl">
      {vm.activeTab === 'profile' && (
        <>
          <UserProfileProfileTab vm={vm} />
          <UserProfileSocialCard />
        </>
      )}
      {vm.activeTab === 'stats' && <UserProfileStatsTab vm={vm} />}
      {vm.activeTab === 'security' && <UserProfileSecurityTab vm={vm} />}
      {vm.activeTab === 'notifications' && <UserProfileNotificationsTab />}
      {vm.activeTab === 'account' && <UserProfileAccountTab vm={vm} />}
    </div>
  )
}
