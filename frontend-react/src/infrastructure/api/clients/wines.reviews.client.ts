import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import { resolveApiAssetUrl, withReviewerAvatar } from '@infrastructure/http/resolveApiAssetUrl'
import type {
  CreateWineReviewRequestDto,
  ReviewCommentDto,
  UpdateWineReviewRequestDto,
  ReviewsPageResponseDto,
  WineReviewDto,
} from '@api/dto/wines.dto'

/** Author photos are resolved against the API host here, so every screen gets a loadable URL. */
function resolveReview(review: WineReviewDto): WineReviewDto {
  const resolved = withReviewerAvatar(review)
  return 'userAvatarUrl' in review ? { ...resolved, userAvatarUrl: resolveApiAssetUrl(review.userAvatarUrl) } : resolved
}

function resolveReviewsPage(page: ReviewsPageResponseDto): ReviewsPageResponseDto {
  return {
    ...page,
    ...(page.items ? { items: page.items.map(resolveReview) } : {}),
    ...(page.content ? { content: page.content.map(resolveReview) } : {}),
  }
}

export const winesReviewsClient = {
  async getWineReviews(
    wineId: string,
    params?: { page?: number; pageSize?: number; filter?: 'recent' | 'popular' | 'mine' },
  ): Promise<ReviewsPageResponseDto> {
    const response = await http.get<ReviewsPageResponseDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/reviews`,
      { params: { page: params?.page, size: params?.pageSize, filter: params?.filter } },
    )
    return resolveReviewsPage(response.data)
  },

  async createWineReview(wineId: string, data: CreateWineReviewRequestDto): Promise<WineReviewDto> {
    const response = await http.post<WineReviewDto>(`${API_ENDPOINTS.WINES}/${wineId}/reviews`, data)
    return resolveReview(response.data)
  },

  async updateWineReview(
    wineId: string,
    reviewId: string,
    data: UpdateWineReviewRequestDto,
  ): Promise<WineReviewDto> {
    const response = await http.patch<WineReviewDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}`,
      data,
    )
    return resolveReview(response.data)
  },

  async deleteWineReview(wineId: string, reviewId: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}`)
  },

  async markReviewHelpful(wineId: string, reviewId: string): Promise<boolean> {
    const response = await http.post<boolean>(`${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}/like`)
    return response.data
  },

  async unmarkReviewHelpful(wineId: string, reviewId: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}/like`)
  },

  async getMyReviewStatus(wineId: string): Promise<{ hasReview: boolean }> {
    const response = await http.get<{ hasReview: boolean }>(`${API_ENDPOINTS.WINES}/${wineId}/reviews/mine`)
    return response.data
  },

  async getReviewComments(wineId: string, reviewId: string): Promise<ReviewCommentDto[]> {
    const response = await http.get<ReviewCommentDto[]>(
      `${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}/comments`,
    )
    return response.data.map(withReviewerAvatar)
  },

  async addReviewComment(wineId: string, reviewId: string, content: string): Promise<ReviewCommentDto> {
    const response = await http.post<ReviewCommentDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}/comments`,
      { content },
    )
    return withReviewerAvatar(response.data)
  },

  async deleteReviewComment(wineId: string, reviewId: string, commentId: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.WINES}/${wineId}/reviews/${reviewId}/comments/${commentId}`)
  },
}
