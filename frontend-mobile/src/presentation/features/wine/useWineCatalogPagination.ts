import { useEffect, useMemo, useRef, useState } from "react";
import type { PaginatedResult, WineFilter, WineSummary } from "@/domain/wine/wine.types";
import { useRefreshWines, useWines } from "@/presentation/hooks/queries/wine/useWines";

type WinePage = PaginatedResult<WineSummary>;
interface CatalogState {
  key: string;
  page: number;
  pages: Record<number, WinePage>;
  isRefreshing: boolean;
  refreshError?: unknown;
}
const initialState = (key: string): CatalogState => ({
  key,
  page: 0,
  pages: {},
  isRefreshing: false,
});

/** Presentation coordination only: filter values and server ordering remain unchanged. */
export function useWineCatalogPagination(
  filter: WineFilter,
  ownerId: string | undefined,
  enabled: boolean,
  pageSize: number,
) {
  const key = JSON.stringify({ filter, ownerId, enabled, pageSize });
  const [state, updateState] = useState(() => initialState(key));
  // Reset before subscribing, so new criteria never request the previous page number.
  if (state.key !== key) updateState(initialState(key));
  const current = state.key === key ? state : initialState(key);
  const query = useWines(filter, current.page, pageSize, enabled);
  const refreshFirstPage = useRefreshWines();
  const refreshRequest = useRef<object | null>(null);

  useEffect(
    () => () => {
      refreshRequest.current = null;
    },
    [key],
  );

  useEffect(() => {
    const result = query.currentData;
    if (
      !enabled ||
      !result ||
      query.isFetching ||
      query.isError ||
      current.isRefreshing ||
      result.page !== current.page
    )
      return;
    updateState((previous) =>
      previous.key !== key || previous.pages[result.page] === result
        ? previous
        : { ...previous, pages: { ...previous.pages, [result.page]: result } },
    );
  }, [
    key,
    enabled,
    query.currentData,
    query.isFetching,
    query.isError,
    current.page,
    current.isRefreshing,
  ]);

  const wines = useMemo(() => {
    // Replace repeated pages; preserve server order and a single card per wine ID.
    const byId = new Map<string, WineSummary>();
    Object.values(state.key === key ? state.pages : {}).forEach((result) => {
      result.items.forEach((wine) => byId.set(wine.id, wine));
    });
    return [...byId.values()];
  }, [state.key, state.pages, key]);
  const acceptedPages = Object.values(current.pages);
  const data = acceptedPages.at(-1);
  const refreshFailed = current.refreshError !== undefined;

  function loadMore() {
    if (
      !enabled ||
      refreshRequest.current ||
      current.isRefreshing ||
      refreshFailed ||
      query.isFetching ||
      query.isError ||
      !query.currentData?.hasNext ||
      !current.pages[current.page]
    )
      return;
    updateState((previous) =>
      previous.key === key && previous.page === current.page
        ? { ...previous, page: previous.page + 1 }
        : previous,
    );
  }

  async function refresh() {
    if (!enabled || refreshRequest.current) return;
    const request = {};
    refreshRequest.current = request;
    updateState((previous) => ({ ...previous, isRefreshing: true, refreshError: undefined }));
    try {
      const result = await refreshFirstPage(filter, pageSize);
      if (refreshRequest.current !== request) return;
      updateState((previous) =>
        previous.key !== key
          ? previous
          : {
              key,
              page: 0,
              pages: { 0: result },
              isRefreshing: false,
            },
      );
    } catch (error) {
      if (refreshRequest.current !== request) return;
      updateState((previous) =>
        previous.key !== key
          ? previous
          : {
              ...previous,
              isRefreshing: false,
              refreshError: error,
            },
      );
    } finally {
      if (refreshRequest.current === request) refreshRequest.current = null;
    }
  }

  function retry() {
    if (!enabled || refreshRequest.current || query.isFetching) return;
    if (refreshFailed) {
      void refresh();
      return;
    }
    // RTK exposes the retry error; keep all successfully loaded pages on failure.
    void query.refetch();
  }

  return {
    page: current.page,
    wines,
    data,
    isLoading: enabled && !data && query.isFetching,
    isFetching: query.isFetching || current.isRefreshing,
    isError: refreshFailed || query.isError,
    error: refreshFailed ? current.refreshError : query.error,
    isRefreshing: current.isRefreshing,
    loadMore,
    refresh,
    retry,
  };
}
