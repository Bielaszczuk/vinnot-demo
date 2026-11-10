import type { WineColorIntensity, WineColorTone } from "./wine.color-tone";
import type { ProfileArt } from "./wine.profile-art";
/**
 * Wine domain types.
 * @contract: keep in sync with frontend-react/src/domain/wine/wine.types.ts
 */
import type { BadgeTier } from "@/domain/points/badgeTiers";

export type WineType =
  | "red"
  | "white"
  | "rose"
  | "sparkling"
  | "dessert"
  | "fortified"
  | "orange";

export const KNOWN_WINE_TYPES: readonly WineType[] = [
  "red",
  "white",
  "rose",
  "sparkling",
  "dessert",
  "fortified",
  "orange",
];

/** Normalizes a backend wine type code (`RED`, `ORANGE`, …); null when unknown. */
export function toWineType(code: string | null | undefined): WineType | null {
  const normalized = code?.trim().toLowerCase() as WineType | undefined;
  return normalized && KNOWN_WINE_TYPES.includes(normalized) ? normalized : null;
}

/** A wine type offered by the reference catalog, with its labels. */
export interface WineTypeOption {
  value: WineType;
  nameEs: string;
  nameEn: string;
}

export interface WineProfileOverview {
  summary: string | null;
  acidityScore: number | null;
  tanninScore: number | null;
  bodyScore: number | null;
  sweetnessScore: number | null;
  foodPairings: string[];
}

