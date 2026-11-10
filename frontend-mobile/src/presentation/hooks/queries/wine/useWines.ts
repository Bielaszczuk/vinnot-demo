/**
 * Wine query hooks powered by Redux Toolkit Query.
 * API-compatible with previous React Query hooks.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type {
  AiProfileStatus,
  AiWineProfile,
  PaginatedResult,
  Wine,
  WineComparison,
  WineFilter,
  WineLabelScanInput,
  WineLabelImageAttachmentInput,
  WineLabelImageAttachmentResult,
  WineReview,
  WineReviewDraftInput,
  WineReviewComment,
  WineScanResult,
  WineSubmissionInput,
  WineSubmission,
  WineSubmissionResult,
  WineSummary,
} from "@/domain/wine/wine.types";
import {
  useExecuteMutationMutation,
  useLazyExecuteQueryQuery,
  useTypedQuery,
  useTypedQueryList,
} from "@/presentation/store/api";
import { useMutationAdapter, useOperationMutation } from "@/presentation/store/mutationAdapter";
import { resolveAiContentLanguage } from "@/shared/i18n/language";

export function useWines(filter?: WineFilter, page = 0, pageSize = 20, enabled = true) {
  return useTypedQuery<PaginatedResult<WineSummary>>(
    enabled
      ? {
          key: "wine.list",
          params: { filter, page, pageSize },
        }
      : skipToken,
  );
}

export function useWineHighlights(limit = 4) {
  return useTypedQueryList<WineSummary>({ key: "wine.highlights", params: { limit } });
}

/** Refresh page zero without changing the subscribed page or discarding its list. */
export function useRefreshWines() {
  const [trigger] = useLazyExecuteQueryQuery();
  return useCallback(
    async (filter: WineFilter, pageSize: number) => {
      const request = trigger({ key: "wine.list", params: { filter, page: 0, pageSize } }, false);
      try {
        return (await request.unwrap()) as PaginatedResult<WineSummary>;
      } finally {
        // Leave cached results available, without keeping an old search subscribed.
        request.unsubscribe();
      }
    },
    [trigger],
  );
}

export function useWineDetail(id: string | undefined) {
  return useTypedQuery<Wine>(id ? { key: "wine.detail", params: { id } } : skipToken);
}

export function useWineReviews(
  id: string | undefined,
  params?: { page?: number; pageSize?: number; filter?: "recent" | "popular" | "mine" },
) {
  return useTypedQuery<PaginatedResult<WineReview>>(
    id ? { key: "wine.reviews", params: { id, query: params } } : skipToken,
  );
}

export function useCreateWineReview() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: { wineId: string } & WineReviewDraftInput) =>
      trigger({ key: "wine.review.create", params: { ...variables } }),
    state,
  );
}

export function useUpdateWineReview() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: { wineId: string; reviewId: string } & WineReviewDraftInput) =>
      trigger({ key: "wine.review.update", params: { ...variables } }),
    state,
  );
}

export function useDeleteWineReview() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: { wineId: string; reviewId: string }) =>
      trigger({ key: "wine.review.delete", params: variables }),
    state,
  );
}

export function useToggleReviewLike() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: { wineId: string; reviewId: string; liked: boolean }) =>
      trigger({ key: "wine.review.toggleLike", params: variables }),
    state,
  );
}

export function useMyReviewStatus(wineId: string | undefined, refreshOnMount = false) {
  return useTypedQuery<{ hasReview: boolean }>(
    wineId ? { key: "wine.myReviewStatus", params: { id: wineId } } : skipToken,
    { refetchOnMountOrArgChange: refreshOnMount },
  );
}

export function useReviewComments(wineId: string | undefined, reviewId: string | undefined) {
  return useTypedQueryList<WineReviewComment>(
    wineId && reviewId ? { key: "wine.comments", params: { wineId, reviewId } } : skipToken,
  );
}

export function useCreateReviewComment() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: { wineId: string; reviewId: string; content: string }) =>
      trigger({ key: "wine.comment.create", params: variables }),
    state,
  );
}

export function useDeleteReviewComment() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    (variables: { wineId: string; reviewId: string; commentId: string }) =>
      trigger({ key: "wine.comment.delete", params: variables }),
    state,
  );
}

export function useAiWineProfile(id: string | undefined, enabled = true) {
  const { i18n } = useTranslation();
  const language = resolveAiContentLanguage(i18n.resolvedLanguage ?? i18n.language);
  return useTypedQuery<AiWineProfile>(
    id && enabled ? { key: "wine.aiProfile", params: { id, language } } : skipToken,
  );
}

export function useAiProfileStatus(id: string | undefined, enabled = true) {
  const { i18n } = useTranslation();
  const language = resolveAiContentLanguage(i18n.resolvedLanguage ?? i18n.language);
  return useTypedQuery<AiProfileStatus>(
    id && enabled ? { key: "wine.aiProfileStatus", params: { id, language } } : skipToken,
  );
}

export function useRegenerateAiProfile(id: string | undefined) {
  const { i18n } = useTranslation();
  const language = resolveAiContentLanguage(i18n.resolvedLanguage ?? i18n.language);
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter((_arg: void) => {
    if (!id) throw new Error("Wine id is required");
    return trigger({
      key: "wine.aiProfile.regenerate",
      params: { id, language },
    });
  }, state);
}

export function useGenerateAiProfile(id: string | undefined) {
  const { i18n } = useTranslation();
  const language = resolveAiContentLanguage(i18n.resolvedLanguage ?? i18n.language);
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter((_arg: void) => {
    if (!id) throw new Error("Wine id is required");
    return trigger({
      key: "wine.aiProfile.generate",
      params: { id, language },
    });
  }, state);
}

export function useWineComparison(wineAId: string | undefined, wineBId: string | undefined) {
  const { i18n } = useTranslation();
  const language = resolveAiContentLanguage(i18n.resolvedLanguage ?? i18n.language);
  return useTypedQuery<WineComparison>(
    wineAId && wineBId
      ? { key: "wine.comparison", params: { wineAId, wineBId, language } }
      : skipToken,
  );
}

export function useScanWineLabel() {
  return useOperationMutation<WineScanResult, WineLabelScanInput>((input) => ({
    key: "wine.scan",
    params: {
      imageUri: input.imageUri,
      observedText: input.observedText,
    },
  }));
}

export function useSubmitWine() {
  return useOperationMutation<WineSubmissionResult, WineSubmissionInput>((payload) => ({
    key: "wine.submit",
    params: { payload },
  }));
}

export function useMyWineSubmissions(page = 0, pageSize = 20) {
  return useTypedQuery<PaginatedResult<WineSubmission>>({
    key: "wine.submissions",
    params: { page, pageSize },
  });
}

export function useAttachWineLabelImage() {
  return useOperationMutation<WineLabelImageAttachmentResult, WineLabelImageAttachmentInput>(
    (payload) => ({
      key: "wine.labelImage.attach",
      params: { payload },
    }),
  );
}
