import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminWineSubmissionsPage } from './AdminWineSubmissionsPage'

const viewModel = vi.hoisted(() => vi.fn())
const lookups = vi.hoisted(() => ({
  wines: vi.fn(),
  winerySearch: { query: '', setQuery: vi.fn(), results: [] as unknown[], loading: false, minQueryLength: 2 },
}))
vi.mock('./useAdminWineSubmissionsViewModel', () => ({ useAdminWineSubmissionsViewModel: viewModel }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options?.value !== undefined ? `${key}:${String(options.value)}` : key),
    i18n: { language: 'es-AR' },
  }),
}))
vi.mock('@hooks/useDebounce', () => ({ useDebounce: (value: unknown) => value }))
vi.mock('@hooks/queries/admin/useAdminWines', () => ({ useAdminWines: lookups.wines }))
vi.mock('@hooks/queries/admin/useAdminWineryPickerSearch', () => ({ useAdminWineryPickerSearch: () => lookups.winerySearch }))
vi.mock('@hooks/queries/wine/useWineTypes', () => ({
  useWineTypes: () => ({ data: [
    { code: 'RED', value: 'red', names: { es: 'Tinto', en: 'Red' } },
    { code: 'WHITE', value: 'white', names: { es: 'Blanco', en: 'White' } },
  ] }),
}))
vi.mock('@hooks/queries/wine/useCountries', () => ({
  useCountries: () => ({ data: [{ id: 'ar', code: 'AR', name: 'Argentina' }, { id: 'cl', code: 'CL', name: 'Chile' }] }),
}))
vi.mock('@hooks/queries/wine/useRegions', () => ({
  useRegions: () => ({ data: [
    { id: 'm', name: 'Mendoza', countryId: 'ar', countryCode: 'AR', countryName: 'Argentina' },
    { id: 'c', name: 'Colchagua', countryId: 'cl', countryCode: 'CL', countryName: 'Chile' },
  ] }),
}))
vi.mock('@hooks/queries/wine/useGrapeTypes', () => ({
  useGrapeTypes: () => ({ data: [{ id: 'g1', name: 'Malbec' }, { id: 'g2', name: 'Syrah' }], isLoading: false }),
}))
afterEach(cleanup)

const submission = {
  id: 'submission-1', submittedBy: 'private-user-uuid', submittedByUsername: 'wine.contributor',
  wineName: 'Reserva', wineryName: 'Winery', status: 'NEEDS_REVIEW', wineType: 'RED', vintage: 2019,
  country: 'Argentina', region: 'Mendoza', alcoholContent: 14, createdAt: '2026-10-13T12:00:00Z', grapes: ['Malbec'],
}
const OVERRIDES = { wineName: '', wineryName: '', wineType: '', vintage: '', grapes: [], country: '', region: '', alcoholContent: '' }
const actions = {
  setDecision: vi.fn(), setReasonCode: vi.fn(), setReasonNote: vi.fn(), setTargetWine: vi.fn(),
  setCatalogOverride: vi.fn(), submitDecision: vi.fn(), closeDetail: vi.fn(),
}

function renderPage(overrides: Record<string, unknown> = {}) {
  viewModel.mockReturnValue({
    t: (key: string) => key, status: 'NEEDS_REVIEW', search: '',
    submissions: [submission], selectedId: submission.id, submission,
    page: 0, totalPages: 1, totalItems: 1,
    image: { url: null }, catalogValues: [],
    decision: 'APPROVE_NEW', decisionReasons: ['VERIFIED_LABEL', 'NEW_TO_CATALOG', 'OTHER'], reasonCode: 'VERIFIED_LABEL',
    reasonNote: '', targetWine: null, catalogOverrides: OVERRIDES, errors: {}, isDeciding: false,
    ...actions, ...overrides,
  })
  render(<MemoryRouter><AdminWineSubmissionsPage /></MemoryRouter>)
  return within(screen.getByRole('dialog'))
}

