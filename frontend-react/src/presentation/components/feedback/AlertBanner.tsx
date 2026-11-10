import { type ReactNode } from 'react'
import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './feedback.css'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertBannerProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

const icons = { success: Check, error: CircleAlert, warning: TriangleAlert, info: Info }

/** Shared visual language for inline feedback and transient notifications. */
export function AlertBanner({ variant = 'info', title, children, onDismiss, className = '' }: AlertBannerProps) {
  const { t } = useTranslation()
  const Icon = icons[variant]
  return (
    <div className={`vinnot-notice vinnot-notice--${variant} ${className}`.trim()}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'} aria-atomic="true">
      <span className="vinnot-notice__icon" aria-hidden="true"><Icon size={20} strokeWidth={1.7} /></span>
      <div className="vinnot-notice__copy">
        {title && <p className="vinnot-notice__title">{title}</p>}
        <div className="vinnot-notice__message">{children}</div>
      </div>
      {onDismiss && <button type="button" onClick={onDismiss} className="vinnot-notice__close"
        aria-label={t('common.close')}><X size={17} strokeWidth={1.7} aria-hidden="true" /></button>}
    </div>
  )
}
