export class BenchmarkAuthSession {
  #accessToken
  #refreshToken

  constructor({ apiBase, accessToken, refreshToken, usernameOrEmail, password, fetchImpl = fetch }) {
    this.apiBase = apiBase
    this.#accessToken = accessToken ?? null
    this.#refreshToken = refreshToken ?? null
    this.usernameOrEmail = usernameOrEmail ?? null
    this.password = password ?? null
    this.fetchImpl = fetchImpl
  }

  async initialize() {
    if (this.#accessToken) return
    this.#requireCredentials()
    await this.#login()
  }

  authorizationHeaders() {
    if (!this.#accessToken) throw new Error('Benchmark authentication has not been initialized')
    return { Authorization: `Bearer ${this.#accessToken}` }
  }

  async recoverFromUnauthorized() {
    if (this.#refreshToken && await this.#tryRefresh()) return
    this.#requireCredentials('The benchmark access token expired')
    await this.#login()
  }

  async #tryRefresh() {
    const response = await this.fetchImpl(`${this.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.#refreshToken }),
    })
    if (!response.ok) return false
    this.#updateTokens(await response.json())
    return true
  }

  async #login() {
    const response = await this.fetchImpl(`${this.apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: this.usernameOrEmail,
        password: this.password,
      }),
    })
    if (!response.ok) {
      throw new Error(`Benchmark login failed with HTTP ${response.status}`)
    }
    this.#updateTokens(await response.json())
  }

  #updateTokens(session) {
    if (!session?.accessToken) throw new Error('Benchmark authentication returned no access token')
    this.#accessToken = session.accessToken
    this.#refreshToken = session.refreshToken ?? this.#refreshToken
  }

  #requireCredentials(prefix = 'VINNOT_ACCESS_TOKEN is required') {
    if (this.usernameOrEmail && this.password) return
    throw new Error(`${prefix}; provide VINNOT_BENCHMARK_USERNAME and VINNOT_BENCHMARK_PASSWORD`)
  }
}
