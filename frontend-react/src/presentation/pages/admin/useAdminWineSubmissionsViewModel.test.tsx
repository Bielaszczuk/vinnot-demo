import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminWine } from '@domain/admin/admin.types'
import { useAdminWineSubmissionsViewModel } from './useAdminWineSubmissionsViewModel'

const mocks = vi.hoisted(() => ({ toast: vi.fn(), decide: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/admin/useAdminSubmissionImage', () => ({ useAdminSubmissionImage: () => ({ url: null }) }))
vi.mock('@hooks/queries/admin/useAdminWineSubmissions', () => ({
  useAdminWineSubmissions: () => ({ data: { items: [], totalItems: 0 }, isLoading: false, isError: false, refetch: vi.fn() }),
  useAdminWineSubmission: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
}))
vi.mock('@hooks/queries/admin/useAdminWineSubmissionMutations', () => ({
  useDecideAdminWineSubmission: () => ({ mutateAsync: mocks.decide, isPending: false }),
}))

const NO_OVERRIDES = {
  targetWineId: undefined, wineName: undefined, wineryName: undefined, wineType: undefined,
  vintage: undefined, grapes: undefined, country: undefined, region: undefined, alcoholContent: undefined,
}
const targetWine = { id: 'wine-9', name: 'Gran Reserva', wineryName: 'Catena Zapata', vintage: 2019 } as AdminWine

function open() {
  const hook = renderHook(useAdminWineSubmissionsViewModel)
  act(() => hook.result.current.selectSubmission('submission-1'))
  return hook
}

describe('wine submission decision reasons', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.decide.mockResolvedValue(undefined) })

  it('preselects the first preset of each decision and sends its label as the reason', async () => {
    const { result } = open()
    expect(result.current.decisionReasons).toEqual(['VERIFIED_LABEL', 'NEW_TO_CATALOG', 'OTHER'])
    expect(result.current.reasonCode).toBe('VERIFIED_LABEL')
    act(() => result.current.setDecision('REJECT'))
    expect(result.current.decisionReasons).toEqual(['NOT_A_WINE', 'DUPLICATE_SUBMISSION', 'INAPPROPRIATE', 'OTHER'])
    expect(result.current.reasonCode).toBe('NOT_A_WINE')
    act(() => result.current.setReasonCode('INAPPROPRIATE'))
    await act(() => result.current.submitDecision())
    expect(mocks.decide).toHaveBeenCalledWith({
      id: 'submission-1',
      input: { decision: 'REJECT', reason: 'admin.submissions.reasons.INAPPROPRIATE', ...NO_OVERRIDES },
    })
  })

  it('asks for the text under Other before saving and never sends an empty reason', async () => {
    const { result } = open()
    act(() => result.current.setReasonCode('OTHER'))
    await act(() => result.current.submitDecision())
    expect(mocks.decide).not.toHaveBeenCalled()
    expect(result.current.errors).toEqual({ reason: 'admin.submissions.errors.reasonRequired' })
    act(() => result.current.setReasonNote('Typed reason'))
    expect(result.current.errors).toEqual({})
  })

  it('caps the reason at the 500 characters the backend accepts', async () => {
    const { result } = open()
    act(() => { result.current.setReasonCode('OTHER'); result.current.setReasonNote('x'.repeat(520)) })
    await act(() => result.current.submitDecision())
    expect(mocks.decide.mock.calls[0]![0].input.reason).toHaveLength(500)
  })

  it('resets the preset and drops the note when the decision changes', () => {
    const { result } = open()
    act(() => { result.current.setReasonCode('OTHER'); result.current.setReasonNote('Draft') })
    act(() => result.current.setDecision('REQUEST_CORRECTIONS'))
    expect(result.current.reasonCode).toBe('LABEL_UNREADABLE')
    expect(result.current.reasonNote).toBe('')
  })

  it('keeps the previous payload for an approval with a typed reason and typed corrections', async () => {
    const { result } = open()
    act(() => {
      result.current.setReasonCode('OTHER')
      result.current.setReasonNote('  Verified label  ')
      result.current.setCatalogOverride('wineName', ' Reserva ')
      result.current.setCatalogOverride('wineryName', 'Catena Zapata')
      result.current.setCatalogOverride('wineType', 'RED')
      result.current.setCatalogOverride('vintage', '2019')
      result.current.setCatalogOverride('grapes', ['Malbec', 'Cabernet Franc'])
      result.current.setCatalogOverride('country', 'Argentina')
      result.current.setCatalogOverride('region', 'Mendoza')
      result.current.setCatalogOverride('alcoholContent', '14.5')
    })
    await act(() => result.current.submitDecision())
    expect(mocks.decide).toHaveBeenCalledWith({
      id: 'submission-1',
      input: {
        decision: 'APPROVE_NEW', reason: 'Verified label', targetWineId: undefined,
        wineName: 'Reserva', wineryName: 'Catena Zapata', wineType: 'RED', vintage: 2019,
        grapes: ['Malbec', 'Cabernet Franc'], country: 'Argentina', region: 'Mendoza', alcoholContent: 14.5,
      },
    })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.submissions.decisionSaved' })
    expect(result.current.selectedId).toBeUndefined()
  })
})