beforeEach(() => {
  vi.clearAllMocks()
  lookups.wines.mockReturnValue({ data: { items: [], totalItems: 0 }, isFetching: false })
})

describe('wine submission author presentation', () => {
  it.each(['wine.contributor', null])('shows the author in the list and detail, including missing accounts (%s)', (username) => {
    const dialog = renderPage({ submission: { ...submission, submittedByUsername: username }, submissions: [{ ...submission, submittedByUsername: username }] })
    const author = username ? `@${username}` : 'admin.submissions.unknownAuthor'
    expect(within(screen.getByRole('table')).getByText(author)).toBeInTheDocument()
    expect(dialog.getByText(author)).toBeInTheDocument()
    expect(screen.queryByText(submission.submittedBy)).not.toBeInTheDocument()
  })

  it('marks each value as an existing catalog entry or a proposed new one', () => {
    const dialog = renderPage({
      catalogValues: [
        { field: 'winery', value: 'Catena Zapata', proposed: false },
        { field: 'grape', value: 'Uva Nueva', proposed: true },
      ],
    })
    const winery = dialog.getByText('admin.submissions.catalog.winery:').closest('li')
    const grape = dialog.getByText('admin.submissions.catalog.grape:').closest('li')
    expect(winery).toHaveTextContent('Catena Zapata')
    expect(winery).toHaveTextContent('admin.submissions.catalog.existing')
    expect(grape).toHaveTextContent('Uva Nueva')
    expect(grape).toHaveTextContent('admin.submissions.catalog.proposed')
  })
})

describe('wine submission decision', () => {
  it('offers the four decisions as labelled radio cards with what each one does', () => {
    const dialog = renderPage()
    const group = dialog.getByRole('radiogroup', { name: 'admin.submissions.decisionLabel' })
    const cards = within(group).getAllByRole('radio')
    expect(cards.map((card) => card.getAttribute('value'))).toEqual(['APPROVE_NEW', 'MERGE_EXISTING', 'REQUEST_CORRECTIONS', 'REJECT'])
    expect(within(group).getByRole('radio', { name: /admin\.submissions\.decision\.APPROVE_NEW/ })).toBeChecked()
    expect(within(group).getByText('admin.submissions.decisionHelp.REJECT')).toBeInTheDocument()
    fireEvent.click(within(group).getByRole('radio', { name: /admin\.submissions\.decision\.REJECT/ }))
    expect(actions.setDecision).toHaveBeenCalledWith('REJECT')
  })

  it('names the apply button after the decision and applies it', () => {
    const dialog = renderPage({ decision: 'REJECT', decisionReasons: ['NOT_A_WINE', 'OTHER'], reasonCode: 'NOT_A_WINE' })
    fireEvent.click(dialog.getByRole('button', { name: 'admin.submissions.decision.REJECT' }))
    expect(actions.submitDecision).toHaveBeenCalled()
  })

  it('locks the form and shows the saving state while the decision is sent', () => {
    const dialog = renderPage({ isDeciding: true })
    expect(dialog.getByRole('button', { name: 'common.saving' })).toBeDisabled()
    expect(dialog.getByRole('radio', { name: /admin\.submissions\.decision\.REJECT/ })).toBeDisabled()
    expect(dialog.getByLabelText('admin.submissions.wineNameOverride')).toBeDisabled()
  })
})

