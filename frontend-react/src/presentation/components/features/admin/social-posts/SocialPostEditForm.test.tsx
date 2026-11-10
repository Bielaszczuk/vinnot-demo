import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGAL_LINES, emptyCopyDraft } from '@domain/admin/socialPost'
import { SocialPostEditForm } from './SocialPostEditForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key) }),
}))
afterEach(cleanup)

const handlers = {
  onChange: vi.fn(), onSlideChange: vi.fn(), onAddSlide: vi.fn(), onRemoveSlide: vi.fn(), onSave: vi.fn(), onCancel: vi.fn(),
}
const draft = {
  hook: 'Gancho', slides: [{ title: 'Uno', body: 'Primero.' }, { title: 'Dos', body: 'Segundo.' }, { title: 'Tres', body: 'Tercero.' }],
  caption: 'Texto', hashtags: '#vinnot #merlot', altText: 'Alt', cta: '¿Y vos?',
}

describe('social post edit form', () => {
  beforeEach(() => vi.clearAllMocks())

  it('edits every field and submits when the draft is valid', () => {
    render(<SocialPostEditForm draft={draft} errors={[]} saving={false} language="es" {...handlers} />)
    fireEvent.change(screen.getByLabelText('admin.socialPosts.editor.hook'), { target: { value: 'Nuevo' } })
    fireEvent.change(screen.getByLabelText('admin.socialPosts.editor.caption'), { target: { value: 'Nuevo texto' } })
    fireEvent.change(screen.getByLabelText('admin.socialPosts.editor.hashtags'), { target: { value: '#vinnot' } })
    fireEvent.change(screen.getByLabelText('admin.socialPosts.editor.altText'), { target: { value: 'Otro alt' } })
    fireEvent.change(screen.getByLabelText('admin.socialPosts.editor.cta'), { target: { value: '¿Qué opinás?' } })
    expect(handlers.onChange.mock.calls).toEqual([
      ['hook', 'Nuevo'], ['caption', 'Nuevo texto'], ['hashtags', '#vinnot'], ['altText', 'Otro alt'], ['cta', '¿Qué opinás?'],
    ])

    fireEvent.change(screen.getAllByLabelText('admin.socialPosts.editor.slideTitle')[1]!, { target: { value: 'Dos bis' } })
    fireEvent.change(screen.getAllByLabelText('admin.socialPosts.editor.slideBody')[2]!, { target: { value: 'Tercero bis.' } })
    expect(handlers.onSlideChange).toHaveBeenNthCalledWith(1, 1, 'title', 'Dos bis')
    expect(handlers.onSlideChange).toHaveBeenNthCalledWith(2, 2, 'body', 'Tercero bis.')

    fireEvent.click(screen.getByText('admin.socialPosts.editor.addSlide'))
    expect(handlers.onAddSlide).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/editor.removeSlide/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('admin.socialPosts.editor.save'))
    fireEvent.click(screen.getByText('common.cancel'))
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
  })

  it('removes an extra slide, hides "add" at seven and flags counters over the limit', () => {
    const seven = { ...draft, hook: 'x'.repeat(61), slides: Array.from({ length: 7 }, (_, index) => ({ title: `T${index}`, body: 'b' })) }
    render(<SocialPostEditForm draft={seven} errors={['HOOK_TOO_LONG']} saving={false} language="es" {...handlers} />)
    expect(screen.queryByText('admin.socialPosts.editor.addSlide')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('admin.socialPosts.editor.removeSlide {"index":7}'))
    expect(handlers.onRemoveSlide).toHaveBeenCalledWith(6)
    expect(screen.getByText('admin.socialPosts.editor.counter {"count":61,"max":60}')).toHaveClass('text-red-700')
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.editor.errors.HOOK_TOO_LONG')
    expect(screen.getByText('admin.socialPosts.editor.save')).toBeDisabled()
  })

  it('blocks the buttons while saving and starts from an empty draft', () => {
    render(<SocialPostEditForm draft={emptyCopyDraft()} errors={[]} saving language="es" {...handlers} />)
    expect(screen.getByText('common.cancel')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'admin.socialPosts.editor.save' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('admin.socialPosts.editor.hook')).toHaveValue('')
  })

  it('names the language being edited and the legal line that closes its caption', () => {
    const { rerender } = render(<SocialPostEditForm draft={draft} errors={[]} saving={false} language="en" {...handlers} />)
    expect(screen.getByText('admin.socialPosts.editor.language {"language":"admin.socialPosts.languages.en"}')).toBeInTheDocument()
    expect(screen.getByText(`admin.socialPosts.editor.legalLine {"line":"${LEGAL_LINES.en}"}`)).toBeInTheDocument()

    rerender(<SocialPostEditForm draft={draft} errors={[]} saving={false} language="es" {...handlers} />)
    expect(screen.getByText(`admin.socialPosts.editor.legalLine {"line":"${LEGAL_LINES.es}"}`)).toBeInTheDocument()
  })
})
