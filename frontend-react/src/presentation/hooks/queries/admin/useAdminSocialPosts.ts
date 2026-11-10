/**
 * Admin social posts (#489): the approval queue, one post, the review actions, the manual planner run and the
 * wine-day calendar; the selected post is polled while its slides render (#492); the publication retry and the
 * pillar switches (#510); the reschedule and the publish now (#513).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminSocialPostsService } from '@services/adminSocialPosts.service'
import {
  isMediaPending,
  type ContentPillarSettings,
  type SocialLanguage,
  type SocialNetwork,
  type SocialPost,
  type SocialPostCopyDraft,
  type SocialPostStatus,
  type ZonedDateTime,
} from '@domain/admin/socialPost'

/** How often the selected post is asked for again while its slides render. */
export const MEDIA_POLL_INTERVAL_MS = 4000

export const socialPostKeys = {
  all: () => [...queryKeys.admin.all, 'social-posts'] as const,
  list: (params: { page: number; size: number; status?: SocialPostStatus }) =>
    [...socialPostKeys.all(), 'list', params] as const,
  detail: (id: string) => [...socialPostKeys.all(), 'detail', id] as const,
  wineDays: (year: number) => [...socialPostKeys.all(), 'wine-days', year] as const,
  pillars: () => [...socialPostKeys.all(), 'pillars'] as const,
}

/** `refetchInterval` keeps asking while the planned copy is written in the background; `false` stops. */
export function useAdminSocialPosts(page: number, size: number, status?: SocialPostStatus, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: socialPostKeys.list({ page, size, status }),
    queryFn: () => adminSocialPostsService.getPosts(page, size, status),
    placeholderData: keepPreviousData,
    refetchInterval,
  })
}

export function useAdminSocialPost(id?: string) {
  return useQuery({
    queryKey: socialPostKeys.detail(id ?? ''),
    queryFn: () => adminSocialPostsService.getPost(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => (isMediaPending(query.state.data) ? MEDIA_POLL_INTERVAL_MS : false),
  })
}

export function useAdminWineDays(year: number, enabled = true) {
  return useQuery({
    queryKey: socialPostKeys.wineDays(year),
    queryFn: () => adminSocialPostsService.getWineDays(year),
    enabled,
    staleTime: Infinity,
  })
}

export function useAdminContentPillars() {
  return useQuery({
    queryKey: socialPostKeys.pillars(),
    queryFn: () => adminSocialPostsService.getPillars(),
    staleTime: Infinity,
  })
}

/** Every review action replaces the cached post and refreshes the queue, whose status filter may no longer match. */
function useReviewMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<SocialPost>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (post) => {
      qc.setQueryData(socialPostKeys.detail(post.id), post)
      return qc.invalidateQueries({ queryKey: [...socialPostKeys.all(), 'list'] })
    },
  })
}

export function useApproveSocialPost() {
  return useReviewMutation((id: string) => adminSocialPostsService.approve(id))
}

export function useRejectSocialPost() {
  return useReviewMutation(({ id, reason }: { id: string; reason: string }) => adminSocialPostsService.reject(id, reason))
}

/** Saves the copy of one language (#497). */
export function useUpdateSocialPostCopy() {
  return useReviewMutation(({ id, language, draft }: { id: string; language: SocialLanguage; draft: SocialPostCopyDraft }) =>
    adminSocialPostsService.updateCopy(id, language, draft))
}

export function useRegenerateSocialPost() {
  return useReviewMutation((id: string) => adminSocialPostsService.regenerate(id))
}

export function useNewSocialPostIllustration() {
  return useReviewMutation((id: string) => adminSocialPostsService.newIllustration(id))
}

/** Moves the post to a date and time of the planner zone (#513). */
export function useRescheduleSocialPost() {
  return useReviewMutation(({ id, date, time }: { id: string } & ZonedDateTime) => adminSocialPostsService.reschedule(id, { date, time }))
}

/** Starts publishing an approved post right away (#513). */
export function usePublishSocialPostNow() {
  return useReviewMutation((id: string) => adminSocialPostsService.publishNow(id))
}

export function usePlanSocialPosts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => adminSocialPostsService.planNow(),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialPostKeys.all() }),
  })
}

/** Queues a failed network again; the post and the queue are read again, since the post goes back to scheduled. */
export function useRetrySocialPublication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, network }: { id: string; network: SocialNetwork }) => adminSocialPostsService.retryPublication(id, network),
    onSuccess: (_result, { id }) => Promise.all([
      qc.invalidateQueries({ queryKey: socialPostKeys.detail(id) }),
      qc.invalidateQueries({ queryKey: [...socialPostKeys.all(), 'list'] }),
    ]),
  })
}

/** Every pillar switch answers the updated pillar, which replaces its entry in the cached list. */
function usePillarSwitch(mutationFn: (variables: { code: string; enabled: boolean }) => Promise<ContentPillarSettings>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (pillar) => {
      qc.setQueryData<ContentPillarSettings[]>(socialPostKeys.pillars(), (current) =>
        current?.map((candidate) => (candidate.code === pillar.code ? pillar : candidate)))
    },
  })
}

export function useSetPillarAutoApprove() {
  return usePillarSwitch(({ code, enabled }) => adminSocialPostsService.setPillarAutoApprove(code, enabled))
}

export function useSetPillarActive() {
  return usePillarSwitch(({ code, enabled }) => adminSocialPostsService.setPillarActive(code, enabled))
}
