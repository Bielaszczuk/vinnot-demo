import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cellarClient } from '@api/clients/cellar.client'
import { mapCellarEntryFromDto, mapCellarEntryFromDtoWithFallback } from '@domain/cellar/cellar.mappers'
import { cellarService } from './cellar.service'

vi.mock('@api/clients/cellar.client', () => ({
  cellarClient: {
    getCellar: vi.fn(), addWine: vi.fn(), removeWine: vi.fn(), updateWine: vi.fn(),
  },
}))

vi.mock('@domain/cellar/cellar.mappers', () => ({
  mapCellarEntryFromDto: vi.fn(),
  mapCellarEntryFromDtoWithFallback: vi.fn(),
}))

describe('cellarService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the cellar and normalizes optional add fields', async () => {
    vi.mocked(cellarClient.getCellar).mockResolvedValue([{ id: 'entry-1' }] as never)
    vi.mocked(mapCellarEntryFromDto).mockReturnValue({ id: 'entry-1' } as never)
    vi.mocked(cellarClient.addWine).mockResolvedValue({ id: 'entry-2' } as never)
    vi.mocked(mapCellarEntryFromDtoWithFallback).mockReturnValue({ id: 'entry-2' } as never)
    const wine = { id: 'wine-1' } as never

    await expect(cellarService.fetchCellar()).resolves.toEqual([{ id: 'entry-1' }])
    await expect(cellarService.addWine(wine)).resolves.toEqual({ id: 'entry-2' })
    expect(cellarClient.addWine).toHaveBeenCalledWith({
      wineId: 'wine-1', rating: null, purchasePrice: null, notes: null,
    })
    expect(mapCellarEntryFromDtoWithFallback).toHaveBeenCalledWith({ id: 'entry-2' }, wine)
  })

  it('normalizes updates and delegates quick-add and deletion', async () => {
    vi.mocked(cellarClient.updateWine).mockResolvedValue({ id: 'updated' } as never)
    vi.mocked(cellarClient.addWine).mockResolvedValue({ id: 'quick' } as never)
    vi.mocked(mapCellarEntryFromDto)
      .mockReturnValueOnce({ id: 'updated' } as never)
      .mockReturnValueOnce({ id: 'quick' } as never)

    await cellarService.updateWine('entry-1', { rating: 4 })
    await cellarService.quickAddWine({
      wineId: 'wine-1', rating: null, purchasePrice: null, notes: null,
    })
    await cellarService.removeWine('entry-1')

    expect(cellarClient.updateWine).toHaveBeenCalledWith('entry-1', {
      rating: 4, purchasePrice: null, notes: null,
    })
    expect(cellarClient.removeWine).toHaveBeenCalledWith('entry-1')
  })
  it('sends the tasted vintage when adding only when one is chosen', async () => {
    vi.mocked(cellarClient.addWine).mockResolvedValue({ id: 'entry' } as never)
    const wine = { id: 'wine-1' } as never

    await cellarService.addWine(wine, { vintage: 2018 })
    expect(cellarClient.addWine).toHaveBeenLastCalledWith({
      wineId: 'wine-1', rating: null, purchasePrice: null, notes: null, vintage: 2018,
    })

    await cellarService.quickAddWine({ wineId: 'wine-1', rating: 4, purchasePrice: null, notes: 'Nice', vintage: 2017 })
    expect(cellarClient.addWine).toHaveBeenLastCalledWith({
      wineId: 'wine-1', rating: 4, purchasePrice: null, notes: 'Nice', vintage: 2017,
    })

    await cellarService.quickAddWine({ wineId: 'wine-1', rating: 4, purchasePrice: null, notes: 'Nice', vintage: null })
    expect(cellarClient.addWine).toHaveBeenLastCalledWith({
      wineId: 'wine-1', rating: 4, purchasePrice: null, notes: 'Nice',
    })
  })

  it('sends a vintage, a clear, or no vintage field when updating', async () => {
    vi.mocked(cellarClient.updateWine).mockResolvedValue({ id: 'entry' } as never)

    await cellarService.updateWine('entry-1', { rating: 4, vintage: 2018 })
    expect(cellarClient.updateWine).toHaveBeenLastCalledWith('entry-1', {
      rating: 4, purchasePrice: null, notes: null, vintage: 2018,
    })

    await cellarService.updateWine('entry-1', { rating: 4, vintage: null })
    expect(cellarClient.updateWine).toHaveBeenLastCalledWith('entry-1', {
      rating: 4, purchasePrice: null, notes: null, clearVintage: true,
    })

    await cellarService.updateWine('entry-1', { rating: 4 })
    expect(cellarClient.updateWine).toHaveBeenLastCalledWith('entry-1', {
      rating: 4, purchasePrice: null, notes: null,
    })
  })
})
