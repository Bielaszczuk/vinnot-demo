export interface ReportReceiptDto {
  id: string;
  target: {
    type: "REVIEW" | "COMMENT" | "USER" | "EVENT" | "WINE_ROUTE";
    id: string;
  };
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}
export interface ReportRequestDto {
  targetType: ReportReceiptDto["target"]["type"];
  targetId: string;
  reason:
    | "SPAM"
    | "HARASSMENT"
    | "HATE"
    | "SEXUAL_CONTENT"
    | "VIOLENCE"
    | "PRIVACY"
    | "MISINFORMATION"
    | "OTHER";
  description: string;
}
export interface ModerationReportDto extends ReportReceiptDto {
  authorId: string | null;
  reason: ReportRequestDto["reason"];
  description: string;
  excerpt: string;
  reviewerId: string | null;
  decision: string | null;
  /** Null when the user or content was deleted; absent from APIs before #407. */
  authorUsername?: string | null;
  reviewerUsername?: string | null;
  /** Wine name (review, comment), event title, route name or username. */
  targetLabel?: string | null;
}
export interface BlockedUserDto {
  userId: string;
  username: string;
  blockedAt: string;
}
export interface CommunityPageDto<T> {
  content: T[];
  totalItems: number;
  totalPages: number;
}

export interface ReviewPublicationDto {
  type: "REVIEW" | "COMMENT";
  id: string;
  wineId: string;
  authorId: string;
  title: string;
  content: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  /** Null when the user or wine was deleted; absent from APIs before #407. */
  authorUsername?: string | null;
  wineName?: string | null;
}
export type PublicationRejectionReasonDto =
  | "OFFENSIVE"
  | "SPAM"
  | "OFF_TOPIC"
  | "PERSONAL_DATA"
  | "OTHER";
/** `reasonCode` is required for a rejection and must be absent for an approval (422 otherwise). */
export interface PublicationDecisionDto {
  type: "REVIEW" | "COMMENT";
  id: string;
  status: "APPROVED" | "REJECTED";
  reasonCode?: PublicationRejectionReasonDto;
  /** Internal note (max 2000); emailed to the author only with `OTHER`. */
  reason?: string;
  expectedRevision: string;
}

export interface ReportCountsDto {
  open: number;
  inReview: number;
  resolved: number;
  dismissed: number;
}
export interface CommunityOverviewDto {
  reports: ReportCountsDto;
  blockedUsers: number;
}
