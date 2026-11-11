/**
 * Social mappers — backend payloads → social domain models.
 * Input shapes mirror the S7 contract structurally, so the domain does not import DTOs.
 */
import { parseBadgeTier } from "@/domain/points/badgeTiers";
import { toWineType } from "@/domain/wine/wine.types";
import {
  TASTE_FAMILIES,
  TASTE_SCORE_MAX,
  TASTE_TRAITS,
  TASTE_TRAIT_MAX,
  TASTE_WHEEL_VIEWS,
  type FollowUser,
  type PublicCellarWine,
  type PublicProfile,
  type SocialPage,
  type SocialUser,
  type SocialWine,
  type SuggestedUser,
  type TasteFamily,
  type TasteFamilyShare,
  type TasteKind,
  type TasteSlice,
  type TasteTrait,
  type TasteTraitScore,
  type TasteTraits,
  type UserReview,
} from "./social.types";

type SocialUserInput = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  tier?: string | null;
};

type TasteSliceInput = {
  kind: string;
  value: string;
  label?: string | null;
  score: number;
  tone?: string | null;
  ratedWines?: number | null;
};

type TasteTraitsInput = {
  structure?: { trait: string; score: number; wines?: number | null; adjusted?: boolean | null }[] | null;
  families?: { family: string; percent: number }[] | null;
  fromQuiz?: boolean | null;
};

type PublicProfileInput = {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  roles?: string[];
  createdAt: string;
  bio?: string | null;
  tier?: string | null;
  followersCount?: number;
  followingCount?: number;
  reviewsCount?: number;
  cellarCount?: number | null;
  cellarVisible?: boolean;
  following?: boolean;
  followsYou?: boolean;
  affinityPercent?: number | null;
  tasteWheel?: TasteSliceInput[] | null;
  tasteTraits?: TasteTraitsInput | null;
};

type SocialWineInput = {
  id: string;
  name: string;
  imageUrl?: string | null;
  type?: string | null;
  wineryName?: string | null;
};

type UserReviewInput = {
  reviewId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  vintage?: number | null;
  createdAt: string;
  reviewer: SocialUserInput;
  wine: SocialWineInput;
};

type PublicCellarWineInput = {
  id: string;
  wine: SocialWineInput;
  vintage?: number | null;
  rating?: number | null;
  addedAt: string;
};

/** The backend page wrapper (items, pageNumber, totalItems, hasNext), or a plain PageResult. */
type PageInput<T> = {
  items?: T[];
  content?: T[];
  pageNumber?: number;
  page?: number;
  pageSize?: number;
  size?: number;
  totalItems?: number;
  totalElements?: number;
  totalPages?: number;
  hasNext?: boolean;
};

function displayNameOf(username: string, name?: string | null): string {
  return name?.trim() || username;
}

export function mapSocialUser(dto: SocialUserInput): SocialUser {
  return {
    id: dto.id,
    username: dto.username,
    displayName: displayNameOf(dto.username, dto.displayName),
    avatarUrl: dto.avatarUrl ?? null,
    tier: parseBadgeTier(dto.tier),
  };
}

export function mapFollowUser(dto: SocialUserInput & { following?: boolean }): FollowUser {
  return { ...mapSocialUser(dto), following: dto.following ?? false };
}

export function mapSuggestedUser(
  dto: SocialUserInput & { affinityPercent?: number | null; reviewsCount?: number },
): SuggestedUser {
  return {
    ...mapSocialUser(dto),
    affinityPercent: dto.affinityPercent ?? null,
    reviewsCount: dto.reviewsCount ?? 0,
  };
}

function isTasteKind(kind: string): kind is TasteKind {
  return (TASTE_WHEEL_VIEWS as readonly string[]).includes(kind);
}

/** Older payloads carry neither tone nor rated wines: they read as null and 0. */
function mapTasteSlice(dto: TasteSliceInput): TasteSlice | null {
  if (!isTasteKind(dto.kind)) return null;
  return {
    kind: dto.kind,
    value: dto.value,
    label: dto.label?.trim() || dto.value,
    score: Math.min(TASTE_SCORE_MAX, Math.max(0, dto.score)),
    tone: dto.tone?.trim().toUpperCase() || null,
    ratedWines: Math.max(0, Math.round(dto.ratedWines ?? 0)),
  };
}

