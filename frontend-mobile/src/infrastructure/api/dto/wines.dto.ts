/**
 * Wines DTOs — exact backend contract.
 * @contract: keep in sync with frontend-react/src/api/dto/wines.dto.ts
 */

export type WineTypeDto =
  | "red"
  | "white"
  | "rose"
  | "sparkling"
  | "dessert"
  | "fortified"
  | "orange"
  | "RED"
  | "WHITE"
  | "ROSE"
  | "SPARKLING"
  | "DESSERT"
  | "FORTIFIED"
  | "ORANGE";

export interface WineSummaryDto {
  id: string;
  name: string;
  vintage?: number | null;
  wineType: WineTypeDto;
  style?: string | null;
  grapes?: string[] | null;
  wineryName?: string | null;
  region?: string | null;
  country?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  imageUrl?: string | null;
  isFeatured?: boolean | null;
  isActive?: boolean | null;
  isNatural?: boolean | null;
  bottleImageUrl?: string | null;
  seoName?: string | null;
}

export interface WineDetailsDto extends WineSummaryDto {
  wineryId?: string | null;
  descriptionEs?: string | null;
 descriptionEn?: string | null;
  profileOverview?: Partial<Record<"es" | "en", {
    summary: string | null;
    acidityScore: number | null;
    tanninScore: number | null;
    bodyScore: number | null;
    sweetnessScore: number | null;
    foodPairings: string[];
  }>> | null;
  alcoholContent?: number | null;
  servingTempMin?: number | null;
  servingTempMax?: number | null;
  allergens?: string[] | null;
  externalUrl?: string | null;
  foodPairing?: string | null;
  bestVintageYear?: number | null;
  bestVintageRating?: number | null;
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
}

export interface WineReviewDto {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string;
  wineId: string;
  userId: string;
  username: string;
  userAvatarUrl?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  /** Tasted vintage; the nested wine vintage is the catalog one. */
  vintage?: number | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  likedByCurrentUser?: boolean | null;
  helpfulCount?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  reviewer?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    totalReviews?: number | null;
    /** Seal tier key (S1); null when the user is locked or inactive. */
    badgeTier?: string | null;
  } | null;
}

export interface CreateWineReviewRequestDto {
  rating: number;
  title?: string;
  comment?: string;
  vintage?: number;
}

/** PATCH keeps the stored vintage unless a new one is sent or clearVintage is true. */
export interface UpdateWineReviewRequestDto extends CreateWineReviewRequestDto {
  clearVintage?: boolean;
}

export interface ReviewCommentDto {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string;
  reviewId: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  reviewer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    badgeTier?: string | null;
  } | null;
}

