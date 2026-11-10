import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { appApi } from "@/presentation/store/api";
import { executeMutationOperation, executeQueryOperation } from "@/application/operations";
import { emptyCopyDraft } from "@/domain/admin/socialPost";
import {
  SOCIAL_POST_MEDIA_POLL_MS,
  useAdminSocialPillars,
  useAdminSocialPost,
  useAdminSocialPosts,
  useAdminWineDays,
  useApproveSocialPost,
  useNewSocialPostIllustration,
  usePlanSocialPosts,
  usePublishSocialPostNow,
  useRegenerateSocialPost,
  useRejectSocialPost,
  useRescheduleSocialPost,
  useRetrySocialPublication,
  useSwitchSocialPillar,
  useUpdateSocialPostCopy,
} from "./useAdminSocialPosts";

jest.mock("@/application/operations", () => ({
  executeMutationOperation: jest.fn(),
  executeQueryOperation: jest.fn(),
  queryTags: () => [],
  mutationTags: () => [],
  pointsTags: () => [],
  toApiError: (error: { message: string; status?: number }) => ({ message: error.message, status: error.status }),
}));

const query = executeQueryOperation as jest.Mock;
const mutate = executeMutationOperation as jest.Mock;
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

const post = (status: string, mediaStatus = "READY") => ({ id: "p1", status, media: { status: mediaStatus } });

beforeEach(() => {
  jest.clearAllMocks();
});
afterEach(() => {
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
  jest.useRealTimers();
});

it("reads one queue page of one status", async () => {
  query.mockResolvedValue({ items: [], totalItems: 0 });
  const { result } = renderHook(() => useAdminSocialPosts(1, 20, "APPROVED"), { wrapper: wrapper() });

  await waitFor(() => expect(result.current.data).toEqual({ items: [], totalItems: 0 }));
  expect(query).toHaveBeenCalledWith({
    key: "admin.socialPosts.list",
    params: { page: 1, size: 20, status: "APPROVED" },
  });
});

it("reads the wine days of a year only when asked for", async () => {
  query.mockResolvedValue([]);
  renderHook(() => useAdminWineDays(2027, false), { wrapper: wrapper() });
  await act(async () => undefined);
  expect(query).not.toHaveBeenCalled();

  renderHook(() => useAdminWineDays(2026), { wrapper: wrapper() });
  await waitFor(() =>
    expect(query).toHaveBeenCalledWith({ key: "admin.socialPosts.wineDays", params: { year: 2026 } }),
  );
});

it("reads one post once it is selected and polls it while its slides render", async () => {
  jest.useFakeTimers();
  query.mockResolvedValueOnce(post("PENDING_APPROVAL", "PENDING")).mockResolvedValue(post("PENDING_APPROVAL"));
  const { result, rerender } = renderHook(({ id }: { id: string | null }) => useAdminSocialPost(id), {
    wrapper: wrapper(),
    initialProps: { id: null as string | null },
  });
  await act(async () => undefined);
  expect(query).not.toHaveBeenCalled();

  rerender({ id: "p1" });
  await waitFor(() => expect(result.current.data).toEqual(post("PENDING_APPROVAL", "PENDING")));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SOCIAL_POST_MEDIA_POLL_MS);
  });
  await waitFor(() => expect(result.current.data).toEqual(post("PENDING_APPROVAL")));
  expect(query).toHaveBeenCalledWith({ key: "admin.socialPosts.detail", params: { id: "p1" } });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  const calls = query.mock.calls.length;

  await act(async () => {
    await jest.advanceTimersByTimeAsync(SOCIAL_POST_MEDIA_POLL_MS * 3);
  });
  expect(query.mock.calls.length).toBe(calls);
});

it("shows the reviewed post at once, without waiting for a refetch", async () => {
  query.mockResolvedValue(post("PENDING_APPROVAL"));
  mutate.mockResolvedValue(post("APPROVED"));
  const { result } = renderHook(() => ({ detail: useAdminSocialPost("p1"), approve: useApproveSocialPost() }), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current.detail.data).toEqual(post("PENDING_APPROVAL")));

  await act(async () => {
    await result.current.approve.mutateAsync("p1");
  });

  expect(mutate).toHaveBeenCalledWith({ key: "admin.socialPosts.approve", params: { id: "p1" } }, expect.anything());
  expect(result.current.detail.data).toEqual(post("APPROVED"));
});

