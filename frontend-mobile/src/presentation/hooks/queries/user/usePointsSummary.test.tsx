import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { appApi } from "@/presentation/store/api";
import { executeQueryOperation } from "@/application/operations";
import { useFreshPointsSummary, usePointsSummary } from ".";

let mockFocused = true;
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));
jest.mock("@/application/operations", () => ({
  executeMutationOperation: jest.fn(),
  executeQueryOperation: jest.fn(),
  queryTags: () => [],
  mutationTags: () => [],
  pointsTags: () => [],
  toApiError: (error: { message: string; code?: string }) => ({ message: error.message, code: error.code }),
}));

const query = executeQueryOperation as jest.Mock;
const stores: ReturnType<typeof makeStore>[] = [];

function makeStore() {
  return configureStore({
    reducer: { [appApi.reducerPath]: appApi.reducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(appApi.middleware),
    enhancers: (getDefault) => getDefault({ autoBatch: false }),
  });
}

function wrapper() {
  const store = makeStore();
  stores.push(store);
  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
}

const summary = (points: number) => ({ points, tier: "RACIMO" });

beforeEach(() => {
  jest.clearAllMocks();
  mockFocused = true;
});
afterEach(() => {
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
});

it("asks for fresh points when a screen opens, even if the seal host already holds them", async () => {
  query.mockResolvedValueOnce(summary(10)).mockResolvedValueOnce(summary(14));
  const Wrapper = wrapper();
  const host = renderHook(() => usePointsSummary(), { wrapper: Wrapper });
  await waitFor(() => expect(host.result.current.data).toEqual(summary(10)));

  const screen = renderHook(() => useFreshPointsSummary(), { wrapper: Wrapper });

  await waitFor(() => expect(screen.result.current.data).toEqual(summary(14)));
  expect(query).toHaveBeenCalledTimes(2);
  expect(query).toHaveBeenLastCalledWith({ key: "user.points" });
});

it("refreshes the points when the person comes back to the screen", async () => {
  query.mockResolvedValueOnce(summary(10)).mockResolvedValueOnce(summary(11));
  const { result, rerender } = renderHook(() => useFreshPointsSummary(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual(summary(10)));

  mockFocused = false;
  rerender({});
  expect(query).toHaveBeenCalledTimes(1);
  expect(result.current.data).toEqual(summary(10));

  mockFocused = true;
  rerender({});
  await waitFor(() => expect(result.current.data).toEqual(summary(11)));
  expect(query).toHaveBeenCalledTimes(2);
});

it("does not fetch for a signed-out profile", () => {
  renderHook(() => useFreshPointsSummary(false), { wrapper: wrapper() });
  expect(query).not.toHaveBeenCalled();
});
