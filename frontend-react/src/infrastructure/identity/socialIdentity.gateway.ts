import { isFacebookLoginEnabled } from '@/shared/config/featureFlags'

export type BrowserSocialProvider = 'APPLE' | 'FACEBOOK'

export interface BrowserSocialCredential {
  provider: BrowserSocialProvider
  token: string
  nonce?: string
  firstName?: string
  lastName?: string
}

export interface AppleAccountDeletionCredential {
  authorizationCode: string
  clientId: string
  redirectUri: string
}

type AppleAuthorization = {
  authorization: { id_token: string; code: string }
  user?: { name?: { firstName?: string; lastName?: string } }
}

type FacebookAuthResponse = { accessToken: string }
type FacebookLoginResponse = {
  authResponse?: FacebookAuthResponse
  status?: string
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void
        signIn: () => Promise<AppleAuthorization>
      }
    }
    FB?: {
      init: (config: Record<string, unknown>) => void
      login: (
        callback: (response: FacebookLoginResponse) => void,
        config: { scope: string },
      ) => void
    }
  }
}

const APPLE_SCRIPT = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
const FACEBOOK_SCRIPT = 'https://connect.facebook.net/es_LA/sdk.js'
const SCRIPT_LOAD_TIMEOUT_MS = 15_000
const FACEBOOK_LOGIN_TIMEOUT_MS = 60_000

export const socialIdentityGateway = {
  async acquire(provider: BrowserSocialProvider): Promise<BrowserSocialCredential> {
    return provider === 'APPLE' ? acquireAppleCredential() : acquireFacebookCredential()
  },

  async acquireAppleAccountDeletionCredential(): Promise<AppleAccountDeletionCredential> {
    const { result, clientId, redirectUri } = await signInWithApple()
    if (!result.authorization.code) {
      throw new Error('Apple no devolvió la autorización necesaria para eliminar la cuenta.')
    }
    return {
      authorizationCode: result.authorization.code,
      clientId,
      redirectUri,
    }
  },
}

async function acquireAppleCredential(): Promise<BrowserSocialCredential> {
  const { result, nonce } = await signInWithApple()
  return {
    provider: 'APPLE',
    token: result.authorization.id_token,
    nonce,
    firstName: result.user?.name?.firstName,
    lastName: result.user?.name?.lastName,
  }
}

async function signInWithApple(): Promise<{
  result: AppleAuthorization
  nonce: string
  clientId: string
  redirectUri: string
}> {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined
  const redirectURI = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined
  if (!clientId || !redirectURI) throw new Error('Apple Sign In no está configurado.')
  await loadScript(APPLE_SCRIPT, 'apple-sign-in-sdk')
  if (!window.AppleID) throw new Error('No se pudo cargar Apple Sign In.')
  const nonce = randomToken()
  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI,
    state: randomToken(),
    nonce,
    usePopup: true,
  })
  const result = await window.AppleID.auth.signIn()
  return { result, nonce, clientId, redirectUri: redirectURI }
}

async function acquireFacebookCredential(): Promise<BrowserSocialCredential> {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined
  if (!isFacebookLoginEnabled() || !appId) throw new Error('Facebook Login no está configurado.')
  if (window.location.protocol !== 'https:') {
    throw new Error('Facebook Login requiere HTTPS. Usá el entorno desplegado para probarlo.')
  }
  await loadScript(FACEBOOK_SCRIPT, 'facebook-login-sdk')
  if (!window.FB) throw new Error('No se pudo cargar Facebook Login.')
  window.FB.init({ appId, cookie: true, xfbml: false, version: 'v23.0' })
  const token = await new Promise<string>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Facebook no respondió a tiempo. Cerrá el popup e intentá nuevamente.'))
    }, FACEBOOK_LOGIN_TIMEOUT_MS)

    window.FB?.login((response) => {
      window.clearTimeout(timeoutId)
      if (response.authResponse?.accessToken) {
        resolve(response.authResponse.accessToken)
        return
      }
      reject(new Error('Inicio con Facebook cancelado o no autorizado.'))
    }, { scope: 'public_profile,email' })
  })
  return { provider: 'FACEBOOK', token }
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function loadScript(source: string, id: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null
  if (existing?.dataset.loaded === 'true') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script')
    const timeoutId = window.setTimeout(() => {
      reject(new Error('El proveedor de identidad no respondió a tiempo.'))
    }, SCRIPT_LOAD_TIMEOUT_MS)
    script.id = id
    script.src = source
    script.async = true
    script.defer = true
    script.onload = () => {
      window.clearTimeout(timeoutId)
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => {
      window.clearTimeout(timeoutId)
      reject(new Error('No se pudo cargar el proveedor de identidad.'))
    }
    if (!existing) document.head.appendChild(script)
  })
}
