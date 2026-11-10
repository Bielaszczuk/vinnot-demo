import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { ReviewForm } from './ReviewForm'

async function mount(props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } } })
  const onSubmit = vi.fn()
  render(<I18nextProvider i18n={i18n}>
    <ReviewForm wineId="wine-1" initialRating={4} onSubmit={onSubmit} onCancel={() => {}} {...props} />
  </I18nextProvider>)
  return onSubmit
}

describe('ReviewForm vintage', () => {
  it('submits the chosen tasted vintage, suggesting the label vintage first', async () => {
    const onSubmit = await mount({ catalogVintage: 2018 })
    const select = screen.getByLabelText('Vintage')
    expect(screen.getByRole('option', { name: '2018 · Label vintage' })).toBeInTheDocument()
    fireEvent.change(select, { target: { value: '2018' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rating: 4, title: '', comment: '', vintage: 2018 }))
  })

  it('submits no vintage when none is chosen, as before', async () => {
    const onSubmit = await mount({ initialTitle: ' Fresh ', initialComment: ' Bright ' })
    expect(screen.getByLabelText('Vintage')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rating: 4, title: 'Fresh', comment: 'Bright', vintage: null }))
  })

  it('pre-selects a stored vintage and lets the user clear it', async () => {
    const onSubmit = await mount({ initialVintage: 2016, isEditing: true })
    const select = screen.getByLabelText('Vintage')
    expect(select).toHaveValue('2016')
    fireEvent.change(select, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rating: 4, title: '', comment: '', vintage: null }))
  })
})

describe('ReviewForm rating', () => {
  it('rates with the pour control in steps of 0.1 and submits the decimal score', async () => {
    const onSubmit = await mount({ initialRating: 0, wineType: 'sparkling' })
    const slider = screen.getByRole('slider', { name: 'Rating *' })
    // One hint only: the pour control's own, never a second line from the form.
    expect(screen.getAllByText('Drag the bottle or the bar to rate')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Submit review' })).toBeDisabled()
    expect(slider.querySelector('img')).toHaveAttribute('src', '/images/rating/glass-flute.webp')
    fireEvent.keyDown(slider, { key: 'End' })
    fireEvent.keyDown(slider, { key: 'PageDown' })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(slider).toHaveAttribute('aria-valuenow', '4.6')
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rating: 4.6, title: '', comment: '', vintage: null }))
  })
})

describe('ReviewForm copy', () => {
  it('notes which fields are required, without the publication policy or "(optional)" labels', async () => {
    await mount()
    expect(screen.getByText('Fields marked with (*) are required.')).toBeInTheDocument()
    expect(screen.getByText('Rating *')).toBeInTheDocument()
    expect(screen.queryByText(/is published immediately/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(optional\)/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Comment')).toBeInTheDocument()
  })
})
