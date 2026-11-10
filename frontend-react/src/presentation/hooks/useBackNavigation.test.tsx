import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it } from 'vitest'
import { useBackNavigation } from './useBackNavigation'

function Detail() {
  const goBack = useBackNavigation('/wines')
  return <button type="button" onClick={goBack}>Back</button>
}

function app(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/wines" element={<p>Wine list</p>} />
        <Route path="/community" element={<Link to="/wines/w1">Open wine</Link>} />
        <Route path="/wines/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('goes to the list route when the detail page was opened directly', () => {
  app(['/wines/w1'])
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Wine list')).toBeInTheDocument()
})

it('returns to the previous in-app page when there is history', () => {
  app(['/community'])
  fireEvent.click(screen.getByRole('link', { name: 'Open wine' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('link', { name: 'Open wine' })).toBeInTheDocument()
})
