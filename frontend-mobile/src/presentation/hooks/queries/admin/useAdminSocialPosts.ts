/**
 * Admin social posts query hooks (#489, #492, #497; mobile #499): the approval queue, one post (polled while its
 * slides render), the review actions, the per-language copy edit, the manual planner run, the wine-day calendar,
 * retrying a failed publication and the content pillars with their switches (#510), moving a post to another date
 * and time and publishing it now (#513), through the shared RTK Query operations. Every post action refreshes the
 * queue and the open post through their tags; a pillar switch refreshes the pillars only.
 */
import { useCallback } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { appApi, useTypedQuery } from "@/presentation/store/api";
import { useAppDispatch } from "@/presentation/store/hooks";
import { useOperationMutation } from "@/presentation/store/mutationAdapter";
import type { MutationRequest } from "@/application/operations";
import {
  isMediaPending,
  type AdminContentPillar,
  type PillarSwitch,
  type PlanResult,
  type SocialPost,
  type SocialPostCopyDraft,
  type SocialPostLanguage,
  type SocialPostPage,
  type SocialPostStatus,
  type SocialNetwork,
  type WineDay,
} from "@/domain/admin/socialPost";

/** How often the open post is asked for again while its slides render. */
export const SOCIAL_POST_MEDIA_POLL_MS = 4000;

const detailRequest = (id: string) => ({ key: "admin.socialPosts.detail", params: { id } }) as const;

/** `pollingInterval` keeps asking while the planned copy is written in the background; `0` stops. */
export function useAdminSocialPosts(page: number, size: number, status: SocialPostStatus, pollingInterval = 0) {
  return useTypedQuery<SocialPostPage>(
    { key: "admin.socialPosts.list", params: { page, size, status } },
    { pollingInterval },
  );
}

/** The selected post; polled while its slides render so they show up on their own. */
export function useAdminSocialPost(id: string | null) {
  const request = id ? detailRequest(id) : skipToken;
  // The cached post decides the interval of the subscription that keeps it fresh.
  const cached = appApi.endpoints.executeQuery.useQueryState(request).data as SocialPost | undefined;
  return useTypedQuery<SocialPost>(request, {
    pollingInterval: isMediaPending(cached) ? SOCIAL_POST_MEDIA_POLL_MS : 0,
  });
}

export function useAdminWineDays(year: number, enabled = true) {
  return useTypedQuery<WineDay[]>(enabled ? { key: "admin.socialPosts.wineDays", params: { year } } : skipToken);
}

/** A review action shows the returned post at once; its tags then refresh the queue, whose filter may not match. */
function useReviewMutation<TArg>(requestFactory: (arg: TArg) => MutationRequest) {
  const dispatch = useAppDispatch();
  const mutation = useOperationMutation<SocialPost, TArg>(requestFactory);
  const { mutateAsync } = mutation;
  const run = useCallback(
    async (arg: TArg) => {
      const post = await mutateAsync(arg);
      dispatch(appApi.util.upsertQueryData("executeQuery", detailRequest(post.id), post));
      return post;
    },
    [dispatch, mutateAsync],
  );
  return { ...mutation, mutateAsync: run };
}

export function useApproveSocialPost() {
  return useReviewMutation((id: string) => ({ key: "admin.socialPosts.approve", params: { id } }));
}

export function useRejectSocialPost() {
  return useReviewMutation(({ id, reason }: { id: string; reason: string }) => ({
    key: "admin.socialPosts.reject",
    params: { id, reason },
  }));
}

/** Edits the copy of one language only. */
export function useUpdateSocialPostCopy() {
  return useReviewMutation(
    ({ id, language, draft }: { id: string; language: SocialPostLanguage; draft: SocialPostCopyDraft }) => ({
      key: "admin.socialPosts.update",
      params: { id, language, draft },
    }),
  );
}

export function useRegenerateSocialPost() {
  return useReviewMutation((id: string) => ({ key: "admin.socialPosts.regenerate", params: { id } }));
}

export function useNewSocialPostIllustration() {
  return useReviewMutation((id: string) => ({ key: "admin.socialPosts.illustration", params: { id } }));
}

export function usePlanSocialPosts() {
  return useOperationMutation<PlanResult, void>(() => ({ key: "admin.socialPosts.plan" }));
}

/** Publishes the post again on one network where it failed. */
export function useRetrySocialPublication() {
  return useReviewMutation(({ id, network }: { id: string; network: SocialNetwork }) => ({
    key: "admin.socialPosts.retryPublication",
    params: { id, network },
  }));
}

/** Moves a post to another ISO instant; its status stays as it is. */
export function useRescheduleSocialPost() {
  return useReviewMutation(({ id, scheduledFor }: { id: string; scheduledFor: string }) => ({
    key: "admin.socialPosts.reschedule",
    params: { id, scheduledFor },
  }));
}

/** Starts publishing an approved post on every enabled network right away. */
export function usePublishSocialPostNow() {
  return useReviewMutation((id: string) => ({ key: "admin.socialPosts.publishNow", params: { id } }));
}

export function useAdminSocialPillars(enabled = true) {
  return useTypedQuery<AdminContentPillar[]>(enabled ? { key: "admin.socialPosts.pillars" } : skipToken);
}

/** Switches a pillar's planning (`active`) or its auto-approval (`autoApprove`). */
export function useSwitchSocialPillar() {
  return useOperationMutation<AdminContentPillar, { code: string; which: PillarSwitch; enabled: boolean }>(
    ({ code, which, enabled }) => ({ key: "admin.socialPosts.pillarSwitch", params: { code, which, enabled } }),
  );
}