describe('wine submission reasons', () => {
  it('offers the presets of the chosen decision without a free-text box', () => {
    const dialog = renderPage({ decision: 'REJECT', decisionReasons: ['NOT_A_WINE', 'DUPLICATE_SUBMISSION', 'INAPPROPRIATE', 'OTHER'], reasonCode: 'NOT_A_WINE' })
    const group = dialog.getByRole('group', { name: 'admin.submissions.reasonLabel' })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['NOT_A_WINE', 'DUPLICATE_SUBMISSION', 'INAPPROPRIATE', 'OTHER'])
    expect(within(group).getByRole('radio', { name: 'admin.submissions.reasons.NOT_A_WINE' })).toBeChecked()
    expect(dialog.queryByRole('textbox', { name: 'admin.submissions.reasonNote' })).not.toBeInTheDocument()
    fireEvent.click(within(group).getByRole('radio', { name: 'admin.submissions.reasons.INAPPROPRIATE' }))
    expect(actions.setReasonCode).toHaveBeenCalledWith('INAPPROPRIATE')
  })

  it('asks for free text only under Other, limited to 500 characters, with its error inline', () => {
    const dialog = renderPage({ reasonCode: 'OTHER', errors: { reason: 'admin.submissions.errors.reasonRequired' } })
    const note = dialog.getByRole('textbox', { name: 'admin.submissions.reasonNote' })
    expect(note).toHaveAttribute('maxLength', '500')
    fireEvent.change(note, { target: { value: 'Label from another winery' } })
    expect(actions.setReasonNote).toHaveBeenCalledWith('Label from another winery')
    expect(dialog.getByText('admin.submissions.errors.reasonRequired')).toBeInTheDocument()
    expect(dialog.getByRole('alert')).toHaveTextContent('admin.submissions.errors.summary')
  })
})

describe('wine submission merge target', () => {
  const merge = { decision: 'MERGE_EXISTING', decisionReasons: ['ALREADY_IN_CATALOG', 'OTHER'], reasonCode: 'ALREADY_IN_CATALOG' }
  const wine = { id: 'wine-9', name: 'Gran Reserva', wineryName: 'Catena Zapata', vintage: 2019 }

  it('searches the catalog by name instead of asking for a wine id', () => {
    lookups.wines.mockReturnValue({ data: { items: [wine], totalItems: 1 }, isFetching: false })
    const dialog = renderPage(merge)
    expect(dialog.queryByPlaceholderText('admin.submissions.targetWinePlaceholder')).not.toBeInTheDocument()
    const picker = dialog.getByRole('combobox', { name: 'admin.submissions.targetWine' })
    fireEvent.change(picker, { target: { value: 'Gran' } })
    expect(lookups.wines).toHaveBeenLastCalledWith(0, 10, 'Gran')
    const option = dialog.getByRole('option', { name: /Gran Reserva/ })
    expect(option).toHaveTextContent('Catena Zapata · 2019')
    fireEvent.mouseDown(option)
    expect(actions.setTargetWine).toHaveBeenCalledWith(wine)
  })

  it('does not search until two characters are typed and shows the picked wine', () => {
    const dialog = renderPage({ ...merge, targetWine: wine, errors: { targetWine: 'admin.submissions.errors.targetWineRequired' } })
    expect(lookups.wines).toHaveBeenLastCalledWith(0, 10, undefined)
    expect(dialog.getByText('forms.entityPicker.selected')).toBeInTheDocument()
    expect(dialog.getByText('admin.submissions.errors.targetWineRequired')).toBeInTheDocument()
    expect(dialog.queryByLabelText('admin.submissions.wineNameOverride')).not.toBeInTheDocument()
  })
})

