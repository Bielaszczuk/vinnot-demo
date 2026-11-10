import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import { http } from "@/infrastructure/api/http";
import { appApi } from "@/presentation/store/api";
import { useWineHighlights } from "@/presentation/hooks/queries/wine/useWines";

jest.mock("@/shared/config/env", () => ({ env: { apiBaseUrl: "https://api.vinnot.com/api" } }));
jest.mock("expo-file-system/legacy", () => ({ cacheDirectory: "file:///cache/" }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
const originalAdapter = http.defaults.adapter;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(async () => {
  http.defaults.adapter = originalAdapter;
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

it("maps the real highlights contract, shares one cache subscription and refetches after a review", async () => {
  const calls: string[] = [];
  http.defaults.adapter = async (config) => {
    calls.push(String(config.url));
    const data =
      config.url === "/wines/highlights"
        ? [
            {
              id: "best",
              name: "Best",
              wineType: "RED",
              ratingAverage: 5,
              ratingCount: 10,
              imageUrl: "/api/uploads/wine-labels/best.webp",
            },
            {
              id: "second",
              name: "Second",
              wineType: "WHITE",
              ratingAverage: 4.8,
              ratingCount: 30,
            },
          ]
        : {
            id: "review",
            rating: 5,
            userId: "author",
            wineId: "best",
            createdAt: "2026-10-06T00:00:00Z",
            updatedAt: "2026-10-06T00:00:00Z",
          };
    return { config, status: 200, statusText: "OK", headers: {}, data };
  };
  const store = configureStore({
    reducer: { [appApi.reducerPath]: appApi.reducer },
    middleware: (g) => g({ serializableCheck: false }).concat(appApi.middleware),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const first = renderHook(() => useWineHighlights(), { wrapper });
  const second = renderHook(() => useWineHighlights(), { wrapper });
  try {
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(calls).toEqual(["/wines/highlights"]);
    expect(second.result.current.data.map((w) => w.id)).toEqual(["best", "second"]);
    expect(first.result.current.data[0]?.imageUrl).toBe(
      "https://api.vinnot.com/api/uploads/wine-labels/best.webp",
    );
    await act(async () => {
      await store
        .dispatch(
          appApi.endpoints.executeMutation.initiate({
            key: "wine.review.create",
            params: { wineId: "best", rating: 5 },
          }),
        )
        .unwrap();
    });
    await waitFor(() => expect(calls.filter((url) => url === "/wines/highlights")).toHaveLength(2));
    expect(calls).not.toContain("/wines");
  } finally {
    first.unmount();
    second.unmount();
    store.dispatch(appApi.util.resetApiState());
  }
});

it("exposes request failures as errors and retries without falling back to the entire catalog", async () => {
  let fail = true;
  const calls: string[] = [];
  http.defaults.adapter = async (config) => {
    calls.push(String(config.url));
    if (fail)
      throw new AxiosError("Unavailable", "ERR_BAD_RESPONSE", config, undefined, {
        config,
        status: 503,
        statusText: "Unavailable",
        headers: {},
        data: { message: "Unavailable" },
      });
    return { config, status: 200, statusText: "OK", headers: {}, data: [] };
  };
  const store = configureStore({
    reducer: { [appApi.reducerPath]: appApi.reducer },
    middleware: (g) => g({ serializableCheck: false }).concat(appApi.middleware),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => useWineHighlights(), { wrapper });
  try {
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    fail = false;
    await act(async () => {
      await hook.result.current.refetch();
    });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual([]);
    expect(calls).toEqual(["/wines/highlights", "/wines/highlights"]);
  } finally {
    hook.unmount();
    store.dispatch(appApi.util.resetApiState());
  }
});
