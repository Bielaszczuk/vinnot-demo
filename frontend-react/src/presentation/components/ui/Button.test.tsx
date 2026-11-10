import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { Button } from './Button'
import { buttonClassName } from './buttonStyles'
import { LinkButton } from './LinkButton'

it('renders the brand primary action by default, rounded and at least 44 px tall', () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Save</Button>)
  const button = screen.getByRole('button', { name: 'Save' })
  expect(button.className).toContain('bg-wine-700')
  expect(button.className).toContain('rounded-xl')
  expect(button.className).toContain('min-h-11')
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledTimes(1)
})

it('keeps an explicit submit type for forms', () => {
  render(<Button type="submit">Send</Button>)
  expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit')
})

it.each([
  ['secondary', 'border-wine-700'],
  ['outline', 'border-gray-300'],
  ['ghost', 'bg-transparent'],
  ['danger', 'bg-danger'],
  ['link', 'underline-offset-4'],
  ['onDark', 'text-white'],
] as const)('styles the %s variant', (variant, expected) => {
  render(<Button variant={variant}>Go</Button>)
  expect(screen.getByRole('button', { name: 'Go' }).className).toContain(expected)
})

it('drops the height and padding for the link variant so it reads as text', () => {
  expect(buttonClassName({ variant: 'link', size: 'lg' })).not.toContain('min-h-12')
  expect(buttonClassName({ size: 'sm' })).toContain('min-h-9')
  expect(buttonClassName({ size: 'lg', className: 'w-full' })).toContain('w-full')
})

it('shows a busy state that blocks a second press and hides the trailing icon', () => {
  const onClick = vi.fn()
  render(
    <Button isLoading onClick={onClick} leftIcon={<span>left</span>} rightIcon={<span>right</span>}>
      Pay
    </Button>,
  )
  const button = screen.getByRole('button', { name: /Pay/ })
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByText('left')).toBeNull()
  expect(screen.queryByText('right')).toBeNull()
  fireEvent.click(button)
  expect(onClick).not.toHaveBeenCalled()
})

it('renders both icons when idle', () => {
  render(<Button leftIcon={<span>left</span>} rightIcon={<span>right</span>}>Next</Button>)
  expect(screen.getByText('left')).toBeInTheDocument()
  expect(screen.getByText('right')).toBeInTheDocument()
})

it('renders an in-app link with the button look instead of a link around a button', () => {
  render(
    <MemoryRouter>
      <LinkButton to="/register" variant="secondary" size="sm" leftIcon={<span>i</span>} rightIcon={<span>r</span>}>
        Create account
      </LinkButton>
    </MemoryRouter>,
  )
  const link = screen.getByRole('link', { name: /Create account/ })
  expect(link).toHaveAttribute('href', '/register')
  expect(link.className).toContain('border-wine-700')
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByText('r')).toBeInTheDocument()
})

it('renders an external link that opens safely in a new tab', () => {
  render(<LinkButton href="https://example.org" external>Open</LinkButton>)
  const link = screen.getByRole('link', { name: 'Open' })
  expect(link).toHaveAttribute('href', 'https://example.org')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(link.className).toContain('bg-wine-700')
})

it('renders a same-tab plain anchor when the link is not external', () => {
  render(<LinkButton href="/file.pdf" variant="link">Download</LinkButton>)
  const link = screen.getByRole('link', { name: 'Download' })
  expect(link).not.toHaveAttribute('target')
})
