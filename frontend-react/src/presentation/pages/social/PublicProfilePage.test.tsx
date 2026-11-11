import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersService } from '@services/users.service'
import { socialService } from '@services/social.service'
import { tasteQuizService } from '@services/tasteQuiz.service'
import { tasteTraitsService } from '@services/tasteTraits.service'
import { PublicProfilePage } from './PublicProfilePage'
import { profileFixture, renderWithProviders, reviewFixture, tasteTraitsFixture, translate } from './socialTestUtils'

const auth = { user: { id: 'me' } as { id: string } | null }
const motion = { reduced: true }
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user, isAuthenticated: Boolean(auth.user) }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'es-AR' } }) }))
vi.mock('@components/features/community/CommunityActions', () => ({ CommunityActions: () => null }))
vi.mock('@services/users.service', () => ({
  usersService: { getUserProfile: vi.fn(), getUserReviews: vi.fn(), getUserCellar: vi.fn() },
}))
vi.mock('@services/social.service', () => ({ socialService: { follow: vi.fn(), unfollow: vi.fn() } }))
vi.mock('@services/tasteQuiz.service', () => ({ tasteQuizService: { get: vi.fn(), complete: vi.fn(), skip: vi.fn() } }))
vi.mock('@services/tasteTraits.service', () => ({ tasteTraitsService: { adjustStructure: vi.fn(), resetStructure: vi.fn() } }))

const emptyPage = { items: [], page: 0, totalItems: 0, totalPages: 0 }
const mount = (id = 'u2') => renderWithProviders(<Route path="/users/:id" element={<PublicProfilePage />} />, `/users/${id}`)

