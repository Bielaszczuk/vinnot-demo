import { skipToken } from "@reduxjs/toolkit/query";
import { useTypedQuery } from "@/presentation/store/api";
import { useOperationMutation } from "@/presentation/store/mutationAdapter";
import { useAuth } from "@/presentation/hooks/useAuth";
import type {
  CommunityOverview,
  ReportCounts,
  ReviewPublication,
  PublicationDecision,
  BlockedUser,
  CommunityPage,
  ModerationReport,
  ReportInput,
  ReportReceipt,
  ReportStatus,
} from "@/domain/community/community.types";

export function useCommunityActions() {
  const { user } = useAuth();
  const report = useOperationMutation<ReportReceipt, ReportInput>((input) => ({
    key: "community.report",
    params: { payload: input },
  }));
  const block = useOperationMutation<void, string>((id) => ({
    key: "community.block",
    params: { id },
  }));
  const unblock = useOperationMutation<void, string>((id) => ({
    key: "community.unblock",
    params: { id },
  }));
  return { user, report, block, unblock };
}
export function useMyCommunity(page: number, blocksPage = page) {
  const { user } = useAuth();
  const reports = useTypedQuery<CommunityPage<ReportReceipt>>(
    user ? { key: "community.reports", params: { page, viewer: user.id } } : skipToken,
  );
  const blocks = useTypedQuery<CommunityPage<BlockedUser>>(
    user ? { key: "community.blocks", params: { page: blocksPage, viewer: user.id } } : skipToken,
  );
  return {
    reports: {
      data: reports.currentData,
      isPending: !!user && (!!reports.isLoading || (!reports.currentData && !reports.isError)),
      isError: !!reports.isError,
      refetch: () => reports.refetch(),
    },
    blocks: {
      data: blocks.data,
      isPending: !!blocks.isLoading,
      isError: !!blocks.isError,
      refetch: () => blocks.refetch(),
    },
  };
}
export function useCommunityModeration(page: number, status: ReportStatus) {
  const { user } = useAuth();
  const reports = useTypedQuery<CommunityPage<ModerationReport>>(
    user ? { key: "community.moderation", params: { page, status, viewer: user.id } } : skipToken,
  );
  const decide = useOperationMutation<void, { id: string; status: ReportStatus; decision: string }>(
    (input) => ({ key: "community.decide", params: input }),
  );
  const remove = useOperationMutation<void, { id: string; decision: string }>((input) => ({
    key: "community.remove",
    params: input,
  }));
  return {
    reports: {
      data: reports.currentData,
      isPending: !!user && (!!reports.isLoading || (!reports.currentData && !reports.isError)),
      isError: !!reports.isError,
      refetch: () => reports.refetch(),
    },
    decide,
    remove,
    user,
  };
}

export function useReviewPublications(page: number) {
  const { user } = useAuth();
  const allowed = !!user?.roles.some((role) => role === "ROLE_ADMIN" || role === "ROLE_MODERATOR");
  const query = useTypedQuery<CommunityPage<ReviewPublication>>(
    allowed && user
      ? { key: "community.publications", params: { page, viewer: user.id } }
      : skipToken,
  );
  const decide = useOperationMutation<void, PublicationDecision>((input) => ({
    key: "community.publication.decide",
    params: { payload: input },
  }));
  return {
    publications: {
      data: query.currentData,
      isPending: allowed && (!!query.isLoading || (!query.currentData && !query.isError)),
      isError: !!query.isError,
      refetch: () => query.refetch(),
    },
    decide,
  };
}

export function useCommunityOverview(moderation = false) {
  const { user } = useAuth();
  const allowed =
    !!user &&
    (!moderation || user.roles.some((role) => role === "ROLE_ADMIN" || role === "ROLE_MODERATOR"));
  const query = useTypedQuery<CommunityOverview | ReportCounts>(
    allowed
      ? {
          key: moderation ? "community.moderationOverview" : "community.overview",
          params: { viewer: user.id },
        }
      : skipToken,
  );
  return {
    data: query.currentData,
    isPending: allowed && (!!query.isLoading || (!query.currentData && !query.isError)),
    isError: !!query.isError,
    refetch: () => query.refetch(),
  };
}
