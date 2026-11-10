-- Separate provider authorization from event publication and registration state.
CREATE TABLE payment_accounts (
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider varchar(32) NOT NULL CHECK (provider = 'MERCADO_PAGO'),
    environment varchar(16) NOT NULL CHECK (environment = 'SANDBOX'),
    pending_state_hash varchar(43),
    seller_id varchar(20),
    access_token_ciphertext text,
    refresh_token_ciphertext text,
    expires_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (owner_id, provider, environment),
    CHECK ((seller_id IS NULL AND access_token_ciphertext IS NULL AND refresh_token_ciphertext IS NULL AND expires_at IS NULL)
        OR (seller_id IS NOT NULL AND access_token_ciphertext IS NOT NULL AND refresh_token_ciphertext IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE TABLE payment_connection_attempts (
    owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_hash varchar(43) UNIQUE NOT NULL,
    verifier_ciphertext text NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE INDEX idx_payment_attempt_expiration ON payment_connection_attempts(expires_at);
