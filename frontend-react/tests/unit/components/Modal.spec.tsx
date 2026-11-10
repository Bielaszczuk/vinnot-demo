/**
 * Modal component — RTL tests
 */
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@components/ui/Modal'
afterEach(cleanup)

describe('Modal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Title">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('shows close button when title is provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Title">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Title">
        <p>Content</p>
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    // The backdrop has aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key press', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sets aria-modal attribute', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('applies size class', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    const content = dialog.querySelector('.max-w-lg')
    expect(content).toBeTruthy()
  })
})


describe('modal focus and nesting', () => {
 it('hides the application background and restores its original attributes', () => {
  const root = document.createElement('div'); root.id = 'root'; root.inert = false;
  root.setAttribute('aria-hidden', 'false'); document.body.appendChild(root);
  const { unmount } = render(<Modal isOpen onClose={() => {}} title="Foreground"><button>Action</button></Modal>);
  expect(root.inert).toBe(true); expect(root.getAttribute('aria-hidden')).toBe('true');
  unmount(); expect(root.inert).toBe(false); expect(root.getAttribute('aria-hidden')).toBe('false'); root.remove();
 });
 it('traps keyboard focus and restores the trigger on close', () => {
  const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
  const { unmount }=render(<Modal isOpen onClose={() => {}} title="Focus"><button>First</button><button>Last</button></Modal>);
  const close=screen.getByLabelText('Close'); expect(close).toHaveFocus();
  screen.getByText('Last').focus(); fireEvent.keyDown(document,{key:'Tab'});expect(close).toHaveFocus();
  fireEvent.keyDown(document,{key:'Tab',shiftKey:true});expect(screen.getByText('Last')).toHaveFocus();
  unmount();expect(trigger).toHaveFocus();trigger.remove();
 });
 it('only closes the top dialog and preserves the parent lock and focus', async () => {
  const parentClose=vi.fn();
  function Nested() {
   const [child,setChild]=useState(false);
   return <><Modal isOpen onClose={parentClose} title="Parent"><button onClick={() => setChild(true)}>Open child</button></Modal>
   <Modal isOpen={child} onClose={() => setChild(false)} title="Child"><button>Child action</button></Modal></>;
  }
  const {unmount}=render(<Nested/>);
  await userEvent.click(screen.getByText('Open child'));
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Child');
  fireEvent.keyDown(document,{key:'Escape'});
  expect(parentClose).not.toHaveBeenCalled();
  expect(screen.getByText('Open child')).toHaveFocus();
  expect(document.body.style.overflow).toBe('hidden');
  unmount();expect(document.body.style.overflow).toBe('');
 });
});
