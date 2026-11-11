import type {
  AiWineProfile,
  ExtractedLabelData,
  PaginatedResult,
  Wine,
  WineComparison,
  WineReview,
  WineReviewComment,
  WineScanResult,
  WineSummary,
} from "./wine.types";

export type WineSummaryInput = {
  id: string;
  name: string;
  wineryName?: string | null;
  wineType: string;
  region?: string | null;
  country?: string | null;
  grapes?: string[] | null;
  vintage?: number | null;
  priceMin?: number | null;
  ratingAverage?: number | string | null;
  ratingCount?: number | null;
  imageUrl?: string | null;
  isNatural?: boolean | null;
  bottleImageUrl?: string | null;
  seoName?: string | null;
};

export type WineDetailsInput = WineSummaryInput & {
  wineryId?: string | null;
  alcoholContent?: number | null;
  style?: string | null;
  allergens?: string[] | null;
  descriptionEs?: string | null;
  descriptionEn?: string | null;
  profileOverview?: Wine["profileOverview"] | null;
  externalUrl?: string | null;
  foodPairing?: string | null;
  bestVintageYear?: number | null;
  bestVintageRating?: number | string | null;
  regionId?: string | null;
  regionName?: string | null;
  countryId?: string | null;
  countryName?: string | null;
  acidityScore?: number | null;
  tanninScore?: number | null;
  bodyScore?: number | null;
  sweetnessScore?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewerInput = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  totalReviews?: number | null;
  /** Seal tier key; null when hidden (locked or inactive user). */
  badgeTier?: string | null;
};

export type WineReviewInput = {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string;
  wineId: string;
  userId: string;
  username: string;
  userAvatarUrl?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  vintage?: number | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  likedByCurrentUser?: boolean | null;
  helpfulCount?: number | null;
  reviewer?: ReviewerInput | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type ReviewCommentInput = {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string;
  reviewId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  reviewer?: Omit<ReviewerInput, "totalReviews"> | null;
};

export type CompareResultInput = {
  summary?: string | null;
  similarities?: string[] | null;
  keyDifferences?: string[] | null;
  recommendation?: string | null;
  recommendationWineA?: string | null;
  recommendationWineB?: string | null;
  attributeComparison?: {
    attributes: Array<{
      name: string;
      wineAValue: string;
      wineBValue: string;
      wineAScore?: number;
      wineBScore?: number;
    }>;
  } | null;
  bestFor?: Record<string, string[]> | { wineA: string[]; wineB: string[] } | null;
  cached?: boolean;
  comparisonContent?: {
    summary?: string | null;
    similarities?: string[] | null;
    keyDifferences?: string[] | null;
    differences?: string[] | null;
    recommendation?: string | null;
    recommendationWineA?: string | null;
    recommendationWineB?: string | null;
    attributeComparison?: {
      attributes: Array<{
        name: string;
        wineAValue: string;
        wineBValue: string;
        wineAScore?: number;
        wineBScore?: number;
      }>;
    } | null;
    bestFor?: Record<string, string[]> | { wineA: string[]; wineB: string[] } | null;
  } | null;
};

export type AiWineProfileInput = {
  wineId: string;
  visualColorTone?: string | null;
  visualColorIntensity?: string | null;
  visualRimTone?: string | null;
  visualHighlights?: boolean;
  visualReflectionTones?: string[];
  /** Raw section art; validated by toProfileArt. */
  profileArt?: unknown;
  generatedAt: string;
  cached?: boolean;
  profileContent?: {
    summary?: string;
    visualAnalysis?: AiWineProfile["visualAnalysis"];
    aromaticProfile?: AiWineProfile["aromaticProfile"];
    palateAnalysis?: AiWineProfile["palateAnalysis"];
    flavorProfile?: AiWineProfile["flavorProfile"];
    foodPairings?: string[] | { pairings?: string[]; explanation?: string };
    servingRecommendations?: AiWineProfile["servingRecommendations"];
    idealOccasions?: string[];
    similarWines?: string[];
  };
};

export type PaginatedInput<T> = {
  items?: T[] | null;
  content?: T[] | null;
  totalItems?: number | null;
  totalElements?: number | null;
  totalPages?: number | null;
  pageNumber?: number | null;
  number?: number | null;
  pageSize?: number | null;
  size?: number | null;
  first?: boolean | null;
  last?: boolean | null;
  hasNext?: boolean | null;
  hasPrevious?: boolean | null;
};

export type WinesPageInput = PaginatedInput<WineSummaryInput>;
export type ReviewsPageInput = PaginatedInput<WineReviewInput>;

export type ExtractedLabelDataInput = {
  wineryName?: string | null;
  wineName?: string | null;
  grapeVariety?: string | null;
  vintage?: number | null;
  wineType?: string | null;
  region?: string | null;
  country?: string | null;
  alcoholContent?: string | null;
  confidence?: number | null;
  searchKeywords?: string | null;
  visualDescription?: string | null;
};

export type WineScanResultInput = {
  outcome?: "EXACT_MATCH" | "POSSIBLE_MATCHES" | "NO_MATCH";
  confidence: number;
  wine?: WineSummaryInput | null;
  suggestions?: WineSummaryInput[] | null;
  candidates?: Array<{ wine: WineSummaryInput; score: number }> | null;
  extractedData?: ExtractedLabelDataInput | null;
  scanId?: string | null;
};

export type {
  AiWineProfile,
  ExtractedLabelData,
  PaginatedResult,
  Wine,
  WineComparison,
  WineReview,
  WineReviewComment,
  WineScanResult,
  WineSummary,
};
