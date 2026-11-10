import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppleIcon, FacebookIcon, GoogleIcon } from '@components/brand/SocialIcons'
import { isFacebookLoginEnabled } from '@/shared/config/featureFlags'

interface AuthSocialButtonsProps {
  disabled?: boolean
  busyProvider?: string | null
  onCredential: (provider: 'GOOGLE', token: string) => void
  onProviderRequest: (provider: 'APPLE' | 'FACEBOOK') => void
  onProviderError: (provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK') => void
  /** Restricts the offer, e.g. to the identities linked to the signed-in account. */
  providers?: readonly ('GOOGLE' | 'APPLE' | 'FACEBOOK')[]
}

const providerStyle = 'flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-white px-2 py-3 text-xs font-medium text-[#171717] transition-colors hover:border-wine-700 hover:bg-wine-50 focus-visible:outline-wine-700 disabled:cursor-not-allowed disabled:opacity-50'
const providerMarkStyle = 'flex h-10 w-10 shrink-0 items-center justify-center'

export function AuthSocialButtons({
  disabled, busyProvider, onCredential, onProviderRequest, onProviderError, providers,
}: AuthSocialButtonsProps) {
  const { t, i18n } = useTranslation()
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [googleScriptFailed, setGoogleScriptFailed] = useState(false)
  const [googleAttempt, setGoogleAttempt] = useState(0)
  const enabled = import.meta.env.VITE_FEATURE_SOCIAL_LOGIN !== 'false'
  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined
  const busy = disabled || Boolean(busyProvider)
  const offers = (provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK') => !providers || providers.includes(provider)
  const googleOffered = offers('GOOGLE')
  const appleOffered = offers('APPLE')
  const facebookEnabled = isFacebookLoginEnabled() && offers('FACEBOOK')
  const columns = [googleOffered, appleOffered, facebookEnabled].filter(Boolean).length
  const googleError = () => onProviderError('GOOGLE')
  const googleScriptError = () => {
    setGoogleLoaded(false)
    setGoogleScriptFailed(true)
    googleError()
  }

  if (!enabled || columns === 0) return null

  return <div className={`mb-6 grid ${columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`} aria-label={t('auth.orContinueWith')}>
    {!googleOffered ? null : googleClientId ? (
      <GoogleOAuthProvider key={googleAttempt} clientId={googleClientId} locale={i18n.language.startsWith('en') ? 'en' : 'es'}
        onScriptLoadSuccess={() => setGoogleLoaded(true)} onScriptLoadError={googleScriptError}>
        <div className={providerStyle} inert={busy} aria-busy={!googleScriptFailed && (!googleLoaded || busyProvider === 'GOOGLE')}>
          {googleScriptFailed ? (
            <button type="button" className="flex flex-col items-center gap-2" disabled={busy}
              aria-label={`${t('common.retry')} Google`}
              onClick={() => {
                setGoogleScriptFailed(false)
                setGoogleAttempt(attempt => attempt + 1)
              }}>
              <span className={providerMarkStyle} aria-hidden="true"><GoogleIcon size={18} /></span>
              <span>{t('common.retry')} Google</span>
            </button>
          ) : <>
            <div className="relative h-10 w-10" inert={!googleLoaded}>
              {!googleLoaded && <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[#dadce0]" aria-hidden="true"><GoogleIcon size={18} /></div>}
              <div className={`vinnot-google-control ${googleLoaded ? '' : 'invisible'}`}>
                <GoogleLogin type="icon" shape="circle" size="large"
                  onSuccess={response => {
                    if (response.credential) onCredential('GOOGLE', response.credential)
                    else googleError()
                  }}
                  onError={googleError}
                />
              </div>
            </div>
            <span>Google</span>
            {!googleLoaded && <span role="status" className="sr-only">{t('auth.connecting')}</span>}
          </>}
        </div>
      </GoogleOAuthProvider>
    ) : (
      <button type="button" className={providerStyle} disabled={busy || !googleClientId}
        title={t('auth.providerNotConfigured', { provider: 'Google' })}>
        <span className={providerMarkStyle} aria-hidden="true"><GoogleIcon size={18} /></span>
        <span>Google</span>
      </button>
    )}
    {appleOffered && <button type="button" className={providerStyle} disabled={busy}
      aria-busy={busyProvider === 'APPLE'} onClick={() => onProviderRequest('APPLE')}>
      <span className={providerMarkStyle} aria-hidden="true"><AppleIcon size={24} color="#171717" /></span>
      <span>{busyProvider === 'APPLE' ? t('auth.connecting') : 'Apple'}</span>
    </button>}
    {facebookEnabled && <button type="button" className={providerStyle} disabled={busy}
      aria-busy={busyProvider === 'FACEBOOK'} onClick={() => onProviderRequest('FACEBOOK')}>
      <span className={providerMarkStyle} aria-hidden="true"><FacebookIcon size={22} color="#1877F2" /></span>
      <span>{busyProvider === 'FACEBOOK' ? t('auth.connecting') : 'Facebook'}</span>
    </button>}
  </div>
}
