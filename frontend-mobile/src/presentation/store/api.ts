import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { SkipToken } from "@reduxjs/toolkit/query";
import {
  executeMutationOperation,
  executeQueryOperation,
  mutationTags,
  pointsTags,
  queryTags,
  toApiError,
  type ApiError,
  type MutationRequest,
  type QueryRequest,
} from "@/application/operations";

export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: fakeBaseQuery<ApiError>(),
  refetchOnFocus: true,
  tagTypes: [
    "Community",
    "Wines",
    "Events",
    "Wineries",
    "WineRoutes",
    "Cellar",
    "User",
    "Admin",
    "Partner",
    "References",
    "WineProfiles",
    "WineReviews",
    "WineComments",
    "WineSubmissions",
    "Points",
  ],
  endpoints: (build) => ({
    executeQuery: build.query<unknown, QueryRequest>({
      queryFn: async (request) => {
        try {
          return { data: await executeQueryOperation(request) };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      providesTags: (_result, _error, arg) => queryTags(arg.key, arg.params),
    }),
    executeMutation: build.mutation<unknown, MutationRequest>({
      async onQueryStarted(request, { dispatch, getState, queryFulfilled }): Promise<void> {
        if (request.key !== "community.block") return;
        try {
          await queryFulfilled;
          // A successful block must not leave previously visible content on screen
          // if the subsequent refresh fails. Only clear public social projections.
          for (const cached of appApi.util.selectCachedArgsForQuery(getState(), "executeQuery")) {
            if (cached.key === "wine.reviews") {
              dispatch(appApi.util.updateQueryData("executeQuery", cached, () => ({
                items: [], totalItems: 0, totalPages: 0, page: 0, pageSize: 20,
              })));
            } else if (cached.key === "wine.comments") {
              dispatch(appApi.util.updateQueryData("executeQuery", cached, () => []));
            }
          }
        } catch {
          // Failed blocks preserve the current view; the mutation exposes the error.
        }
      },
      queryFn: async (request, api) => {
        try {
          // Void/204 use cases still need an explicit successful RTK Query result.
          return { data: (await executeMutationOperation(request, api.signal)) ?? null };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
      invalidatesTags: (_result, error, arg) =>
        error ? [] : [...mutationTags(arg.key, arg.params), ...pointsTags(arg.key)],
    }),
  }),
});

export const { useExecuteQueryQuery, useLazyExecuteQueryQuery, useExecuteMutationMutation } =
  appApi;

type QueryHookResult = ReturnType<typeof useExecuteQueryQuery>;
type TypedQueryResult<TResult> = Omit<QueryHookResult, "currentData" | "data"> & {
  currentData: TResult | undefined;
  data: TResult | undefined;
};
type TypedQueryListResult<TResult> = Omit<QueryHookResult, "currentData" | "data"> & {
  currentData: TResult[];
  data: TResult[];
};

export function useTypedQuery<TResult>(
  request: QueryRequest | SkipToken,
  options?: { refetchOnMountOrArgChange?: boolean; pollingInterval?: number },
): TypedQueryResult<TResult> {
  const query = useExecuteQueryQuery(request, {
    ...options,
    // A comparison is user-driven, not a background refresh on app focus.
    refetchOnFocus: typeof request === "object" && request.key === "wine.comparison" ? false : undefined,
    refetchOnReconnect: typeof request === "object" && request.key === "wine.comparison" ? false : undefined,
  });
  return {
    ...query,
    currentData: query.currentData as TResult | undefined,
    data: query.data as TResult | undefined,
  };
}

export function useTypedQueryList<TResult>(
  request: QueryRequest | SkipToken,
): TypedQueryListResult<TResult> {
  const query = useExecuteQueryQuery(request);
  return {
    ...query,
    currentData: (query.currentData as TResult[] | undefined) ?? [],
    data: (query.data as TResult[] | undefined) ?? [],
  };
}