describe('wine submission typed corrections', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.decide.mockResolvedValue(undefined) })

  it('accepts a comma as the decimal separator for the alcohol content', async () => {
    const { result } = open()
    act(() => result.current.setCatalogOverride('alcoholContent', '13,5'))
    await act(() => result.current.submitDecision())
    expect(mocks.decide.mock.calls[0]![0].input.alcoholContent).toBe(13.5)
  })

  it.each(['abc', '101', '-1'])('flags an alcohol content outside 0-100 instead of dropping it (%s)', async (value) => {
    const { result } = open()
    act(() => result.current.setCatalogOverride('alcoholContent', value))
    await act(() => result.current.submitDecision())
    expect(mocks.decide).not.toHaveBeenCalled()
    expect(result.current.errors).toEqual({ alcoholContent: 'admin.submissions.errors.alcoholRange' })
  })
})

describe('wine submission merge target', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.decide.mockResolvedValue(undefined) })

  it('requires a wine picked from the catalog before merging', async () => {
    const { result } = open()
    act(() => result.current.setDecision('MERGE_EXISTING'))
    await act(() => result.current.submitDecision())
    expect(mocks.decide).not.toHaveBeenCalled()
    expect(result.current.errors).toEqual({ targetWine: 'admin.submissions.errors.targetWineRequired' })
    act(() => result.current.setTargetWine(targetWine))
    expect(result.current.errors).toEqual({})
  })

  it('keeps the previous merge payload with the picked wine id', async () => {
    const { result } = open()
    act(() => result.current.setDecision('MERGE_EXISTING'))
    act(() => {
      result.current.setTargetWine(targetWine)
      result.current.setReasonCode('OTHER')
      result.current.setReasonNote('Same wine')
    })
    expect(result.current.targetWine).toBe(targetWine)
    await act(() => result.current.submitDecision())
    expect(mocks.decide).toHaveBeenCalledWith({
      id: 'submission-1',
      input: { ...NO_OVERRIDES, decision: 'MERGE_EXISTING', reason: 'Same wine', targetWineId: 'wine-9' },
    })
  })

  it('forgets the picked wine when another submission opens', () => {
    const { result } = open()
    act(() => { result.current.setDecision('MERGE_EXISTING'); result.current.setTargetWine(targetWine) })
    act(() => result.current.selectSubmission('submission-2'))
    expect(result.current.decision).toBe('APPROVE_NEW')
    expect(result.current.targetWine).toBeNull()
  })
})

describe('wine submission saving', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends one decision even when apply is pressed twice while saving', async () => {
    let finish: () => void = () => {}
    mocks.decide.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }))
    const { result } = open()
    let first: Promise<void> = Promise.resolve()
    act(() => { first = result.current.submitDecision(); void result.current.submitDecision() })
    await act(async () => { finish(); await first })
    expect(mocks.decide).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['SUBMISSION_CATALOG_DATA_INCOMPLETE', 422, 'admin.submissions.errors.catalogIncomplete'],
    ['SUBMISSION_IMAGE_REQUIRED', 422, 'admin.submissions.errors.imageRequired'],
    ['INVALID_SUBMISSION_TRANSITION', 422, 'admin.submissions.errors.alreadyReviewed'],
    ['NOT_FOUND', 404, 'admin.submissions.errors.notFound'],
    ['NETWORK_ERROR', 0, 'errors.api.network'],
    ['SOMETHING_ELSE', 500, 'admin.submissions.decisionError'],
  ])('explains the backend error %s and keeps the dialog open', async (code, status, message) => {
    mocks.decide.mockRejectedValue({ status, code, message: 'backend text' })
    const { result } = open()
    await act(() => result.current.submitDecision())
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message })
    expect(result.current.selectedId).toBe('submission-1')
  })
})
