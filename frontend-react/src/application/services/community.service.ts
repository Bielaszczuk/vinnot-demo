import { communityClient } from "@api/clients/community.client";
import type {
  ReportReceiptDto,
  CommunityPageDto,
} from "@api/dto/community.dto";
import type {
  CommunityOverview,
  ReportCounts,
  ReviewPublication,
  PublicationDecision,
  ReportInput,
  ReportReceipt,
  ReportStatus,
  ModerationReport,
  BlockedUser,
  CommunityPage,
} from "@domain/community/community.types";

function receipt(raw: ReportReceiptDto): ReportReceipt {
  return {
    id: raw.id,
    target: raw.target,
    status: raw.status,
    createdAt: new Date(raw.createdAt),
  };
}
function page<T, U>(
  raw: CommunityPageDto<T>,
  map: (item: T) => U,
): CommunityPage<U> {
  return {
    items: raw.content.map(map),
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
  };
}
function counts(raw: ReportCounts): ReportCounts {
  return {
    open: raw.open,
    inReview: raw.inReview,
    resolved: raw.resolved,
    dismissed: raw.dismissed,
  };
}
export const communityService = {
  async overview(): Promise<CommunityOverview> {
    const raw = await communityClient.overview();
    return { reports: counts(raw.reports), blockedUsers: raw.blockedUsers };
  },
  async moderationOverview(): Promise<ReportCounts> {
    return counts(await communityClient.moderationOverview());
  },
  async publications(index: number): Promise<CommunityPage<ReviewPublication>> {
    return page(await communityClient.publications(index), (raw) => ({
      type: raw.type,
      id: raw.id,
      wineId: raw.wineId,
      authorId: raw.authorId,
      title: raw.title,
      content: raw.content,
      rating: raw.rating,
      createdAt: new Date(raw.createdAt),
      revision: raw.updatedAt,
      authorUsername: raw.authorUsername ?? null,
      wineName: raw.wineName ?? null,
    }));
  },
  async decidePublication(input: PublicationDecision): Promise<void> {
    const reason = input.reason?.trim();
    await communityClient.decidePublication({
      type: input.type,
      id: input.id,
      status: input.status,
      ...(input.status === "REJECTED" && { reasonCode: input.reasonCode }),
      ...(reason && { reason }),
      expectedRevision: input.expectedRevision,
    });
  },
  async report(input: ReportInput): Promise<ReportReceipt> {
    return receipt(
      await communityClient.report({
        ...input,
        description: input.description.trim(),
      }),
    );
  },
  async reports(index: number): Promise<CommunityPage<ReportReceipt>> {
    return page(await communityClient.reports(index), receipt);
  },
  async blocks(index: number): Promise<CommunityPage<BlockedUser>> {
    return page(await communityClient.blocks(index), (raw) => ({
      userId: raw.userId,
      username: raw.username,
      blockedAt: new Date(raw.blockedAt),
    }));
  },
  block: (id: string) => communityClient.block(id),
  unblock: (id: string) => communityClient.unblock(id),
  async moderation(
    index: number,
    status: ReportStatus,
  ): Promise<CommunityPage<ModerationReport>> {
    return page(await communityClient.moderation(index, status), (raw) => ({
      ...receipt(raw),
      authorId: raw.authorId,
      reason: raw.reason,
      description: raw.description,
      excerpt: raw.excerpt,
      reviewerId: raw.reviewerId,
      decision: raw.decision,
      authorUsername: raw.authorUsername ?? null,
      reviewerUsername: raw.reviewerUsername ?? null,
      targetLabel: raw.targetLabel ?? null,
    }));
  },
  async remove(id: string, decision: string): Promise<void> {
    await communityClient.remove(id, decision.trim());
  },
  async decide(
    id: string,
    status: ReportStatus,
    decision: string,
  ): Promise<void> {
    await communityClient.decide(id, status, decision.trim());
  },
};
