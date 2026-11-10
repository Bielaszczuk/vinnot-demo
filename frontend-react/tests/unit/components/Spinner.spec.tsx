/**
 * Spinner component — RTL tests
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Spinner } from '@components/ui/Spinner'

describe('Spinner', () => {
  it('renders with role=status', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAccessibleName('common.loading')
  })

  it('applies default md size', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-8')
    expect(spinner).toHaveClass('w-8')
  })

  it('applies sm size', () => {
    render(<Spinner size="sm" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-4')
    expect(spinner).toHaveClass('w-4')
  })

  it('applies lg size', () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-12')
    expect(spinner).toHaveClass('w-12')
  })

  it('has animate-spin class', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('animate-spin')
  })

  it('accepts custom className', () => {
    render(<Spinner className="ml-4" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('ml-4')
  })
})
