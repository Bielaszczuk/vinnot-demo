/**
 * Typed environment variable access
 *
 * Provides type-safe access to environment variables with:
 * - Default values for development
 * - Validation for required variables in production
 * - Type coercion for booleans
 */

// Environment Helpers

const isProd = import.meta.env.PROD
const isDev = import.meta.env.DEV

/**
 * Get a required string environment variable
 * Throws in production if missing, uses default in development
 */
function getRequiredEnvString(key: string, devDefault: string): string {
  const value = import.meta.env[key]

  if (value === undefined || value === '') {
    if (isProd) {
      throw new Error(`[ENV] Missing required environment variable: ${key}`)
    }
    console.warn(`[ENV] Using default value for ${key}: "${devDefault}"`)
    return devDefault
  }

  return value
}

/**
 * Get an optional string environment variable
 */
function getOptionalEnvString(key: string, defaultValue: string = ''): string {
  const value = import.meta.env[key]
  return value !== undefined && value !== '' ? value : defaultValue
}

/**
 * Get a boolean environment variable
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key]

  if (value === undefined || value === '') {
    return defaultValue
  }

  return value === 'true' || value === '1'
}

// Environment Configuration

/**
 * Validated environment configuration
 *
 * Required variables will throw in production if missing.
 * Optional variables have sensible defaults.
 */
export const env = {
  // API Configuration
  /** Base URL for API requests */
  apiBaseUrl: getRequiredEnvString('VITE_API_BASE_URL', '/api'),

  /** Enable mock API (MSW) - set VITE_MOCK_API=true to enable */
  mockApi: getEnvBoolean('VITE_MOCK_API', false),

  // App Configuration
  /** Current environment: development | staging | production */
  appEnv: getOptionalEnvString('VITE_APP_ENV', isDev ? 'development' : 'production'),
} as const

// Type Export

export type Env = typeof env

// Validation on Load

// Validate critical configuration in production
if (isProd) {
  const warnings: string[] = []

  // Check for mock API in production (should be disabled)
  if (env.mockApi) {
    warnings.push('VITE_MOCK_API is enabled in production - this should be false')
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('[ENV] Production configuration warnings:')
    warnings.forEach(w => console.warn(`  - ${w}`))
  }
}

// Log environment info in development
if (isDev) {
  console.log('[ENV] Environment loaded:', {
    appEnv: env.appEnv,
    apiBaseUrl: env.apiBaseUrl,
    mockApi: env.mockApi,
  })
}
