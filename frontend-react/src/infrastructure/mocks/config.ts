/**
 * MSW Mock Configuration
 *
 * Configure mock behavior like latency, error rates, etc.
 */

export interface MockConfig {
  /** Simulated network latency in ms */
  latency: {
    min: number
    max: number
  }
  /** Error simulation settings */
  errors: {
    /** Enable random errors */
    enabled: boolean
    /** Probability of error (0-1) */
    rate: number
    /** Specific endpoints to always fail */
    failEndpoints: string[]
  }
  /** Token refresh settings */
  auth: {
    /** Probability that refresh token will fail (0-1) */
    refreshFailRate: number
    /** Token expiry time in ms for testing */
    tokenExpiryMs: number
  }
}

/**
 * Default mock configuration
 * Can be overridden via localStorage for testing
 */
export const defaultMockConfig: MockConfig = {
  latency: {
    min: 100,
    max: 500,
  },
  errors: {
    enabled: false,
    rate: 0.1,
    failEndpoints: [],
  },
  auth: {
    refreshFailRate: 0.1,
    tokenExpiryMs: 30 * 60 * 1000, // 30 minutes
  },
}

/**
 * Get current mock configuration
 * Merges localStorage overrides with defaults
 */
export function getMockConfig(): MockConfig {
  try {
    const stored = localStorage.getItem('msw-config')
    if (stored) {
      return { ...defaultMockConfig, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return defaultMockConfig
}

/**
 * Update mock configuration
 */
export function setMockConfig(config: Partial<MockConfig>): void {
  const current = getMockConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('msw-config', JSON.stringify(updated))
}

/**
 * Reset mock configuration to defaults
 */
export function resetMockConfig(): void {
  localStorage.removeItem('msw-config')
}

/**
 * Get random latency based on config
 */
export function getRandomLatency(): number {
  const config = getMockConfig()
  const { min, max } = config.latency
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Check if request should fail based on config
 */
export function shouldFail(endpoint?: string): boolean {
  const config = getMockConfig()

  if (!config.errors.enabled) {
    return false
  }

  // Check if endpoint is in fail list
  if (endpoint && config.errors.failEndpoints.includes(endpoint)) {
    return true
  }

  // Random failure based on rate
  return Math.random() < config.errors.rate
}

/**
 * Check if token refresh should fail
 */
export function shouldRefreshFail(): boolean {
  const config = getMockConfig()
  return Math.random() < config.auth.refreshFailRate
}

