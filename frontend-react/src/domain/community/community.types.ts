export type ReportTargetType =
  | "REVIEW"
  | "COMMENT"
  | "USER"
  | "EVENT"
  | "WINE_ROUTE";
export const reportReasons = [
  "SPAM",
  "HARASSMENT",
  "HATE",
  "SEXUAL_CONTENT",
  "VIOLENCE",
  "PRIVACY",
  "MISINFORMATION",
  "OTHER",
] as const;
export type ReportReason = (typeof reportReasons)[number];
/**
 * Moderation also shows reports Vinnot files itself: catalog quality reports
 * target a wine and have no reporter. Members can never choose these.
 */
export type ModerationTargetType = ReportTargetType | "WINE";
export type ModerationReason = ReportReason | "CATALOG_QUALITY";
export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
}
export interface ReportReceipt {
  id: string;
  target: { type: ReportTargetType; id: string };
  status: ReportStatus;
  createdAt: Date;
}
export interface ModerationReport extends Omit<ReportReceipt, "target"> {
  target: { type: ModerationTargetType; id: string };
  authorId: string | null;
  reason: ModerationReason;
  description: string;
  excerpt: string;
  reviewerId: string | null;
  decision: string | null;
  /** Names behind the ids; null when the server could not resolve them. */
  authorUsername: string | null;
  reviewerUsername: string | null;
  /** Wine name (review, comment, wine), event title, route name or username. */
  targetLabel: string | null;
  /** The wine a member picked instead of the matched one (catalog quality only). */
  relatedTargetId: string | null;
  relatedTargetLabel: string | null;
}
export interface BlockedUser {
  userId: string;
  username: string;
  blockedAt: Date;
}
export interface CommunityPage<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
}

export interface ReviewPublication {
  type: "REVIEW" | "COMMENT";
  id: string;
  wineId: string;
  authorId: string;
  title: string;
  content: string;
  rating: number | null;
  createdAt: Date;
  /** Exact server content revision; do not round through Date. */
  revision: string;
  /** Null when the server could not resolve the author or the wine. */
  authorUsername: string | null;
  wineName: string | null;
}
/**
 * Preset reasons a moderator gives the author when rejecting a publication, in
 * display order. The first one is preselected so rejecting never requires typing.
 */
export const PUBLICATION_REJECTION_REASONS = [
  "OFFENSIVE",
  "SPAM",
  "OFF_TOPIC",
  "PERSONAL_DATA",
  "OTHER",
] as const;
export type PublicationRejectionReason =
  (typeof PUBLICATION_REJECTION_REASONS)[number];
export const DEFAULT_PUBLICATION_REJECTION_REASON: PublicationRejectionReason =
  "OFFENSIVE";
export const MAX_PUBLICATION_NOTE_LENGTH = 2000;

interface PublicationDecisionBase {
  type: "REVIEW" | "COMMENT";
  id: string;
  /** Moderator note; only sent to the author when the reason is `OTHER`. */
  reason?: string;
  expectedRevision: string;
}
/** An approval never carries a reason code; a rejection always does. */
export type PublicationDecision = PublicationDecisionBase &
  (
    | { status: "APPROVED"; reasonCode?: never }
    | { status: "REJECTED"; reasonCode: PublicationRejectionReason }
  );

export interface ReportCounts {
  open: number;
  inReview: number;
  resolved: number;
  dismissed: number;
}
export interface CommunityOverview {
  reports: ReportCounts;
  blockedUsers: number;
}
