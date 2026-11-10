import type { AdminWine, AdminWinePayload } from '@domain/admin/admin.types'

export const ADMIN_WINES_PAGE_SIZE = 20

export type AdminWineScores = {
  bodyScore: number | null
  tanninScore: number | null
  sweetnessScore: number | null
  acidityScore: number | null
}

export function createEmptyWineDraft(): Partial<AdminWine> {
  return {
    wineType: 'RED',
    isFeatured: false,
    isActive: true,
    grapes: [],
    allergens: [],
    priceMin: null,
    priceMax: null,
    descriptionEs: null,
    descriptionEn: null,
  }
}

export function createWineScores(wine: Partial<AdminWine>): AdminWineScores {
  return {
    bodyScore: wine.bodyScore ?? null,
    tanninScore: wine.tanninScore ?? null,
    sweetnessScore: wine.sweetnessScore ?? null,
    acidityScore: wine.acidityScore ?? null,
  }
}

export function buildAdminWinePayload(editingWine: Partial<AdminWine>, editingScores: AdminWineScores): AdminWinePayload {
  return {
    name: editingWine.name ?? '',
    wineType: editingWine.wineType || 'RED',
    wineryId: editingWine.wineryId ?? '',
    vintage: editingWine.vintage ?? null,
    style: editingWine.style || null,
    grapes: editingWine.grapes || [],
    allergens: editingWine.allergens || [],
    alcoholContent: editingWine.alcoholContent ?? null,
    descriptionEn: editingWine.descriptionEn || null,
    descriptionEs: editingWine.descriptionEs || null,
    imageUrl: editingWine.imageUrl || null,
    priceMin: editingWine.priceMin ?? null,
    priceMax: editingWine.priceMax ?? null,
    isFeatured: editingWine.isFeatured || false,
    isActive: editingWine.isActive !== undefined ? editingWine.isActive : true,
    ...{
      acidityScore: editingScores.acidityScore,
      tanninScore: editingScores.tanninScore,
      bodyScore: editingScores.bodyScore,
      sweetnessScore: editingScores.sweetnessScore,
    },
  }
}
