import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal focus trap', () => {
  it('pulls focus that leaves the dialog back to its first control', () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    render(<Modal isOpen onClose={() => {}} title="Dialog"><button type="button">Inside</button></Modal>)
    outside.focus()
    expect(document.activeElement).not.toBe(outside)
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()
    outside.remove()
  })

  it('keeps focus in a popover layered over the dialog', () => {
    const layer = document.createElement('div')
    layer.setAttribute('data-radix-popper-content-wrapper', '')
    const inLayer = document.createElement('button')
    layer.append(inLayer)
    document.body.append(layer)
    render(<Modal isOpen onClose={() => {}} title="Dialog"><button type="button">Inside</button></Modal>)
    inLayer.focus()
    expect(document.activeElement).toBe(inLayer)
    layer.remove()
  })

  it('Escape inside a layered popover does not close the dialog', () => {
    const onClose = vi.fn()
    const layer = document.createElement('div')
    layer.setAttribute('data-radix-popper-content-wrapper', '')
    const inLayer = document.createElement('button')
    layer.append(inLayer)
    document.body.append(layer)
    render(<Modal isOpen onClose={onClose} title="Dialog"><button type="button">Inside</button></Modal>)
    inLayer.focus()
    fireEvent.keyDown(inLayer, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    layer.remove()
  })

  it('Escape inside the dialog still closes it', () => {
    const onClose = vi.fn()
    render(<Modal isOpen onClose={onClose} title="Dialog"><button type="button">Inside</button></Modal>)
    fireEvent.keyDown(screen.getByText('Inside'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

})
