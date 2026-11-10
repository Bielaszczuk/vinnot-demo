import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { executeMutationOperation, executeQueryOperation } from "@/application/operations";
import { createElement, type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { act, renderHook } from "@testing-library/react-native";
import { appApi, useTypedQuery } from "./api";

jest.mock("@/application/operations", () => ({
  ...jest.requireActual<typeof import("@/application/operations/types")>("@/application/operations/types"),
  executeMutationOperation: jest.fn(),
  executeQueryOperation: jest.fn(),
}));

describe("application mutation adapter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("clears blocked social content even when refresh fails, without repeating AI calls", async () => {
    const store = configureStore({ reducer: { [appApi.reducerPath]: appApi.reducer }, middleware: gdm => gdm().concat(appApi.middleware) });
    const reviewRequest = { key: "wine.reviews" as const, params: { id: "wine" } };
    const commentRequest = { key: "wine.comments" as const, params: { wineId: "wine", reviewId: "review" } };
    jest.mocked(executeQueryOperation).mockImplementation(async request => request.key === "wine.reviews" ? { items: [{ userId: "author" }], totalItems: 1 } : [{ userId: "author" }]);
    const queries = [reviewRequest, commentRequest, { key: "wine.comparison" as const }, { key: "wine.aiProfile" as const }].map(request => store.dispatch(appApi.endpoints.executeQuery.initiate(request)));
    try {
      await Promise.all(queries);
      jest.mocked(executeQueryOperation).mockClear().mockRejectedValue(new Error("offline"));
      jest.mocked(executeMutationOperation).mockResolvedValueOnce(undefined);
      await store.dispatch(appApi.endpoints.executeMutation.initiate({ key: "community.block", params: { id: "author" } }));
      await Promise.all(store.dispatch(appApi.util.getRunningQueriesThunk()));
      expect(appApi.endpoints.executeQuery.select(reviewRequest)(store.getState()).data).toMatchObject({ items: [] });
      expect(appApi.endpoints.executeQuery.select(commentRequest)(store.getState()).data).toEqual([]);
      expect(jest.mocked(executeQueryOperation).mock.calls.map(([request]) => request.key).sort()).toEqual(["wine.comments", "wine.reviews"]);
    } finally {
      queries.forEach(query => query.unsubscribe()); store.dispatch(appApi.util.resetApiState());
    }
  });

  it("aborts the same signal passed from RTK Query to the scan operation", async () => {
    let operationSignal: AbortSignal | undefined;
    jest.mocked(executeMutationOperation).mockImplementationOnce((_request, signal) => {
      operationSignal = signal;
      return new Promise((resolve) =>
        signal?.addEventListener("abort", () => resolve(undefined), { once: true }),
      );
    });
    const store = configureStore({
      reducer: { [appApi.reducerPath]: appApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(appApi.middleware),
    });
    const mutation = store.dispatch(
      appApi.endpoints.executeMutation.initiate({
        key: "wine.scan",
        params: { imageUri: "file:///capture.jpg", observedText: [] },
      }),
    );
    const outcome = mutation.unwrap();
    expect(operationSignal?.aborted).toBe(false);
    mutation.abort();
    await expect(outcome).rejects.toMatchObject({ name: "AbortError" });
    expect(operationSignal?.aborted).toBe(true);
    mutation.reset();
    store.dispatch(appApi.util.resetApiState());
  });

  it.each([undefined, { id: "wine-1" }, false, 0])(
    "returns a valid fulfilled result for %p",
    async (value) => {
      jest.mocked(executeMutationOperation).mockResolvedValueOnce(value);
      const store = configureStore({
        reducer: { [appApi.reducerPath]: appApi.reducer },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(appApi.middleware),
      });
      const mutation = store.dispatch(
        appApi.endpoints.executeMutation.initiate({
          key: "admin.review.delete",
          params: { id: "review-1" },
        }),
      );
      try {
        expect(await mutation.unwrap()).toEqual(value ?? null);
      } finally {
        mutation.reset();
        store.dispatch(appApi.util.resetApiState());
      }
    },
  );

  it("refetches subscribed public/partner events only after success, including a void delete", async () => {
    jest.mocked(executeQueryOperation).mockResolvedValue([]);
    const store = configureStore({
      reducer: { [appApi.reducerPath]: appApi.reducer },
      middleware: (gdm) => gdm().concat(appApi.middleware),
    });
    const queries = (["event.list", "event.detail", "partner.events", "wine.comparison", "admin.users", "wine.list"] as const)
      .map((key) => store.dispatch(appApi.endpoints.executeQuery.initiate({ key, params: { id: "a" } })));
    try {
      await Promise.all(queries);
      jest.mocked(executeQueryOperation).mockClear();
      jest.mocked(executeMutationOperation).mockRejectedValueOnce(new Error("offline"));
      await store.dispatch(appApi.endpoints.executeMutation.initiate({ key: "partner.event.update", params: { id: "a" } }));
      expect(executeQueryOperation).not.toHaveBeenCalled();
      jest.mocked(executeMutationOperation).mockResolvedValueOnce(undefined);
      await store.dispatch(appApi.endpoints.executeMutation.initiate({ key: "partner.event.delete", params: { id: "a" } }));
      await Promise.all(store.dispatch(appApi.util.getRunningQueriesThunk()));
      expect(jest.mocked(executeQueryOperation).mock.calls.map(([request]) => request.key).sort())
        .toEqual(["event.detail", "event.list", "partner.events"]);
    } finally {
      queries.forEach((query) => query.unsubscribe());
      store.dispatch(appApi.util.resetApiState());
    }
  });

  it("refreshes ordinary queries on focus but never reruns a mounted comparison", async () => {
    jest.mocked(executeQueryOperation).mockResolvedValue([]);
    const store = configureStore({
      reducer: { [appApi.reducerPath]: appApi.reducer },
      middleware: (gdm) => gdm().concat(appApi.middleware),
    });
    const wrapper = ({ children }: PropsWithChildren) => createElement(Provider, { store, children });
    const { unmount } = renderHook(() => {
      useTypedQuery({ key: "wine.comparison", params: { wineAId: "a", wineBId: "b" } });
      useTypedQuery({ key: "wine.list" });
    }, { wrapper });
    try {
      await act(async () => { await Promise.all(store.dispatch(appApi.util.getRunningQueriesThunk())); });
      jest.mocked(executeQueryOperation).mockClear();
      await act(async () => {
        store.dispatch(appApi.internalActions.onFocus());
        await Promise.all(store.dispatch(appApi.util.getRunningQueriesThunk()));
      });
      expect(jest.mocked(executeQueryOperation).mock.calls.map(([request]) => request.key)).toEqual(["wine.list"]);
    } finally { unmount(); store.dispatch(appApi.util.resetApiState()); }
  });
});
