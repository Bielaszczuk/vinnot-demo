import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { communityService } from "@services/community.service";
import { useCommunityActions } from "./useCommunity";
import { queryKeys } from "../queryKeys";
vi.mock("@hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "reader", roles: ["ROLE_USER"] } }),
}));
afterEach(() => vi.restoreAllMocks());
it("clears social data after a successful block without invalidating AI or unrelated content", async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const reviews = queryKeys.wines.reviews("wine");
  const comments = queryKeys.wines.reviewComments("wine", "review");
  const comparison = queryKeys.wines.comparison("a", "b", "es");
  const profile = queryKeys.wines.aiProfile("wine", "es");
  for (const key of [reviews, comments, comparison, profile])
    cache.setQueryData(key, "cached");
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: cache }, children);
  const { result, unmount } = renderHook(() => useCommunityActions(), {
    wrapper,
  });
  vi.spyOn(communityService, "block")
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  await act(async () => {
    await expect(result.current.block.mutateAsync("author")).rejects.toThrow(
      "offline",
    );
  });
  expect(cache.getQueryData(reviews)).toBe("cached");
  await act(async () => {
    await result.current.block.mutateAsync("author");
  });
  expect(cache.getQueryData(reviews)).toBeUndefined();
  expect(cache.getQueryData(comments)).toBeUndefined();
  for (const key of [comparison, profile]) {
    expect(cache.getQueryData(key)).toBe("cached");
    expect(cache.getQueryState(key)?.isInvalidated).toBe(false);
  }
  unmount();
  cache.clear();
});

it("invalidates overview counts together with receipts after submitting a report", async () => {
  const cache = new QueryClient();
  const key = ["community", "reader", "overview"];
  cache.setQueryData(key, { reports: { open: 0 }, blockedUsers: 0 });
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: cache }, children);
  const { result, unmount } = renderHook(() => useCommunityActions(), {
    wrapper,
  });
  vi.spyOn(communityService, "report").mockResolvedValue({
    id: "case",
    target: { type: "USER", id: "author" },
    status: "OPEN",
    createdAt: new Date(),
  });
  await act(async () => {
    await result.current.report.mutateAsync({
      targetType: "USER",
      targetId: "author",
      reason: "SPAM",
      description: "Spam",
    });
  });
  expect(cache.getQueryState(key)?.isInvalidated).toBe(true);
  unmount();
  cache.clear();
});
