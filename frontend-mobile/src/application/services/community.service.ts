import { communityClient } from "@/infrastructure/api/clients/community.client";
import { copySupportReference } from "@/infrastructure/support/clipboard";
import type { ReportReceiptDto, CommunityPageDto } from "@/infrastructure/api/dto/community.dto";
import { DEFAULT_PUBLICATION_REJECTION_REASON } from "@/domain/community/community.types";
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
} from "@/domain/community/community.types";

function receipt(raw: ReportReceiptDto): ReportReceipt {
  return { id: raw.id, target: raw.target, status: raw.status, createdAt: new Date(raw.createdAt) };
}
function page<T, U>(raw: CommunityPageDto<T>, map: (item: T) => U): CommunityPage<U> {
  return { items: raw.content.map(map), totalItems: raw.totalItems, totalPages: raw.totalPages };
}
function counts(raw: ReportCounts): ReportCounts {
  return {
    open: raw.open,
    inReview: raw.inReview,
    resolved: raw.resolved,
    dismissed: raw.dismissed,
  };
}
/** Characters of a case id shown on screen; the full id is what gets copied for support. */
const SHORT_CASE_ID_LENGTH = 8;

export const communityService = {
  /** A short, readable case number ("3F9A2C1B") for the reporter's receipt. */
  shortCaseId(id: string): string {
    return id.slice(0, SHORT_CASE_ID_LENGTH).toUpperCase();
  },
  /** Copies the full case id so support can find the report; rejects when the clipboard fails. */
  copyCaseId(id: string): Promise<void> {
    return copySupportReference(id);
  },
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
    // The server rejects a reason code on approvals and requires one on rejections.
    const { reasonCode, ...decision } = input;
    await communityClient.decidePublication({
      ...decision,
      ...(input.status === "REJECTED"
        ? { reasonCode: reasonCode ?? DEFAULT_PUBLICATION_REJECTION_REASON }
        : {}),
      reason: input.reason.trim(),
    });
  },
  async report(input: ReportInput): Promise<ReportReceipt> {
    return receipt(
      await communityClient.report({ ...input, description: input.description.trim() }),
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
  async moderation(index: number, status: ReportStatus): Promise<CommunityPage<ModerationReport>> {
    return page(await communityClient.moderation(index, status), (raw) => ({
      id: raw.id,
      target: raw.target,
      status: raw.status,
      createdAt: new Date(raw.createdAt),
      authorId: raw.authorId,
      reason: raw.reason,
      description: raw.description,
      excerpt: raw.excerpt,
      reviewerId: raw.reviewerId,
      decision: raw.decision,
      authorUsername: raw.authorUsername ?? null,
      reviewerUsername: raw.reviewerUsername ?? null,
      targetLabel: raw.targetLabel ?? null,
      relatedTargetLabel: raw.relatedTargetLabel ?? null,
    }));
  },
  async remove(id: string, decision: string): Promise<void> {
    await communityClient.remove(id, decision.trim());
  },
  async decide(id: string, status: ReportStatus, decision: string): Promise<void> {
    await communityClient.decide(id, status, decision.trim());
  },
};
