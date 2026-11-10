import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { appApi } from "@/presentation/store/api";
import { executeQueryOperation } from "@/application/operations";
import { useAdminSocialAccounts } from "./useAdminSocialAccounts";

jest.mock("@/application/operations", () => ({
  executeMutationOperation: jest.fn(),
  executeQueryOperation: jest.fn(),
  queryTags: () => [],
  mutationTags: () => [],
  pointsTags: () => [],
  toApiError: (error: { message: string; status?: number }) => ({ message: error.message, status: error.status }),
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

beforeEach(() => {
  jest.clearAllMocks();
});
afterEach(() => {
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
});

it("reads the network accounts only when asked for", async () => {
  query.mockResolvedValue([{ network: "THREADS" }]);
  renderHook(() => useAdminSocialAccounts(false), { wrapper: wrapper() });
  await act(async () => undefined);
  expect(query).not.toHaveBeenCalled();

  const { result } = renderHook(() => useAdminSocialAccounts(), { wrapper: wrapper() });

  await waitFor(() => expect(result.current.data).toEqual([{ network: "THREADS" }]));
  expect(query).toHaveBeenCalledWith({ key: "admin.socialAccounts.list" });
});
