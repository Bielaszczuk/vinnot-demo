/** How points are earned (S2), as rows for "Tus puntos". */
import type { PointsSource } from "@/domain/points/points.types";

export interface PointsRule {
  source: PointsSource;
  /** i18n key under `points.rules`. */
  label: string;
  points: number;
  /** i18n key under `points.limits` and its count, when there is a limit. */
  limit: { key: string; count?: number };
}

export const POINTS_RULES: readonly PointsRule[] = [
  { source: "REVIEW", label: "review", points: 3, limit: { key: "oncePerWine" } },
  { source: "REVIEW_NOTE", label: "reviewNote", points: 2, limit: { key: "oncePerWine" } },
  { source: "LIKE_RECEIVED", label: "likeReceived", points: 1, limit: { key: "perDay", count: 5 } },
  { source: "COMMENT", label: "comment", points: 1, limit: { key: "perDay", count: 3 } },
  { source: "WINE_APPROVED", label: "wineApproved", points: 8, limit: { key: "outsideCap" } },
  { source: "SCAN_MATCH", label: "scanMatch", points: 1, limit: { key: "oncePerWinePerDay", count: 3 } },
  { source: "CELLAR_ADD", label: "cellarAdd", points: 1, limit: { key: "oncePerWinePerDay", count: 3 } },
  { source: "EVENT_REGISTRATION", label: "eventRegistration", points: 4, limit: { key: "oncePerEvent" } },
  { source: "PROFILE_COMPLETE", label: "profileComplete", points: 5, limit: { key: "once" } },
  { source: "FOLLOWER_GAINED", label: "followerGained", points: 1, limit: { key: "perDay", count: 10 } },
];
