/**
 * Global type declarations for Vinnot React frontend
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_APP_ENV: string
  readonly VITE_MOCK_API: string
  readonly VITE_FEATURE_SOCIAL_LOGIN: string
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID: string
  readonly VITE_APPLE_CLIENT_ID: string
  readonly VITE_APPLE_REDIRECT_URI: string
  readonly VITE_FACEBOOK_APP_ID: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  google: typeof google
}