describe('wine submission typed corrections', () => {
  it('labels every correction and shows what the user submitted as the unchanged choice', () => {
    const dialog = renderPage()
    expect(dialog.getByLabelText('admin.submissions.wineNameOverride')).toHaveAttribute('placeholder', 'Reserva')
    expect(dialog.getByRole('combobox', { name: 'admin.submissions.wineryOverride' })).toHaveAttribute('placeholder', 'Winery')
    const type = dialog.getByLabelText('admin.submissions.wineTypeOverride')
    expect(within(type).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'admin.submissions.keepSubmitted:wines.types.red', 'wines.types.red', 'wines.types.white',
    ])
    const vintage = dialog.getByLabelText('admin.submissions.vintageOverride')
    expect(within(vintage).getAllByRole('option')[0]).toHaveTextContent('admin.submissions.keepSubmitted:2019')
    expect(within(vintage).getByRole('option', { name: '2015' })).toBeInTheDocument()
    expect(dialog.getByLabelText('admin.submissions.countryOverride')).toHaveTextContent('Chile')
    const region = dialog.getByLabelText('admin.submissions.regionOverride')
    expect(within(region).getAllByRole('option').map((option) => option.textContent)).toEqual(['admin.submissions.keepSubmitted:Mendoza', 'Mendoza'])
    expect(dialog.getByLabelText('admin.submissions.alcoholOverride')).toHaveAttribute('inputMode', 'decimal')
    expect(dialog.getByRole('combobox', { name: 'admin.submissions.grapesOverride' })).toBeInTheDocument()
  })

  it('sends each correction as typed: codes for the type, names for the origin', () => {
    const dialog = renderPage()
    fireEvent.change(dialog.getByLabelText('admin.submissions.wineNameOverride'), { target: { value: 'Gran Reserva' } })
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('wineName', 'Gran Reserva')
    fireEvent.change(dialog.getByLabelText('admin.submissions.wineTypeOverride'), { target: { value: 'WHITE' } })
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('wineType', 'WHITE')
    fireEvent.change(dialog.getByLabelText('admin.submissions.vintageOverride'), { target: { value: '2015' } })
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('vintage', '2015')
    fireEvent.change(dialog.getByLabelText('admin.submissions.countryOverride'), { target: { value: 'Chile' } })
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('country', 'Chile')
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('region', '')
    fireEvent.change(dialog.getByLabelText('admin.submissions.alcoholOverride'), { target: { value: '13,5' } })
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('alcoholContent', '13,5')
    const grapes = dialog.getByRole('combobox', { name: 'admin.submissions.grapesOverride' })
    fireEvent.focus(grapes)
    fireEvent.mouseDown(dialog.getByRole('option', { name: 'Syrah' }))
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('grapes', ['Syrah'])
  })

  it('lists the regions of the corrected country and flags an invalid alcohol content', () => {
    const dialog = renderPage({
      catalogOverrides: { ...OVERRIDES, country: 'Chile', region: 'Colchagua' },
      errors: { alcoholContent: 'admin.submissions.errors.alcoholRange' },
    })
    const region = dialog.getByLabelText('admin.submissions.regionOverride')
    expect(region).toHaveValue('Colchagua')
    expect(within(region).queryByRole('option', { name: 'Mendoza' })).not.toBeInTheDocument()
    expect(dialog.getByText('admin.submissions.errors.alcoholRange')).toBeInTheDocument()
  })

  it('picks a catalog winery, or uses the typed name as a new one', () => {
    lookups.winerySearch.query = 'Cat'
    lookups.winerySearch.results = [{ id: 'w1', name: 'Catena Zapata', countryName: 'Argentina', regionName: 'Mendoza' }]
    const dialog = renderPage()
    const winery = dialog.getByRole('combobox', { name: 'admin.submissions.wineryOverride' })
    fireEvent.focus(winery)
    fireEvent.mouseDown(dialog.getByRole('option', { name: /Catena Zapata/ }))
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('wineryName', 'Catena Zapata')
    expect(lookups.winerySearch.setQuery).toHaveBeenCalledWith('Catena Zapata')
    fireEvent.focus(winery)
    fireEvent.mouseDown(dialog.getByRole('option', { name: 'admin.submissions.useWineryName' }))
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('wineryName', 'Cat')
    lookups.winerySearch.query = ''
    lookups.winerySearch.results = []
  })

  it('drops the picked winery as soon as the search text is edited', () => {
    const dialog = renderPage({ catalogOverrides: { ...OVERRIDES, wineryName: 'Catena Zapata' } })
    expect(dialog.getByText('forms.entityPicker.selected')).toBeInTheDocument()
    fireEvent.change(dialog.getByRole('combobox', { name: 'admin.submissions.wineryOverride' }), { target: { value: 'Ca' } })
    expect(lookups.winerySearch.setQuery).toHaveBeenCalledWith('Ca')
    expect(actions.setCatalogOverride).toHaveBeenCalledWith('wineryName', '')
  })
})
