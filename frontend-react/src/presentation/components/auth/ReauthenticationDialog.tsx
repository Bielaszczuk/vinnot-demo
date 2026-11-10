import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReauthentication } from '@hooks/useReauthentication'
import { Modal } from '@components/ui/Modal'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { AuthSocialButtons } from '@components/auth/AuthSocialButtons'

export function ReauthenticationDialog() {
  const challenge = useReauthentication()
  return challenge.open ? <ConfirmationForm challenge={challenge} /> : null
}

function ConfirmationForm({ challenge }: { challenge: ReturnType<typeof useReauthentication> }) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const withProvider = challenge.providers.length > 0
  return <Modal isOpen onClose={challenge.cancel} title={t('reauthentication.title')} size="sm">
    <p className="mb-5 border-b border-gray-200 pb-5 text-sm leading-relaxed text-gray-600">
      {t(withProvider ? 'reauthentication.descriptionWithProvider' : 'reauthentication.description')}
    </p>
    {withProvider && <>
      <AuthSocialButtons providers={challenge.providers} disabled={challenge.busy} busyProvider={challenge.busyProvider}
        onCredential={(_provider, token) => void challenge.confirmWithGoogle(token)}
        onProviderRequest={provider => { if (provider === 'APPLE') void challenge.confirmWithApple() }}
        onProviderError={provider => { if (provider !== 'FACEBOOK') challenge.providerFailed(provider) }} />
      {challenge.failedProvider && <p role="alert" className="-mt-3 mb-4 text-sm text-red-600">
        {t('reauthentication.providerFailed', { provider: challenge.failedProvider === 'GOOGLE' ? 'Google' : 'Apple' })}
      </p>}
      <p className="mb-4 text-center text-xs uppercase tracking-wider text-gray-400">{t('reauthentication.orPassword')}</p>
    </>}
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void challenge.confirm(password) }}>
      <Input type="password" autoComplete="current-password" autoFocus={!withProvider} required maxLength={128}
        label={t('reauthentication.password')} value={password} onChange={event => setPassword(event.target.value)}
        error={challenge.failed ? t('reauthentication.failed') : undefined} disabled={challenge.busy} />
      <Button type="submit" className="w-full" disabled={!password || challenge.busy}>{challenge.busy && !challenge.busyProvider ? t('reauthentication.checking') : t('reauthentication.confirm')}</Button>
      <Button type="button" variant="ghost" className="w-full" onClick={challenge.cancel}>{t('reauthentication.cancel')}</Button>
      <Link to="/forgot-password" onClick={challenge.cancel} className="block text-center text-sm text-wine-700 underline underline-offset-4">{t('reauthentication.recovery')}</Link>
    </form>
  </Modal>
}
