/**
 * ConfirmDialog — renders the active confirm dialog from ConfirmProvider
 */

import { useState } from 'react'
import { useConfirm } from '@hooks/useConfirm'
import type { ConfirmState } from '@/app/providers/ConfirmContext'
import { useTranslation } from 'react-i18next'
import { Modal } from '@components/ui/Modal'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'

export function ConfirmDialog() {
  const { state, close } = useConfirm()
  if (!state.isOpen) return null
  return <ActiveConfirmDialog key={`${state.title}:${state.typedConfirmation?.phrase ?? ''}`} state={state} close={close} />
}

function ActiveConfirmDialog({ state, close }: { state: ConfirmState; close: () => void }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const matches = !state.typedConfirmation || text.trim() === state.typedConfirmation.phrase

  const handleConfirm = () => {
    if (!matches) return
    state.resolve?.(true)
    close()
  }

  const handleCancel = () => {
    state.resolve?.(false)
    close()
  }

  const confirmVariant =
    state.variant === 'danger' ? 'danger' : 'primary'

  return (
    <Modal isOpen={state.isOpen} onClose={handleCancel} title={state.title} size="sm">
      <p className="text-sm text-gray-600">{state.message}</p>
      {state.typedConfirmation && (
        <div className="mt-4">
          <Input
            id="typed-confirmation"
            label={state.typedConfirmation.label}
            placeholder={state.typedConfirmation.phrase}
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="none"
          />
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel}>
          {state.cancelLabel ?? t('common.cancel')}
        </Button>
        <Button variant={confirmVariant} onClick={handleConfirm} disabled={!matches}>
          {state.confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
