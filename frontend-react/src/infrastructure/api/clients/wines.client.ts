import { winesAiClient } from './wines.ai.client'
import { winesCoreClient } from './wines.core.client'
import { winesFavoritesClient } from './wines.favorites.client'
import { winesReviewsClient } from './wines.reviews.client'

export const winesClient = {
  ...winesCoreClient,
  ...winesReviewsClient,
  ...winesAiClient,
  ...winesFavoritesClient,
}

export default winesClient
