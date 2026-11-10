/**
 * Button component — RTL tests
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@components/ui/Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-wine-700')
  })

  it('applies danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-danger')
  })

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-6')
  })

  it('shows loading spinner and disables button when isLoading', () => {
    render(<Button isLoading>Saving</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    // Should have the spinning SVG
    expect(btn.querySelector('svg.animate-spin')).toBeTruthy()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick handler when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders leftIcon when not loading', () => {
    render(<Button leftIcon={<span data-testid="icon">🍷</span>}>Wine</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders rightIcon when not loading', () => {
    render(<Button rightIcon={<span data-testid="right">→</span>}>Next</Button>)
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('hides leftIcon when loading', () => {
    render(<Button isLoading leftIcon={<span data-testid="icon">🍷</span>}>Wine</Button>)
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })
})

