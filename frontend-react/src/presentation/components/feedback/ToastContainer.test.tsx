import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@app/providers/ToastProvider'
import { useToast } from '@hooks/useToast'
import { ToastContainer } from './ToastContainer'
import { AlertBanner } from './AlertBanner'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key === 'common.close' ? 'Cerrar' : key }) }))

function Harness() {
  const { addToast } = useToast()
  return <>
    <button onClick={() => addToast({ type: 'success', message: 'Bienvenido de nuevo' })}>Success</button>
    <button onClick={() => addToast({ type: 'error', message: 'No pudimos guardar' })}>Error</button>
    <button onClick={() => addToast({ type: 'info', message: 'Persistente', duration: 0 })}>Persistent</button>
    <ToastContainer />
  </>
}
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
describe('branded feedback', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { cleanup(); vi.useRealTimers() })
  it('uses polite success, urgent errors and localized manual dismissal', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('Success'))
    expect(screen.getByRole('status')).toHaveTextContent('Bienvenido de nuevo')
    fireEvent.click(screen.getByText('Error'))
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar')
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]!)
    advance(180)
    expect(screen.queryByText('Bienvenido de nuevo')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
  it('does not restart older timers when another notification arrives', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('Success'))
    advance(3000)
    fireEvent.click(screen.getByText('Error'))
    advance(1000); advance(180)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    advance(5000); advance(180)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('pauses while reading with mouse or keyboard and honors persistent notices', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('Success'))
    advance(2000)
    const notice = screen.getByRole('status').parentElement!
    fireEvent.mouseEnter(notice)
    advance(10000)
    fireEvent.focus(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.mouseLeave(notice)
    advance(10000)
    expect(screen.getByRole('status')).toBeInTheDocument()
    fireEvent.blur(screen.getByRole('button', { name: 'Cerrar' }), { relatedTarget: null })
    advance(2000); advance(180)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Persistent'))
    advance(20000)
    expect(screen.getByText('Persistente')).toBeInTheDocument()
  })
  it('preserves inline content, title, actions and dismiss callbacks', () => {
    const retry = vi.fn(), close = vi.fn()
    render(<AlertBanner variant="warning" title="Revisá los datos" onDismiss={close}>
      <button onClick={retry}>Reintentar</button>
    </AlertBanner>)
    expect(screen.getByRole('alert')).toHaveTextContent('Revisá los datos')
    fireEvent.click(screen.getByText('Reintentar')); fireEvent.click(screen.getByLabelText('Cerrar'))
    expect(retry).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce()
  })
})

it('renders toasts outside the app root so an open modal does not hide them from assistive technology', () => {
  const root = document.body.appendChild(document.createElement('div'))
  root.id = 'root'
  render(<ToastProvider><Harness /></ToastProvider>, { container: root })
  fireEvent.click(screen.getByText('Error'))
  const toast = screen.getByRole('alert')
  expect(root.contains(toast)).toBe(false)
  expect(document.body.contains(toast)).toBe(true)
  cleanup()
  root.remove()
})
