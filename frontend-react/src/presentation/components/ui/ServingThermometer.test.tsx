import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ServingThermometer } from './ServingThermometer'
import { thermometerLevel } from './thermometerLevel'

describe('thermometerLevel', () => {
  it('places the middle of the recommended range on a 0-25 °C scale, bounded to the tube', () => {
    expect(thermometerLevel({ min: 16, max: 18 })).toBeCloseTo(0.68)
    expect(thermometerLevel({ min: 8, max: 8 })).toBeCloseTo(0.32)
    expect(thermometerLevel({ min: 30, max: 32 })).toBe(1)
    expect(thermometerLevel({ min: -4, max: -2 })).toBe(0)
  })
})

describe('ServingThermometer', () => {
  it('raises the mercury to the recommended temperature and labels the range', () => {
    const { container } = render(<ServingThermometer temperature={{ min: 16, max: 18 }} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    const mercury = screen.getByTestId('thermometer-mercury')
    expect(mercury).toHaveAttribute('data-level', '68')
    expect(mercury).toHaveClass('profile-thermo-rise')
    expect(screen.getByText('16–18 °C')).toBeInTheDocument()
  })

  it('labels a single temperature once', () => {
    render(<ServingThermometer temperature={{ min: 8, max: 8 }} />)
    expect(screen.getByText('8 °C')).toBeInTheDocument()
    expect(screen.getByTestId('thermometer-mercury')).toHaveAttribute('data-level', '32')
  })
})
