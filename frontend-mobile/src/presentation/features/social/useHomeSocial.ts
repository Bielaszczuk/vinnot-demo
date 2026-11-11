/**
 * Data of the Home social sections. A signed-out visitor gets nothing: no request is
 * made and the sections are not shown.
 */
import { useFeedPreview, useSuggestions } from "@/presentation/hooks/queries/social";

export function useHomeSocial(isAuthenticated: boolean) {
  const feed = useFeedPreview(isAuthenticated);
  const suggestions = useSuggestions(isAuthenticated);
  if (!isAuthenticated) return undefined;
  return {
    feed: feed.data?.items ?? [],
    feedLoading: feed.isLoading && !feed.data,
    feedError: feed.isError ? (feed.error ?? {}) : undefined,
    onRetryFeed: () => void feed.refetch(),
    suggestions: suggestions.data ?? [],
    suggestionsLoading: suggestions.isLoading && !suggestions.data,
    isFetching: feed.isFetching || suggestions.isFetching,
    refresh: () => {
      void feed.refetch();
      void suggestions.refetch();
    },
  };
}
