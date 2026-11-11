/**
 * Social query hooks: public profiles, follows, the following feed, suggestions, the
 * member's own taste quiz and the manual taste structure.
 */
import { useCallback, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import type { QueryOperationKey } from "@/application/operations";
import type {
  FollowUser,
  PublicCellarWine,
  PublicProfile,
  SocialPage,
  SuggestedUser,
  TasteStructureAdjustment,
  UserReview,
} from "@/domain/social/social.types";
import type { TasteQuizAnswers, TasteQuizState } from "@/domain/tasteQuiz/tasteQuiz.types";
import { useTypedQuery } from "@/presentation/store/api";
import { useOperationMutation } from "@/presentation/store/mutationAdapter";

/** Reviews shown in the Home preview of the following feed. */
export const FEED_PREVIEW_SIZE = 3;
/** People shown in the Home suggestions. */
export const HOME_SUGGESTIONS_SIZE = 10;

export function usePublicProfile(userId: string | undefined) {
  return useTypedQuery<PublicProfile>(userId ? { key: "social.profile", params: { userId } } : skipToken);
}

export function useFeedPreview(enabled: boolean) {
  return useTypedQuery<SocialPage<UserReview>>(
    enabled ? { key: "social.feed", params: { page: 0, size: FEED_PREVIEW_SIZE } } : skipToken,
  );
}

export function useSuggestions(enabled: boolean, size = HOME_SUGGESTIONS_SIZE) {
  return useTypedQuery<SuggestedUser[]>(enabled ? { key: "social.suggestions", params: { size } } : skipToken);
}

export function useFollowMutations() {
  const follow = useOperationMutation<void, string>((userId) => ({ key: "social.follow", params: { userId } }));
  const unfollow = useOperationMutation<void, string>((userId) => ({ key: "social.unfollow", params: { userId } }));
  return { follow, unfollow };
}

/** The signed-in member's own taste quiz: status, answers and whether to prompt. */
export function useTasteQuiz(enabled: boolean) {
  return useTypedQuery<TasteQuizState>(enabled ? { key: "social.tasteQuiz" } : skipToken);
}

export function useTasteQuizMutations() {
  const complete = useOperationMutation<void, TasteQuizAnswers>((answers) => ({
    key: "social.tasteQuiz.complete",
    params: { answers },
  }));
  const skip = useOperationMutation<void, void>(() => ({ key: "social.tasteQuiz.skip" }));
  return { complete, skip };
}

/** The own structure set by hand: save some traits, or clear them all. */
export function useTasteTraitMutations() {
  const adjust = useOperationMutation<void, TasteStructureAdjustment>((structure) => ({
    key: "social.tasteTraits.adjust",
    params: { structure },
  }));
  const reset = useOperationMutation<void, void>(() => ({ key: "social.tasteTraits.reset" }));
  return { adjust, reset };
}

/**
 * A paged list that keeps every loaded page: the next page is requested on demand and a
 * refresh goes back to the first one.
 */
export function usePagedSocialList<T>(key: QueryOperationKey, params: Record<string, unknown> | null) {
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState<T[][]>([]);
  const paramsKey = params ? JSON.stringify(params) : null;
  const [lastParamsKey, setLastParamsKey] = useState(paramsKey);
  const query = useTypedQuery<SocialPage<T>>(params ? { key, params: { ...params, page } } : skipToken);
  const data = query.data;
  const { refetch } = query;
  const [lastData, setLastData] = useState<SocialPage<T> | undefined>(undefined);

  // Another list (a different user, say) starts again from its first page.
  if (lastParamsKey !== paramsKey) {
    setLastParamsKey(paramsKey);
    setPage(0);
    setPages([]);
  }

  // Each page that arrives replaces its slot; a first page drops the later ones.
  if (data && data !== lastData) {
    setLastData(data);
    setPages((current) => {
      const next = data.page === 0 ? [] : current.slice(0, data.page);
      next[data.page] = data.items;
      return next;
    });
  }

  const items = useMemo(() => pages.flat(), [pages]);
  const hasMore = !!data?.hasMore;

  const loadMore = useCallback(() => {
    if (!data?.hasMore || query.isFetching) return;
    setPage(data.page + 1);
  }, [data, query.isFetching]);

  const refresh = useCallback(() => {
    if (page === 0) void refetch();
    else setPage(0);
  }, [page, refetch]);

  return {
    items,
    totalItems: data?.totalItems ?? 0,
    hasMore,
    isLoading: !!params && items.length === 0 && (query.isLoading || (query.isFetching && !data)),
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    loadMore,
    refresh,
  };
}

export function useFollowers(userId: string | undefined) {
  return usePagedSocialList<FollowUser>("social.followers", userId ? { userId } : null);
}

export function useFollowing(userId: string | undefined) {
  return usePagedSocialList<FollowUser>("social.following", userId ? { userId } : null);
}

export function useFeed(enabled: boolean) {
  return usePagedSocialList<UserReview>("social.feed", enabled ? {} : null);
}

export function useProfileReviews(userId: string | undefined) {
  return usePagedSocialList<UserReview>("social.reviews", userId ? { userId } : null);
}

export function useProfileCellar(userId: string | undefined, enabled: boolean) {
  return usePagedSocialList<PublicCellarWine>("social.cellar", userId && enabled ? { userId } : null);
}
