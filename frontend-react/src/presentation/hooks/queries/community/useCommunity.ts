import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { communityService } from "@services/community.service";
import { useAuth } from "@hooks/useAuth";
import type {
  CommunityOverview,
  ReportCounts,
  ReportInput,
  ReportStatus,
} from "@domain/community/community.types";

export function useCommunityActions() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const refreshVisibility = async () => {
    await cache.resetQueries({
      predicate: (query) =>
        (query.queryKey[0] === "wines" && query.queryKey.includes("reviews")) ||
        query.queryKey[0] === "users",
    });
    await cache.invalidateQueries({ queryKey: ["community"] });
  };
  const report = useMutation({
    mutationFn: (input: ReportInput) => communityService.report(input),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ["community", user?.id] }),
  });
  const block = useMutation({
    mutationFn: (id: string) => communityService.block(id),
    onSuccess: refreshVisibility,
  });
  const unblock = useMutation({
    mutationFn: (id: string) => communityService.unblock(id),
    onSuccess: refreshVisibility,
  });
  return { user, report, block, unblock };
}
export function useMyCommunity(page: number, blocksPage = page) {
  const { user } = useAuth();
  const reports = useQuery({
    queryKey: ["community", user?.id, "reports", page],
    queryFn: () => communityService.reports(page),
    enabled: !!user,
  });
  const blocks = useQuery({
    queryKey: ["community", user?.id, "blocks", blocksPage],
    queryFn: () => communityService.blocks(blocksPage),
    enabled: !!user,
  });
  return { reports, blocks };
}
export function useCommunityModeration(page: number, status: ReportStatus) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const reports = useQuery({
    queryKey: ["community", user?.id, "moderation", status, page],
    queryFn: () => communityService.moderation(page, status),
    enabled: !!user,
  });
  const decide = useMutation({
    mutationFn: (input: {
      id: string;
      status: ReportStatus;
      decision: string;
    }) => communityService.decide(input.id, input.status, input.decision),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["community"] }),
  });
  const remove = useMutation({
    mutationFn: (input: { id: string; decision: string }) =>
      communityService.remove(input.id, input.decision),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["community"] });
      await cache.invalidateQueries({
        predicate: (query) =>
          (query.queryKey[0] === "wines" &&
            !query.queryKey.includes("comparison") &&
            !query.queryKey.includes("ai-profile")) ||
          query.queryKey[0] === "admin",
      });
    },
  });
  return { reports, decide, remove, user };
}

export function useReviewPublications(page: number) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const publications = useQuery({
    queryKey: ["community", user?.id, "publications", page],
    queryFn: () => communityService.publications(page),
    enabled: !!user?.roles.some(
      (role) => role === "ROLE_ADMIN" || role === "ROLE_MODERATOR",
    ),
  });
  const decide = useMutation({
    mutationFn: communityService.decidePublication,
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["community"] });
      await cache.invalidateQueries({
        predicate: (query) =>
          (query.queryKey[0] === "wines" &&
            !query.queryKey.includes("ai-profile") &&
            !query.queryKey.includes("ai-profile-status")) ||
          query.queryKey[0] === "admin" ||
          query.queryKey[0] === "users",
      });
    },
  });
  return { publications, decide };
}

export function useCommunityOverview(moderation = false) {
  const { user } = useAuth();
  return useQuery<CommunityOverview | ReportCounts>({
    queryKey: [
      "community",
      user?.id,
      moderation ? "moderationOverview" : "overview",
    ],
    queryFn: () =>
      moderation
        ? communityService.moderationOverview()
        : communityService.overview(),
    enabled:
      !!user &&
      (!moderation ||
        user.roles.some(
          (role) => role === "ROLE_ADMIN" || role === "ROLE_MODERATOR",
        )),
  });
}
