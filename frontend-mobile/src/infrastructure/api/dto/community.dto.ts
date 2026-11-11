export interface ReportReceiptDto {
  id: string;
  target: { type: "REVIEW" | "COMMENT" | "USER" | "EVENT" | "WINE_ROUTE"; id: string };
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
export interface ModerationReportDto extends Omit<ReportReceiptDto, "target"> {
  target: { type: ReportReceiptDto["target"]["type"] | "WINE"; id: string };
  authorId: string | null;
  reason: ReportRequestDto["reason"] | "CATALOG_QUALITY";
  description: string;
  excerpt: string;
  reviewerId: string | null;
  decision: string | null;
  /** Null when the user or content was deleted; absent from APIs before #407. */
  authorUsername?: string | null;
  reviewerUsername?: string | null;
  /** Wine name (review, comment), event title, route name or username. */
  targetLabel?: string | null;
  /** Catalog quality reports (#544): the wine the member chose; absent from older APIs. */
  relatedTargetLabel?: string | null;
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
export interface PublicationDecisionDto {
  type: "REVIEW" | "COMMENT";
  id: string;
  status: "APPROVED" | "REJECTED";
  reasonCode?: "OFFENSIVE" | "SPAM" | "OFF_TOPIC" | "PERSONAL_DATA" | "OTHER";
  reason: string;
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
