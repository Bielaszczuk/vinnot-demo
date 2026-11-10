import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWineries } from "@/presentation/hooks/queries/winery";
import { useDebounce } from "@/presentation/hooks/ui";
import type { WineryFilter, WinerySummary } from "@/domain/winery/winery.types";

const PAGE_SIZE = 20;

export function useWineriesListViewModel() {
  const [search, updateSearch] = useState("");
  const [page, updatePage] = useState(0);
  const [wineries, updateWineries] = useState<WinerySummary[]>([]);
  const [isRefreshing, updateIsRefreshing] = useState(false);
  const refreshFirstPagePending = useRef(false);
  const debouncedSearch = useDebounce(search, 350);

  const filter = useMemo<WineryFilter | undefined>(
    () => (debouncedSearch.trim() ? { search: debouncedSearch.trim() } : undefined),
    [debouncedSearch],
  );

  const { data, isLoading, isFetching, isError, refetch } = useWineries(
    filter,
    page,
    PAGE_SIZE,
  );
  const refetchFirstPage = useCallback(async () => {
    try {
      await refetch();
    } catch {
      // RTK Query exposes the failed refresh through the existing query state.
    } finally {
      updateIsRefreshing(false);
    }
  }, [refetch]);

  useEffect(() => {
    updatePage(0);
    updateWineries([]);
  }, [filter?.search]);

  useEffect(() => {
    if (!data) return;
    updateWineries((current) => (page === 0 ? data.wineries : [...current, ...data.wineries]));
  }, [data, page]);

  useEffect(() => {
    if (page !== 0 || !refreshFirstPagePending.current) return;
    refreshFirstPagePending.current = false;
    void refetchFirstPage();
  }, [page, refetchFirstPage]);

  function loadMore() {
    if (!data?.pagination.hasNext || isFetching) return;
    updatePage((current) => current + 1);
  }

  function refresh() {
    if (isRefreshing) return;
    updateIsRefreshing(true);
    updateWineries([]);

    if (page === 0) {
      void refetchFirstPage();
      return;
    }

    refreshFirstPagePending.current = true;
    updatePage(0);
  }

  return {
    search,
    setSearch: updateSearch,
    page,
    wineries,
    data,
    isLoading,
    isFetching,
    isRefreshing,
    isError,
    loadMore,
    refresh,
  };
}
