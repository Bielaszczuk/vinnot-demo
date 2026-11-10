import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { appApi } from "@/presentation/store/api";
import { executeMutationOperation, executeQueryOperation } from "@/application/operations";
import { emptyAnnouncementDraft } from "@/domain/admin/announcement";
import {
  ANNOUNCEMENT_HISTORY_POLL_MS,
  useAnnouncementDetail,
  useAnnouncementHistory,
  useAnnouncementPreview,
  useAnnouncementReach,
  usePushEngagement,
  usePushSettings,
  useSendAnnouncement,
  useSetPushTypeEnabled,
} from "./useAdminNotifications";

jest.mock("@/application/operations", () => ({
  executeMutationOperation: jest.fn(),
  executeQueryOperation: jest.fn(),
  queryTags: () => [],
  mutationTags: () => [],
  pointsTags: () => [],
  toApiError: (error: { message: string; code?: string }) => ({ message: error.message, code: error.code }),
}));

const query = executeQueryOperation as jest.Mock;
const mutate = executeMutationOperation as jest.Mock;
const stores: ReturnType<typeof makeStore>[] = [];

function makeStore() {
  return configureStore({
    reducer: { [appApi.reducerPath]: appApi.reducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(appApi.middleware),
    // The default batching notifies through requestAnimationFrame, which React Native's Jest setup turns into a
    // timer that can fire after this file's environment is torn down.
    enhancers: (getDefault) => getDefault({ autoBatch: false }),
  });
}

function wrapper() {
  const store = makeStore();
  stores.push(store);
  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
}

const settings = (enabled: boolean) => ({
  provider: "expo",
  types: [{ type: "EVENT_REMINDER", category: "TICKETS", transactional: true, enabled }],
  recentChanges: [],
});

beforeEach(() => {
  jest.clearAllMocks();
});
afterEach(() => {
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
  jest.useRealTimers();
});

it("shows the switch result at once, without waiting for a refetch", async () => {
  query.mockResolvedValue(settings(true));
  mutate.mockResolvedValue(settings(false));
  const { result } = renderHook(() => ({ settings: usePushSettings(), toggle: useSetPushTypeEnabled() }), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current.settings.data?.types[0]?.enabled).toBe(true));

  await act(async () => {
    await result.current.toggle.mutateAsync({ type: "EVENT_REMINDER", enabled: false });
  });

  expect(mutate).toHaveBeenCalledWith(
    { key: "admin.notifications.push.toggle", params: { type: "EVENT_REMINDER", enabled: false } },
    expect.anything(),
  );
  expect(result.current.settings.data?.types[0]?.enabled).toBe(false);
  expect(query).toHaveBeenCalledTimes(1);
});

it("previews only a renderable version and asks the reach only with a channel", async () => {
  query.mockResolvedValue({ subject: "S" });
  const audience = emptyAnnouncementDraft().audience;
  const { rerender } = renderHook(
    ({ version, push, email }: { version: { title: string; body: string } | null; push: boolean; email: boolean }) => {
      useAnnouncementPreview("NEWS", "es", version);
      useAnnouncementReach("NEWS", { ...audience, email, push });
    },
    {
      wrapper: wrapper(),
      initialProps: { version: null as { title: string; body: string } | null, push: false, email: false },
    },
  );
  await act(async () => undefined);
  expect(query).not.toHaveBeenCalled();

  rerender({ version: { title: "Hola", body: "Cuerpo" }, push: true, email: false });

  await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
  expect(query).toHaveBeenCalledWith({
    key: "admin.notifications.preview",
    params: { kind: "NEWS", language: "es", title: "Hola", body: "Cuerpo" },
  });
  expect(query).toHaveBeenCalledWith({
    key: "admin.notifications.reach",
    params: { kind: "NEWS", ...audience, email: false, push: true },
  });
});

it("polls the history while a send is still being delivered and stops once it completes", async () => {
  jest.useFakeTimers();
  const delivering = [{ id: "a1", completedAt: null }];
  const completed = [{ id: "a1", completedAt: "2026-10-21T10:00:00Z" }];
  query.mockResolvedValueOnce(delivering).mockResolvedValue(completed);
  const { result } = renderHook(() => useAnnouncementHistory(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual(delivering));
  // Let the hook see the pending send and turn polling on.
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });

  await act(async () => {
    await jest.advanceTimersByTimeAsync(ANNOUNCEMENT_HISTORY_POLL_MS);
  });
  await waitFor(() => expect(result.current.data).toEqual(completed));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  const calls = query.mock.calls.length;

  await act(async () => {
    await jest.advanceTimersByTimeAsync(ANNOUNCEMENT_HISTORY_POLL_MS * 3);
  });
  expect(query.mock.calls.length).toBe(calls);
});

it("sends the draft with its request id", async () => {
  mutate.mockResolvedValue({ id: "a1", recipients: 3 });
  const draft = emptyAnnouncementDraft();
  const { result } = renderHook(() => useSendAnnouncement(), { wrapper: wrapper() });

  await act(async () => {
    await expect(result.current.mutateAsync({ draft, requestId: "r1" })).resolves.toEqual({ id: "a1", recipients: 3 });
  });

  expect(mutate).toHaveBeenCalledWith(
    { key: "admin.notifications.announcement.send", params: { draft, requestId: "r1" } },
    expect.anything(),
  );
});

it("reads the engagement pushes of the chosen window", async () => {
  query.mockResolvedValue({ days: 30, since: "2026-10-03", types: [] });
  const { result } = renderHook(() => usePushEngagement(30), { wrapper: wrapper() });

  await waitFor(() => expect(result.current.data).toEqual({ days: 30, since: "2026-10-03", types: [] }));
  expect(query).toHaveBeenCalledWith({ key: "admin.notifications.engagement", params: { days: 30 } });
});

it("reads one announcement only once it is opened, and fresh every time it opens", async () => {
  query.mockResolvedValue({ id: "a1" });
  const render = () =>
    renderHook(({ id }: { id: string | null }) => useAnnouncementDetail(id), {
      wrapper: shared,
      initialProps: { id: null as string | null },
    });
  const store = makeStore();
  stores.push(store);
  const shared = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;

  const first = render();
  await act(async () => undefined);
  expect(query).not.toHaveBeenCalled();

  first.rerender({ id: "a1" });
  await waitFor(() => expect(first.result.current.data).toEqual({ id: "a1" }));
  expect(query).toHaveBeenCalledWith({ key: "admin.notifications.detail", params: { id: "a1" } });
  first.unmount();

  const second = render();
  second.rerender({ id: "a1" });
  await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
});
