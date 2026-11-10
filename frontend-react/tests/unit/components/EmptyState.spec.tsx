/**
 * EmptyState component — RTL tests
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from '@components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="No results" description="Try a different search" />)
    expect(screen.getByText('Try a different search')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<EmptyState title="No results" />)
    const desc = screen.queryByText('Try a different search')
    expect(desc).not.toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="No results"
        icon={<span data-testid="empty-icon">🔍</span>}
      />,
    )
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="No results"
        action={<button>Try again</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="mt-10" />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('mt-10')
  })

  it('has correct base styles', () => {
    const { container } = render(<EmptyState title="Empty" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('flex-col')
    expect(wrapper.className).toContain('items-center')
  })
})