describe('PublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 'me' }
    motion.reduced = true
    vi.mocked(tasteQuizService.get).mockResolvedValue({ status: 'PENDING', answers: null, shouldPrompt: false })
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture())
    vi.mocked(usersService.getUserReviews).mockResolvedValue({ items: [reviewFixture()], page: 0, totalItems: 1, totalPages: 1 })
    vi.mocked(usersService.getUserCellar).mockResolvedValue({
      visible: true,
      page: { items: [{ id: 'c1', wine: { id: 'w9', name: 'Torrontés Alto', imageUrl: null, type: 'WHITE', wineryName: 'Cafayate' }, vintage: 2022, rating: 4, addedAt: new Date('2026-10-01') }], page: 0, totalItems: 1, totalPages: 1 },
    })
  })

  it('shows avatar, name, @username, bio, seal, counters, affinity and the follows-you mark', async () => {
    mount()
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeInTheDocument()
    expect(usersService.getUserProfile).toHaveBeenCalledWith('u2')
    expect(screen.getByText('@ana')).toBeInTheDocument()
    expect(screen.getByText('Malbec y montaña')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /points.emblemLabel/ })).toBeInTheDocument()
    expect(screen.getByText('social.followsYou')).toBeInTheDocument()
    expect(screen.getByText('social.affinity:76')).toBeInTheDocument()
    const followers = screen.getByRole('link', { name: /social.counters.followers/ })
    expect(followers).toHaveAttribute('href', '/users/u2/followers')
    expect(followers).toHaveTextContent('12')
    expect(screen.getByRole('link', { name: /social.counters.following/ })).toHaveAttribute('href', '/users/u2/following')
    expect(screen.getByText('social.counters.reviews').parentElement).toHaveTextContent('8')
    expect(screen.getByText('social.counters.cellar').parentElement).toHaveTextContent('20')
  })

  it('lists the reviews and the cellar wines', async () => {
    mount()
    expect(await screen.findByText('Fresco y frutado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Malbec Reserva' })).toHaveAttribute('href', '/wines/w1')
    expect(await screen.findByText('Torrontés Alto')).toBeInTheDocument()
    expect(usersService.getUserReviews).toHaveBeenCalledWith('u2', 0)
    expect(usersService.getUserCellar).toHaveBeenCalledWith('u2', 0)
  })

  it('follows and unfollows, flipping the button and the follower count', async () => {
    let settle!: () => void
    vi.mocked(socialService.follow).mockReturnValue(new Promise<void>((done) => { settle = done }))
    vi.mocked(socialService.unfollow).mockResolvedValue()
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'social.followLabel:Ana Pérez' }))
    // Optimistic: the button and the count flip before the server answers.
    const button = await screen.findByRole('button', { name: 'social.unfollowLabel:Ana Pérez' })
    expect(socialService.follow).toHaveBeenCalledWith('u2')
    expect(button).toHaveTextContent('social.followingState')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /social.counters.followers/ })).toHaveTextContent('13')

    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ following: true, followersCount: 13 }))
    settle()
    await waitFor(() => expect(screen.getByRole('button', { name: 'social.unfollowLabel:Ana Pérez' })).toBeEnabled())
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture())
    fireEvent.click(screen.getByRole('button', { name: 'social.unfollowLabel:Ana Pérez' }))
    await waitFor(() => expect(socialService.unfollow).toHaveBeenCalledWith('u2'))
    expect(await screen.findByRole('button', { name: 'social.followLabel:Ana Pérez' })).toHaveTextContent('social.follow')
  })

  it('shows Edit profile instead of Follow on the own profile', async () => {
    auth.user = { id: 'u2' }
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ affinityPercent: null, followsYou: false }))
    mount()
    expect(await screen.findByRole('link', { name: /social.editProfile/ })).toHaveAttribute('href', '/profile')
    expect(screen.queryByRole('button', { name: /social.followLabel/ })).toBeNull()
    expect(screen.queryByText(/social.affinity/)).toBeNull()
  })

  it('shows the locked cellar without asking for it when the profile says it is hidden', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ cellarVisible: false, cellarCount: null }))
    mount()
    expect(await screen.findByText('social.cellarLocked')).toBeInTheDocument()
    expect(screen.getByText('social.counters.cellar').parentElement).toHaveTextContent('—')
    expect(usersService.getUserCellar).not.toHaveBeenCalled()
  })

  it('shows the locked cellar when the server answers 403 CELLAR_NOT_VISIBLE', async () => {
    vi.mocked(usersService.getUserCellar).mockResolvedValue({ visible: false })
    mount()
    expect(await screen.findByText('social.cellarLocked')).toBeInTheDocument()
  })

  it('hides the taste wheel with a short explanation under 5 rated wines', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteWheel: null }))
    mount()
    expect(await screen.findByText('social.tasteWheelLocked')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /social.tasteWheelLabel/ })).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('shows the structure scales and the preferred aromas, each with its illustration', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteTraits: tasteTraitsFixture() }))
    const { container } = mount()
    expect(await screen.findByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeInTheDocument()
    const meters = screen.getAllByRole('meter')
    expect(meters.map((meter) => meter.getAttribute('aria-label'))).toEqual([
      'social.tasteProfile.traits.ACIDITY',
      'social.tasteProfile.traits.BODY',
      'social.tasteProfile.traits.TANNIN',
      'social.tasteProfile.traits.SWEETNESS',
    ])
    expect(meters.map((meter) => meter.getAttribute('aria-valuenow'))).toEqual(['20', '50', '80', '10'])
    expect(screen.getByText('social.tasteProfile.levels.ACIDITY.LOW')).toBeInTheDocument()
    expect(screen.getByText('social.tasteProfile.levels.BODY.MEDIUM')).toBeInTheDocument()
    expect(screen.getByText('social.tasteProfile.levels.TANNIN.HIGH')).toBeInTheDocument()
    expect(screen.getByText('social.tasteProfile.levels.SWEETNESS.LOW')).toBeInTheDocument()

    const aromas = screen.getByRole('list', { name: 'social.tasteProfile.aromasTitle' })
    const chips = within(aromas).getAllByRole('listitem')
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'social.tasteProfile.families.FRUITsocial.tasteProfile.percent:70',
      'social.tasteProfile.families.OAKsocial.tasteProfile.percent:30',
    ])
    // Six decorative illustrations (four traits, two families) plus the wheel emblem; the text carries the meaning.
    const art = Array.from(container.querySelectorAll('img[alt=""]')).filter((img) => /profile-art|\.webp/.test(img.getAttribute('src') ?? ''))
    expect(art.length).toBeGreaterThanOrEqual(7)
  })

  it('hides the structure when it has no traits and the aromas when there are no families', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteTraits: tasteTraitsFixture({ structure: [] }) }))
    const first = mount()
    expect(await screen.findByRole('heading', { name: 'social.tasteProfile.aromasTitle' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeNull()
    expect(screen.queryAllByRole('meter')).toHaveLength(0)
    first.unmount()

    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteTraits: tasteTraitsFixture({ families: [] }) }))
    mount()
    expect(await screen.findByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'social.tasteProfile.aromasTitle' })).toBeNull()
  })

  it('shows only the wheel when the profile has no taste traits', async () => {
    mount()
    expect(await screen.findByRole('group', { name: /social.tasteWheelLabel/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeNull()
    expect(screen.queryByRole('heading', { name: /social.tasteProfile.aromasTitle/ })).toBeNull()
  })

  it('speaks to the member on the own profile', async () => {
    auth.user = { id: 'u2' }
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ affinityPercent: null, tasteTraits: tasteTraitsFixture() }))
    mount()
    expect(await screen.findByRole('heading', { name: 'social.tasteProfile.aromasTitleOwn' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'social.tasteProfile.aromasTitle' })).toBeNull()
  })

  it('draws the taste wheel when there is one', async () => {
    mount()
    const wheel = await screen.findByRole('group', { name: /social.tasteWheelLabel/ })
    // The wheel opens on the grapes; the wine styles wait behind their own view.
    expect(within(wheel).getByText('Malbec')).toBeInTheDocument()
    expect(within(wheel).queryByText('wines.types.red')).toBeNull()
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.GRAPE' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows empty reviews and cellar states', async () => {
    vi.mocked(usersService.getUserReviews).mockResolvedValue(emptyPage)
    vi.mocked(usersService.getUserCellar).mockResolvedValue({ visible: true, page: emptyPage })
    mount()
    expect(await screen.findByText('social.reviewsEmpty')).toBeInTheDocument()
    expect(await screen.findByText('social.cellarEmpty')).toBeInTheDocument()
  })

  it('invites the member to take the taste quiz on the own profile', async () => {
    auth.user = { id: 'u2' }
    mount()
    const take = await screen.findByRole('link', { name: 'tasteQuiz.take' })
    expect(take).toHaveAttribute('href', '/taste-quiz?returnUrl=%2Fusers%2Fu2')
    expect(screen.queryByRole('link', { name: 'tasteQuiz.retake' })).toBeNull()
  })

  it('offers to retake a completed taste quiz on the own profile', async () => {
    auth.user = { id: 'u2' }
    vi.mocked(tasteQuizService.get).mockResolvedValue({
      status: 'COMPLETED',
      answers: { RAINY_DAY: 'DARK_CHOCOLATE_COFFEE', FRUIT: 'CITRUS', DESSERT: 'BROWNIE', DINNER: 'LEMON_FISH', AROMA: 'CUT_GRASS' },
      shouldPrompt: false,
    })
    mount()
    expect(await screen.findByRole('link', { name: 'tasteQuiz.retake' })).toHaveAttribute('href', '/taste-quiz?returnUrl=%2Fusers%2Fu2')
    expect(screen.queryByRole('link', { name: 'tasteQuiz.take' })).toBeNull()
  })

  it('never offers the quiz on someone else\'s profile', async () => {
    mount()
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /tasteQuiz/ })).toBeNull()
    expect(tasteQuizService.get).not.toHaveBeenCalled()
  })

  it('notes when the taste profile comes from the taste quiz, for the member and for others', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteTraits: tasteTraitsFixture({ fromQuiz: true }) }))
    const first = mount()
    expect(await screen.findByText('social.tasteProfile.fromQuiz')).toBeInTheDocument()
    first.unmount()

    auth.user = { id: 'u2' }
    mount()
    expect(await screen.findByText('social.tasteProfile.fromQuizOwn')).toBeInTheDocument()
  })

  it('keeps the taste card unchanged when the profile does not come from the quiz', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteTraits: tasteTraitsFixture() }))
    mount()
    expect(await screen.findByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /social.tasteWheelLabel/ })).toBeInTheDocument()
    expect(screen.getByText('social.tasteProfile.subtitle')).toBeInTheDocument()
    expect(screen.queryByText(/social.tasteProfile.fromQuiz/)).toBeNull()
    expect(screen.queryByText(/social.tasteProfile.wheelLocked/)).toBeNull()
  })

  it('shows the quiz traits with a compact wheel hint while the wheel is still locked', async () => {
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteWheel: null, tasteTraits: tasteTraitsFixture({ fromQuiz: true }) }))
    mount()
    expect(await screen.findByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(4)
    expect(screen.getByText('social.tasteProfile.wheelLocked')).toBeInTheDocument()
    expect(screen.queryByText('social.tasteWheelLocked')).toBeNull()
    expect(screen.queryByRole('group', { name: /social.tasteWheelLabel/ })).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  describe('adjusting the palate', () => {
    const own = (traits = tasteTraitsFixture()) => {
      auth.user = { id: 'u2' }
      vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ affinityPercent: null, tasteTraits: traits }))
      vi.mocked(tasteTraitsService.adjustStructure).mockResolvedValue(undefined)
      vi.mocked(tasteTraitsService.resetStructure).mockResolvedValue(undefined)
      return mount()
    }
    const adjust = async () => fireEvent.click(await screen.findByRole('button', { name: 'social.tasteProfile.adjust.start' }))
    const slider = (trait: string) => screen.getByRole('slider', { name: `social.tasteProfile.traits.${trait}` })
    const onTrack = (element: HTMLElement) => {
      element.getBoundingClientRect = () => ({ left: 100, width: 200, top: 0, height: 8, right: 300, bottom: 8, x: 100, y: 0, toJSON: () => ({}) })
      return element
    }

    it('is offered on the own profile only, never to visitors', async () => {
      vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ tasteTraits: tasteTraitsFixture() }))
      const visitor = mount()
      expect(await screen.findByRole('heading', { name: 'social.tasteProfile.structureTitle' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'social.tasteProfile.adjust.start' })).toBeNull()
      expect(screen.queryByRole('slider')).toBeNull()
      visitor.unmount()

      own()
      await adjust()
      expect(screen.getAllByRole('slider')).toHaveLength(4)
      expect(screen.queryAllByRole('meter')).toHaveLength(0)
    })

    it('moves a bar where the member drags it or clicks the track, with the level word following', async () => {
      own()
      await adjust()
      const acidity = onTrack(slider('ACIDITY'))
      expect(acidity).toHaveAttribute('aria-valuenow', '20')
      expect(acidity).toHaveAttribute('aria-valuetext', 'social.tasteProfile.levels.ACIDITY.LOW')
      fireEvent.pointerDown(acidity, { clientX: 280, pointerId: 1 })
      expect(acidity).toHaveAttribute('aria-valuenow', '90')
      expect(acidity).toHaveAttribute('aria-valuetext', 'social.tasteProfile.levels.ACIDITY.HIGH')
      expect(screen.getByText('social.tasteProfile.levels.ACIDITY.HIGH')).toBeInTheDocument()
      fireEvent.pointerMove(acidity, { clientX: 200, pointerId: 1 })
      expect(acidity).toHaveAttribute('aria-valuenow', '50')
      expect(screen.getByText('social.tasteProfile.levels.ACIDITY.MEDIUM')).toBeInTheDocument()
      fireEvent.pointerUp(acidity, { clientX: 200, pointerId: 1 })
      fireEvent.pointerMove(acidity, { clientX: 120, pointerId: 1 })
      expect(acidity).toHaveAttribute('aria-valuenow', '50')
      fireEvent.pointerDown(acidity, { clientX: 20, pointerId: 2 })
      expect(acidity).toHaveAttribute('aria-valuenow', '0')
    })

    it('moves a bar by 5 with the arrows and to either end with Home and End', async () => {
      own()
      await adjust()
      const body = slider('BODY')
      fireEvent.keyDown(body, { key: 'ArrowRight' })
      expect(body).toHaveAttribute('aria-valuenow', '55')
      fireEvent.keyDown(body, { key: 'ArrowUp' })
      expect(body).toHaveAttribute('aria-valuenow', '60')
      fireEvent.keyDown(body, { key: 'ArrowLeft' })
      fireEvent.keyDown(body, { key: 'ArrowDown' })
      fireEvent.keyDown(body, { key: 'ArrowDown' })
      expect(body).toHaveAttribute('aria-valuenow', '45')
      fireEvent.keyDown(body, { key: 'End' })
      expect(body).toHaveAttribute('aria-valuenow', '100')
      expect(body).toHaveAttribute('aria-valuetext', 'social.tasteProfile.levels.BODY.HIGH')
      fireEvent.keyDown(body, { key: 'ArrowRight' })
      expect(body).toHaveAttribute('aria-valuenow', '100')
      fireEvent.keyDown(body, { key: 'Home' })
      expect(body).toHaveAttribute('aria-valuenow', '0')
      fireEvent.keyDown(body, { key: 'Tab' })
      expect(body).toHaveAttribute('aria-valuenow', '0')
    })

    it('saves only the traits that changed, then shows the refreshed profile', async () => {
      own()
      await adjust()
      fireEvent.keyDown(slider('TANNIN'), { key: 'ArrowLeft' })
      fireEvent.keyDown(slider('BODY'), { key: 'ArrowRight' })
      fireEvent.keyDown(slider('BODY'), { key: 'ArrowLeft' })
      vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({
        affinityPercent: null,
        tasteTraits: tasteTraitsFixture({ structure: [{ trait: 'TANNIN', score: 75, wines: 7, adjusted: true }] }),
      }))
      fireEvent.click(screen.getByRole('button', { name: 'social.tasteProfile.adjust.save' }))
      await waitFor(() => expect(tasteTraitsService.adjustStructure).toHaveBeenCalledWith({ TANNIN: 75 }))
      expect(await screen.findByText('social.tasteProfile.adjust.adjusted')).toBeInTheDocument()
      expect(screen.queryByRole('slider')).toBeNull()
      expect(screen.getByRole('meter', { name: 'social.tasteProfile.traits.TANNIN' })).toHaveAttribute('aria-valuenow', '75')
      expect(usersService.getUserProfile).toHaveBeenCalledTimes(2)
    })

    it('closes without a request when nothing changed', async () => {
      own()
      await adjust()
      fireEvent.click(screen.getByRole('button', { name: 'social.tasteProfile.adjust.save' }))
      expect(await screen.findByRole('button', { name: 'social.tasteProfile.adjust.start' })).toBeInTheDocument()
      expect(tasteTraitsService.adjustStructure).not.toHaveBeenCalled()
    })

    it('keeps the bars open with a message when saving fails', async () => {
      own()
      vi.mocked(tasteTraitsService.adjustStructure).mockRejectedValue(new Error('offline'))
      await adjust()
      fireEvent.keyDown(slider('ACIDITY'), { key: 'End' })
      fireEvent.click(screen.getByRole('button', { name: 'social.tasteProfile.adjust.save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('social.tasteProfile.adjust.error')
      expect(slider('ACIDITY')).toHaveAttribute('aria-valuenow', '100')
    })

    it('restores the shown values on Cancel without saving anything', async () => {
      own()
      await adjust()
      fireEvent.keyDown(slider('ACIDITY'), { key: 'End' })
      fireEvent.click(screen.getByRole('button', { name: 'social.tasteProfile.adjust.cancel' }))
      expect(screen.queryByRole('slider')).toBeNull()
      expect(screen.getByRole('meter', { name: 'social.tasteProfile.traits.ACIDITY' })).toHaveAttribute('aria-valuenow', '20')
      expect(tasteTraitsService.adjustStructure).not.toHaveBeenCalled()
      await adjust()
      expect(slider('ACIDITY')).toHaveAttribute('aria-valuenow', '20')
    })

    it('starts a trait without data in the middle and saves it only when the member touches it', async () => {
      own(tasteTraitsFixture({ structure: [{ trait: 'ACIDITY', score: 20, wines: 9, adjusted: false }] }))
      await adjust()
      expect(screen.getAllByRole('slider')).toHaveLength(4)
      expect(slider('BODY')).toHaveAttribute('aria-valuenow', '50')
      fireEvent.keyDown(slider('SWEETNESS'), { key: 'ArrowRight' })
      fireEvent.click(screen.getByRole('button', { name: 'social.tasteProfile.adjust.save' }))
      await waitFor(() => expect(tasteTraitsService.adjustStructure).toHaveBeenCalledWith({ SWEETNESS: 55 }))
    })

    it('lets a member with no structure yet set it, from the own profile', async () => {
      auth.user = { id: 'u2' }
      vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture({ affinityPercent: null, tasteWheel: null, tasteTraits: null }))
      mount()
      expect(await screen.findByText('social.tasteProfile.adjust.empty')).toBeInTheDocument()
      await adjust()
      expect(screen.getAllByRole('slider')).toHaveLength(4)
    })

    it('marks the adjusted traits and offers to go back to the calculated values only when something is adjusted', async () => {
      const first = own()
      await adjust()
      expect(screen.queryByRole('button', { name: 'social.tasteProfile.adjust.reset' })).toBeNull()
      expect(screen.queryByText('social.tasteProfile.adjust.adjusted')).toBeNull()
      first.unmount()

      own(tasteTraitsFixture({
        structure: [
          { trait: 'ACIDITY', score: 85, wines: 9, adjusted: true },
          { trait: 'BODY', score: 50, wines: 9, adjusted: false },
        ],
      }))
      expect(await screen.findByText('social.tasteProfile.adjust.adjusted')).toBeInTheDocument()
      await adjust()
      fireEvent.click(screen.getByRole('button', { name: 'social.tasteProfile.adjust.reset' }))
      await waitFor(() => expect(tasteTraitsService.resetStructure).toHaveBeenCalledOnce())
      expect(await screen.findByRole('button', { name: 'social.tasteProfile.adjust.start' })).toBeInTheDocument()
      expect(tasteTraitsService.adjustStructure).not.toHaveBeenCalled()
    })
  })

  it('explains that a missing or blocked profile is not available', async () => {
    vi.mocked(usersService.getUserProfile).mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }))
    mount()
    expect(await screen.findByText('social.notFound')).toBeInTheDocument()
  })
})
