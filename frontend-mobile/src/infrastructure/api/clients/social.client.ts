/**
 * Social API Client — follows, suggestions, the following feed, public profiles and the
 * member's manual taste structure.
 * @architecture: Capa 4 — Infraestructura HTTP
 * @contract: issue #541, S7 (taste-traits adjustment S11).
 */
import { http } from "@/infrastructure/api/http";
import { resolveApiAssetUrl, resolveUserAssetUrls } from "@/infrastructure/api/resolveApiAssetUrl";
import type {
  ApiResponseDto,
  PublicUserProfileDto,
  TasteTraitsAdjustmentRequestDto,
} from "@/infrastructure/api/dto/users.dto";
import type {
  FollowUserDto,
  PageResultDto,
  PublicCellarWineDto,
  SocialWineDto,
  SuggestedUserDto,
  UserReviewDto,
} from "@/infrastructure/api/dto/social.dto";

/** Some user endpoints wrap their body in `{ data, timestamp }`; community ones do not. */
function unwrap<T>(body: T | ApiResponseDto<T>): T {
  return typeof body === "object" && body !== null && "data" in body && "timestamp" in body
    ? (body as ApiResponseDto<T>).data
    : (body as T);
}

function resolveWine<T extends SocialWineDto>(wine: T): T {
  return { ...wine, imageUrl: resolveApiAssetUrl(wine.imageUrl) };
}

function resolvePage<T>(
  body: PageResultDto<T> | ApiResponseDto<PageResultDto<T>>,
  map: (item: T) => T,
): PageResultDto<T> {
  const page = unwrap(body);
  const items = (page.items ?? page.content ?? []).map(map);
  return { ...page, items, content: items };
}

const resolveReview = (review: UserReviewDto): UserReviewDto => ({
  ...review,
  reviewer: resolveUserAssetUrls(review.reviewer),
  wine: resolveWine(review.wine),
});

const id = (value: string) => encodeURIComponent(value);
const OWN_TASTE_TRAITS_PATH = "/users/me/taste-traits";

export const socialApiClient = {
  /** Partial: a number sets the trait, null clears it. */
  adjustTasteTraits: (structure: TasteTraitsAdjustmentRequestDto["structure"]): Promise<void> =>
    http.put(OWN_TASTE_TRAITS_PATH, { structure } satisfies TasteTraitsAdjustmentRequestDto).then(() => undefined),

  /** Clears every manual value: the profile goes back to the calculated structure. */
  resetTasteTraits: (): Promise<void> => http.delete(OWN_TASTE_TRAITS_PATH).then(() => undefined),

  follow: (userId: string): Promise<void> =>
    http.put(`/community/follows/${id(userId)}`).then(() => undefined),

  unfollow: (userId: string): Promise<void> =>
    http.delete(`/community/follows/${id(userId)}`).then(() => undefined),

  followers: (userId: string, page: number, size: number): Promise<PageResultDto<FollowUserDto>> =>
    http
      .get<PageResultDto<FollowUserDto>>(`/community/users/${id(userId)}/followers`, { params: { page, size } })
      .then((response) => resolvePage(response.data, resolveUserAssetUrls)),

  following: (userId: string, page: number, size: number): Promise<PageResultDto<FollowUserDto>> =>
    http
      .get<PageResultDto<FollowUserDto>>(`/community/users/${id(userId)}/following`, { params: { page, size } })
      .then((response) => resolvePage(response.data, resolveUserAssetUrls)),

  suggestions: (size: number): Promise<SuggestedUserDto[]> =>
    http
      .get<SuggestedUserDto[]>("/community/suggestions", { params: { size } })
      .then((response) => unwrap(response.data).map(resolveUserAssetUrls)),

  feed: (page: number, size: number): Promise<PageResultDto<UserReviewDto>> =>
    http
      .get<PageResultDto<UserReviewDto>>("/community/feed", { params: { page, size } })
      .then((response) => resolvePage(response.data, resolveReview)),

  profile: (userId: string): Promise<PublicUserProfileDto> =>
    http
      .get<ApiResponseDto<PublicUserProfileDto>>(`/users/${id(userId)}/profile`)
      .then((response) => resolveUserAssetUrls(unwrap(response.data))),

  reviews: (userId: string, page: number, size: number): Promise<PageResultDto<UserReviewDto>> =>
    http
      .get<PageResultDto<UserReviewDto>>(`/users/${id(userId)}/reviews`, { params: { page, size } })
      .then((response) => resolvePage(response.data, resolveReview)),

  cellar: (userId: string, page: number, size: number): Promise<PageResultDto<PublicCellarWineDto>> =>
    http
      .get<PageResultDto<PublicCellarWineDto>>(`/users/${id(userId)}/cellar`, { params: { page, size } })
      .then((response) =>
        resolvePage(response.data, (item) => ({ ...item, wine: resolveWine(item.wine) })),
      ),
};
