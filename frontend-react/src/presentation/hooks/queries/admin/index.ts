/**
 * Admin hooks barrel export
 */
export { useAdminStats } from './useAdminStats'
export { useAdminWines, useAdminWineDetail } from './useAdminWines'
export { useCreateAdminWine, useUpdateAdminWine, useDeleteAdminWine } from './useAdminWineMutations'
export { useAdminWineries } from './useAdminWineries'
export { useCreateAdminWinery, useUpdateAdminWinery, useDeleteAdminWinery } from './useAdminWineryMutations'
export { useAdminEvents } from './useAdminEvents'
export { useCreateAdminEvent, useUpdateAdminEvent, useDeleteAdminEvent } from './useAdminEventMutations'
export { useAdminRoutes, useAdminRouteDetail } from './useAdminRoutes'
export { useCreateAdminRoute, useUpdateAdminRoute, useDeleteAdminRoute } from './useAdminRouteMutations'
export { useAdminUsers } from './useAdminUsers'
export { useUpdateUserRole, useBanUser, useUnbanUser, useDeleteUser } from './useAdminUserMutations'
export { useAdminReviews } from './useAdminReviews'
export { useDeleteAdminReview } from './useAdminReviewMutations'
export { useAdminCountries, useAdminRegions } from './useAdminRegions'
export {
  usePushSettings,
  usePushMetrics,
  usePushEngagement,
  useSetPushTypeEnabled,
  useAnnouncementPreview,
  useAnnouncementReach,
  useAnnouncementHistory,
  useTestAnnouncement,
  useSendAnnouncement,
} from './useAdminNotifications'
export { useAppVersionSettings, useSetMinimumAppVersion } from './useAdminAppVersions'
export {
  useAdminWinerySearch,
  useAdminWineDetailMutation,
  useAdminRouteDetailMutation,
  useAdminAiProfileMutation,
} from './useAdminLookupMutations'
export { useAdminWineryPickerSearch } from './useAdminWineryPickerSearch'