export function mapPublicProfile(dto: PublicProfileInput): PublicProfile {
  return {
    id: dto.id,
    username: dto.username,
    displayName: displayNameOf(dto.username, dto.fullName),
    avatarUrl: dto.avatarUrl ?? null,
    tier: parseBadgeTier(dto.tier),
    bio: dto.bio ?? null,
    createdAt: new Date(dto.createdAt),
    followersCount: dto.followersCount ?? 0,
    followingCount: dto.followingCount ?? 0,
    reviewsCount: dto.reviewsCount ?? 0,
    cellarCount: dto.cellarCount ?? null,
    cellarVisible: dto.cellarVisible ?? false,
    following: dto.following ?? false,
    followsYou: dto.followsYou ?? false,
    affinityPercent: dto.affinityPercent ?? null,
    tasteWheel: dto.tasteWheel
      ? dto.tasteWheel.map(mapTasteSlice).filter((slice): slice is TasteSlice => slice !== null)
      : null,
    tasteTraits: dto.tasteTraits ? mapTasteTraits(dto.tasteTraits) : null,
  };
}

function clampTraitValue(value: number): number {
  return Math.min(TASTE_TRAIT_MAX, Math.max(0, value));
}

/** Drops unknown traits and families and values that are not numbers; families come highest first. */
function mapTasteTraits(dto: TasteTraitsInput): TasteTraits {
  const structure = (dto.structure ?? []).flatMap<TasteTraitScore>((row) =>
    (TASTE_TRAITS as readonly string[]).includes(row.trait) && Number.isFinite(row.score)
      ? [
          {
            trait: row.trait as TasteTrait,
            score: clampTraitValue(row.score),
            wines: Math.max(0, row.wines ?? 0),
            adjusted: row.adjusted === true,
          },
        ]
      : [],
  );
  const families = (dto.families ?? [])
    .flatMap<TasteFamilyShare>((row) =>
      (TASTE_FAMILIES as readonly string[]).includes(row.family) && Number.isFinite(row.percent)
        ? [{ family: row.family as TasteFamily, percent: clampTraitValue(row.percent) }]
        : [],
    )
    .sort((a, b) => b.percent - a.percent);
  return { structure, families, fromQuiz: dto.fromQuiz === true };
}

function mapSocialWine(dto: SocialWineInput): SocialWine {
  return {
    id: dto.id,
    name: dto.name,
    imageUrl: dto.imageUrl ?? null,
    type: toWineType(dto.type),
    wineryName: dto.wineryName ?? null,
  };
}

export function mapUserReview(dto: UserReviewInput): UserReview {
  return {
    id: dto.reviewId,
    rating: dto.rating,
    title: dto.title ?? null,
    comment: dto.comment ?? null,
    vintage: dto.vintage ?? null,
    createdAt: new Date(dto.createdAt),
    reviewer: mapSocialUser(dto.reviewer),
    wine: mapSocialWine(dto.wine),
  };
}

export function mapPublicCellarWine(dto: PublicCellarWineInput): PublicCellarWine {
  return {
    id: dto.id,
    wine: mapSocialWine(dto.wine),
    vintage: dto.vintage ?? null,
    rating: dto.rating ?? null,
    addedAt: new Date(dto.addedAt),
  };
}

export function mapSocialPage<T, U>(dto: PageInput<T>, map: (item: T) => U): SocialPage<U> {
  const page = dto.pageNumber ?? dto.page ?? 0;
  const totalPages = dto.totalPages ?? 0;
  return {
    items: (dto.items ?? dto.content ?? []).map(map),
    page,
    totalItems: dto.totalItems ?? dto.totalElements ?? 0,
    totalPages,
    hasMore: dto.hasNext ?? page + 1 < totalPages,
  };
}