it("sends every review action with its parameters", async () => {
  mutate.mockResolvedValue(post("REJECTED"));
  const draft = emptyCopyDraft();
  const { result } = renderHook(
    () => ({
      reject: useRejectSocialPost(),
      update: useUpdateSocialPostCopy(),
      regenerate: useRegenerateSocialPost(),
      illustration: useNewSocialPostIllustration(),
      plan: usePlanSocialPosts(),
    }),
    { wrapper: wrapper() },
  );

  await act(async () => {
    await result.current.reject.mutateAsync({ id: "p1", reason: "Tono" });
    await result.current.update.mutateAsync({ id: "p1", language: "en", draft });
    await result.current.regenerate.mutateAsync("p1");
    await result.current.illustration.mutateAsync("p1");
  });
  mutate.mockResolvedValue({ created: 2, from: "2026-11-04", to: "2026-11-30" });
  await act(async () => {
    await expect(result.current.plan.mutateAsync()).resolves.toEqual({ created: 2, from: "2026-11-04", to: "2026-11-30" });
  });

  expect(mutate.mock.calls.map(([request]) => request)).toEqual([
    { key: "admin.socialPosts.reject", params: { id: "p1", reason: "Tono" } },
    { key: "admin.socialPosts.update", params: { id: "p1", language: "en", draft } },
    { key: "admin.socialPosts.regenerate", params: { id: "p1" } },
    { key: "admin.socialPosts.illustration", params: { id: "p1" } },
    { key: "admin.socialPosts.plan" },
  ]);
});

it("retries one network's publication and shows the returned post at once", async () => {
  query.mockResolvedValue(post("FAILED"));
  mutate.mockResolvedValue(post("SCHEDULED"));
  const { result } = renderHook(
    () => ({ detail: useAdminSocialPost("p1"), retry: useRetrySocialPublication() }),
    { wrapper: wrapper() },
  );
  await waitFor(() => expect(result.current.detail.data).toEqual(post("FAILED")));

  await act(async () => {
    await result.current.retry.mutateAsync({ id: "p1", network: "THREADS" });
  });

  expect(mutate).toHaveBeenCalledWith(
    { key: "admin.socialPosts.retryPublication", params: { id: "p1", network: "THREADS" } },
    expect.anything(),
  );
  expect(result.current.detail.data).toEqual(post("SCHEDULED"));
});

it("moves a post to a new instant and publishes one now, showing each returned post at once", async () => {
  query.mockResolvedValue(post("APPROVED"));
  const { result } = renderHook(
    () => ({
      detail: useAdminSocialPost("p1"),
      reschedule: useRescheduleSocialPost(),
      publishNow: usePublishSocialPostNow(),
    }),
    { wrapper: wrapper() },
  );
  await waitFor(() => expect(result.current.detail.data).toEqual(post("APPROVED")));

  mutate.mockResolvedValue(post("REJECTED"));
  await act(async () => {
    await result.current.reschedule.mutateAsync({ id: "p1", scheduledFor: "2026-11-10T15:30:00.000Z" });
  });
  expect(result.current.detail.data).toEqual(post("REJECTED"));

  mutate.mockResolvedValue(post("SCHEDULED"));
  await act(async () => {
    await result.current.publishNow.mutateAsync("p1");
  });

  expect(mutate.mock.calls.map(([request]) => request)).toEqual([
    { key: "admin.socialPosts.reschedule", params: { id: "p1", scheduledFor: "2026-11-10T15:30:00.000Z" } },
    { key: "admin.socialPosts.publishNow", params: { id: "p1" } },
  ]);
  expect(result.current.detail.data).toEqual(post("SCHEDULED"));
});

it("reads the content pillars only when asked for and switches one of them", async () => {
  query.mockResolvedValue([{ code: "TERROIR" }]);
  renderHook(() => useAdminSocialPillars(false), { wrapper: wrapper() });
  await act(async () => undefined);
  expect(query).not.toHaveBeenCalled();

  const { result } = renderHook(() => ({ pillars: useAdminSocialPillars(), switchPillar: useSwitchSocialPillar() }), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current.pillars.data).toEqual([{ code: "TERROIR" }]));
  expect(query).toHaveBeenCalledWith({ key: "admin.socialPosts.pillars" });

  mutate.mockResolvedValue({ code: "TERROIR", autoApprove: true });
  await act(async () => {
    await expect(
      result.current.switchPillar.mutateAsync({ code: "TERROIR", which: "autoApprove", enabled: true }),
    ).resolves.toEqual({ code: "TERROIR", autoApprove: true });
  });
  expect(mutate).toHaveBeenCalledWith(
    { key: "admin.socialPosts.pillarSwitch", params: { code: "TERROIR", which: "autoApprove", enabled: true } },
    expect.anything(),
  );
});