export interface Wine {
  profileOverview?: Partial<Record<"es" | "en", WineProfileOverview>>;
  catalogDescriptions?: { es?: string | null; en?: string | null };
  id: string;
  name: string;
  winery: string;
  wineryId: string | null;
  type: WineType;
  region: string;
  country: string;
  grapeVarieties: string[];
  vintage: number | null;
  alcoholContent: number | null;
  style: string | null;
  allergens: string[];
  price: number | null;
  rating: number | null;
  reviewCount: number;
  description: string;
  imageUrl: string | null;
  isNatural: boolean;
  bottleImageUrl: string | null;
  externalUrl: string | null;
  foodPairing: string | null;
  seoName: string | null;
  bestVintageYear: number | null;
  bestVintageRating: number | null;
  regionId: string | null;
  regionName: string | null;
  countryId: string | null;
  countryName: string | null;
  acidityScore: number | null;
  tanninScore: number | null;
  bodyScore: number | null;
  sweetnessScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WineSummary {
  id: string;
  name: string;
  winery: string;
  type: WineType;
  region: string;
  country: string;
  grapeVarieties: string[];
  vintage: number | null;
  price: number | null;
  rating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  isNatural: boolean;
  bottleImageUrl: string | null;
  seoName: string | null;
}

export interface WineReview {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string;
  wineId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  /** Tasted vintage, independent from the catalog wine vintage. */
  vintage: number | null;
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
  helpfulCount: number;
  reviewer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    totalReviews: number;
    badgeTier: BadgeTier | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Review fields the author submits. On update, vintage undefined keeps it, null clears it. */
export interface WineReviewDraftInput {
  rating: number;
  title?: string;
  comment?: string;
  vintage?: number | null;
}

export interface WineReviewComment {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string;
  reviewId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  reviewer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    badgeTier: BadgeTier | null;
  } | null;
}

export interface WineFilter {
  search?: string;
  type?: WineType;
  region?: string;
  country?: string;
  grapeVariety?: string;
  wineryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  vintage?: number;
  sortBy?: "name" | "price" | "rating" | "vintage" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface WineComparison {
  wines: Wine[];
  attributes: ComparisonAttribute[];
  aiSummary: string | null;
  summary?: string;
  similarities?: string[];
  keyDifferences?: string[];
  differences?: string[];
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
  };
  recommendation?: string;
  recommendationWineA?: string;
  recommendationWineB?: string;
  tastingNotes?: ComparisonPerWine<ComparisonTastingNote>;
  chooseIf?: ComparisonChoice[];
  pairings?: ComparisonPairings;
  serving?: ComparisonPerWine<ComparisonServing>;
  aging?: ComparisonPerWine<string>;
  value?: string;
  fromCache?: boolean;
}

export type ComparisonPick = "A" | "B";

export interface ComparisonPerWine<T> {
  wineA?: T;
  wineB?: T;
}

export interface ComparisonTastingNote {
  identity?: string;
  appearance?: string;
  nose?: string;
  palate?: string;
  finish?: string;
}

export interface ComparisonChoice {
  pick: ComparisonPick;
  situation: string;
  why?: string;
}

export interface ComparisonPairing {
  dish: string;
  why?: string;
}

export interface ComparisonPairings {
  wineA: ComparisonPairing[];
  wineB: ComparisonPairing[];
  shared?: ComparisonPairing;
}

export interface ComparisonServing {
  temperature?: string;
  decanting?: string;
}

export interface ComparisonAttribute {
  name: string;
  values: (string | number | null)[];
  winnerIndex: number | null;
}

export interface AiWineProfile {
  wineId: string;
  summary: string;
  /** Main hue of the visual color line; null when the line names no hue. */
  visualColorTone?: WineColorTone | null;
  /** Depth of the color line's core; null when the line names none. */
  visualColorIntensity?: WineColorIntensity | null;
  /** Rim tone of the visual color line; null when the line names no other tone. */
  visualRimTone?: WineColorTone | null;
  /** The color line names reflections, glints or a rim: the stroke edges turn to that tone and back. */
  visualHighlights?: boolean;
  /** Every reflection tone the color line names, in order. */
  visualReflectionTones?: WineColorTone[];
  /** Section illustrations; null when the response carries none. Unknown keys are dropped. */
  profileArt?: ProfileArt | null;
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
  foodPairings?: {
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
  generatedAt: Date;
  fromCache?: boolean;
}

export interface AiProfileStatus {
  status: "NOT_REQUESTED" | "GENERATED" | string;
  generatedAt?: string | null;
}

export interface WineScanResult {
  outcome: "EXACT_MATCH" | "POSSIBLE_MATCHES" | "NO_MATCH";
  confidence: number;
  wine: WineSummary | null;
  suggestions: WineSummary[];
  candidates: WineScanCandidate[];
  extractedData: ExtractedLabelData | null;
}

export interface WineLabelScanInput {
  imageUri: string;
  observedText: string[];
}

export interface WineScanCandidate {
  wine: WineSummary;
  score: number;
}

export interface ExtractedLabelData {
  wineryName: string | null;
  wineName: string | null;
  grapeVariety: string | null;
  vintage: number | null;
  wineType: string | null;
  region: string | null;
  country: string | null;
  alcoholContent: string | null;
  confidence: number;
  searchKeywords: string | null;
  visualDescription: string | null;
}

export interface WineSubmissionInput {
  /** Label photo; null when the person sends the wine without one (it then goes to manual review). */
  imageUri: string | null;
  wineName: string;
  wineryName: string;
  /** Set when the value was picked from the catalog; a name without id is a proposed new value. */
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

export interface WineSubmissionResult {
  submissionId: string;
  status: WineSubmissionStatus;
  message: string;
  wine: WineSummary | null;
}

export type WineSubmissionStatus =
  | "APPROVED"
  | "DUPLICATE"
  | "REJECTED"
  | "NEEDS_REVIEW"
  | "CHANGES_REQUESTED"
  | "PENDING";

export interface WineSubmission {
  id: string;
  wineName: string;
  wineryName: string;
  wineType: string | null;
  vintage: number | null;
  grapes: string[];
  country: string | null;
  region: string | null;
  alcoholContent: number | null;
  notes: string | null;
  imageUrl: string | null;
  imageAvailable: boolean;
  status: WineSubmissionStatus;
  reviewReason: string | null;
  /** Automatic review reason as a stable code (null when a moderator wrote the reason). */
  reasonCode: string | null;
  matchedWineId: string | null;
  createdWineId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WineLabelImageAttachmentInput {
  wineId: string;
  imageUri: string;
  observedText: string[];
}

export interface WineLabelImageAttachmentResult {
  wineId: string;
  imageUrl: string | null;
  attached: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  size: number;
  isFirst: boolean;
  isLast: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}
