/**
 * Input component — RTL tests
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '@components/ui/Input'

describe('Input', () => {
  it('renders with a label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('generates id from label when id not provided', () => {
    render(<Input label="Full Name" />)
    const input = screen.getByLabelText('Full Name')
    expect(input.id).toBe('full-name')
  })

  it('uses provided id over generated id', () => {
    render(<Input label="Email" id="custom-id" />)
    const input = screen.getByLabelText('Email')
    expect(input.id).toBe('custom-id')
  })

  it('renders without label', () => {
    render(<Input placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('shows error message and marks aria-invalid', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows hint text when no error', () => {
    render(<Input label="Password" hint="At least 8 characters" />)
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
  })

  it('hides hint when error is present', () => {
    render(<Input label="Password" hint="At least 8 characters" error="Too short" />)
    expect(screen.getByText('Too short')).toBeInTheDocument()
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()
  })

  it('applies error border styles', () => {
    render(<Input label="Email" error="Required" />)
    const input = screen.getByLabelText('Email')
    expect(input.className).toContain('border-danger')
  })

  it('is disabled when disabled prop is set', () => {
    render(<Input label="Name" disabled />)
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })

  it('fires onChange handler', () => {
    const onChange = vi.fn()
    render(<Input label="Name" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalled()
  })
})