export interface WineFilterDto {
  search?: string;
  type?: WineTypeDto;
  country?: string;
  region?: string;
  grapeVariety?: string;
  vintage?: number;
  wineryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  featured?: boolean;
  sortBy?: "name" | "vintage" | "priceMin" | "priceMax" | "ratingAverage";
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface WinesPageResponseDto {
  items?: WineSummaryDto[];
  content?: WineSummaryDto[];
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface ReviewsPageResponseDto {
  items?: WineReviewDto[];
  content?: WineReviewDto[];
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface PaginatedDto<T> {
  content?: T[];
  items?: T[];
  totalElements?: number;
  totalItems?: number;
  totalPages?: number;
  number?: number;
  pageNumber?: number;
  size?: number;
  pageSize?: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface CompareResultDto {
  wineAId: string;
  wineAName?: string;
  wineBId: string;
  wineBName?: string;
  language: string;
  comparisonContent: ComparisonContentDto;
  summary?: string;
  similarities?: string[];
  keyDifferences?: string[];
  attributeComparison?: ComparisonContentDto["attributeComparison"];
  bestFor?: ComparisonContentDto["bestFor"];
  recommendation?: string;
  recommendationWineA?: string;
  recommendationWineB?: string;
  tastingNotes?: ComparisonContentDto["tastingNotes"];
  chooseIf?: ComparisonContentDto["chooseIf"];
  pairings?: ComparisonContentDto["pairings"];
  serving?: ComparisonContentDto["serving"];
  aging?: ComparisonContentDto["aging"];
  value?: string | null;
  cached: boolean;
  generatedAt: string;
}

/** Comparison pieces added by #491; optional because cached legacy comparisons lack them. */
export interface ComparisonTastingNoteDto {
  identity?: string | null;
  appearance?: string | null;
  nose?: string | null;
  palate?: string | null;
  finish?: string | null;
}

export interface ComparisonPairingDto {
  dish?: string | null;
  why?: string | null;
}

export interface ComparisonServingDto {
  temperature?: string | null;
  decanting?: string | null;
}

export interface ComparisonContentDto {
  similarities?: string[];
  differences?: string[];
  keyDifferences?: string[];
  recommendation?: string;
  recommendationWineA?: string;
  recommendationWineB?: string;
  summary?: string;
  tastingNotes?: { wineA?: ComparisonTastingNoteDto | null; wineB?: ComparisonTastingNoteDto | null } | null;
  chooseIf?: Array<{ pick?: string | null; situation?: string | null; why?: string | null }> | null;
  pairings?: {
    wineA?: ComparisonPairingDto[] | null;
    wineB?: ComparisonPairingDto[] | null;
    shared?: ComparisonPairingDto | null;
  } | null;
  serving?: { wineA?: ComparisonServingDto | null; wineB?: ComparisonServingDto | null } | null;
  aging?: { wineA?: string | null; wineB?: string | null } | null;
  value?: string | null;
  attributeComparison?: {
    attributes: Array<{
      key?: string;
      name: string;
      wineAValue: string;
      wineBValue: string;
      wineAScore?: number;
      wineBScore?: number;
    }>;
  };
  bestFor?: {
    wineA: string[];
    wineB: string[];
  } | Record<string, string[]>;
}

export interface ComparisonAttributeDto {
  attribute: string;
  values: string[];
  winner_index?: number | null;
}

export interface AiWineProfileDto {
  wineId: string;
  /** Main hue of the visual color line, e.g. RED_GARNET; null when the line names no hue. */
  visualColorTone?: string | null;
  /** Depth of the color line's core: PALE, MEDIUM or DEEP; null when the line names none. */
  visualColorIntensity?: string | null;
  /** Rim tone of the visual color line, e.g. RED_TAWNY; null when the line names no other tone. */
  visualRimTone?: string | null;
  visualHighlights?: boolean;
  visualReflectionTones?: string[];
  /** Section illustrations, computed on read; null or absent on older responses. */
  profileArt?: ProfileArtDto | null;
  language?: string;
  profileContent?: AiProfileContentDto;
  cached?: boolean;
  generatedAt: string;
}

export interface ProfileArtItemDto {
  label: string;
  /** Illustration key, e.g. RASPBERRY or POULTRY; clients ignore keys they do not know. */
  art: string;
}

export interface ProfileArtDto {
  aromas?: ProfileArtItemDto[];
  flavors?: ProfileArtItemDto[];
  pairings?: ProfileArtItemDto[];
  serving?: {
    glass?: string | null;
    decant?: boolean;
    temperature?: { min: number; max: number } | null;
  } | null;
}

export interface AiProfileStatusDto {
  status: "NOT_REQUESTED" | "GENERATED" | string;
  generatedAt?: string | null;
}

export interface AiProfileContentDto {
  summary?: string;
  visualAnalysis?: {
    color: string;
    clarity: string;
    intensity: string;
    viscosity: string;
  };
  aromaticProfile?: {
    intensity: string;
    primaryAromas: string[];
    secondaryAromas?: string[];
    bouquet: string;
  };
  palateAnalysis?: {
    sweetness: string;
    sweetnessScore?: number;
    acidity: string;
    acidityScore?: number;
    tannin: string;
    tanninScore?: number;
    alcohol: string;
    body: string;
    bodyScore?: number;
    texture: string;
    balance: string;
  };
  flavorProfile?: {
    primaryFlavors: string[];
    secondaryFlavors?: string[];
    intensity: string;
    finish: string;
  };
  foodPairings?:
    | string[]
    | {
        pairings: string[];
        explanation?: string;
      };
  servingRecommendations?: {
    temperature: string;
    glassware: string;
    decanting: string;
    agingPotential: string;
  };
  idealOccasions?: string[];
  similarWines?: string[];
}

export interface WineScanResultDto {
  outcome?: "EXACT_MATCH" | "POSSIBLE_MATCHES" | "NO_MATCH";
  confidence: number;
  wine?: WineSummaryDto | null;
  suggestions?: WineSummaryDto[] | null;
  candidates?: Array<{ wine: WineSummaryDto; score: number }> | null;
  extractedData?: ExtractedLabelDataDto | null;
}

export interface WineSubmissionResultDto {
  submissionId: string;
  status:
    | "APPROVED"
    | "DUPLICATE"
    | "REJECTED"
    | "NEEDS_REVIEW"
    | "CHANGES_REQUESTED"
    | "PENDING";
  message: string;
  wine?: WineSummaryDto | null;
}

export interface WineSubmissionDetailsDto {
  id: string;
  wineName: string;
  wineryName: string;
  wineType?: string | null;
  vintage?: number | null;
  grapes?: string[] | null;
  country?: string | null;
  region?: string | null;
  alcoholContent?: number | null;
  notes?: string | null;
  imageUrl?: string | null;
  imageAvailable: boolean;
  status: WineSubmissionResultDto["status"];
  reviewReason?: string | null;
  reasonCode?: string | null;
  matchedWineId?: string | null;
  createdWineId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WineLabelImageAttachmentDto {
  wineId: string;
  imageUrl?: string | null;
  attached: boolean;
}

export interface WineSubmissionRequestDto {
  /** Label photo; null when the person sends the wine without one (it then goes to manual review). */
  imageUri: string | null;
  wineName: string;
  wineryName: string;
  /** Catalog picks; the matching name is always sent too for older backends. */
  wineryId?: string;
  wineType?: string;
  vintage?: number;
  grapes?: string[];
  country?: string;
  countryId?: string;
  region?: string;
  regionId?: string;
  alcoholContent?: number;
  notes?: string;
}

export interface ExtractedLabelDataDto {
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
}
