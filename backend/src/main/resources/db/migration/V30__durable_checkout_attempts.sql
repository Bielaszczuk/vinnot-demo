-- Checkout creation is not payment approval. One immutable sandbox attempt per registration.
CREATE TABLE payment_checkout_attempts (
    id uuid PRIMARY KEY,
    registration_id uuid NOT NULL REFERENCES event_registrations(id),
    event_id uuid NOT NULL REFERENCES events(id),
    buyer_id uuid NOT NULL REFERENCES users(id),
    organizer_id uuid NOT NULL REFERENCES users(id),
    provider varchar(32) NOT NULL DEFAULT 'MERCADO_PAGO' CHECK (provider = 'MERCADO_PAGO'),
    environment varchar(16) NOT NULL DEFAULT 'SANDBOX' CHECK (environment = 'SANDBOX'),
    seller_id varchar(20) NOT NULL CHECK (seller_id ~ '^[1-9][0-9]{0,19}$'),
    title varchar(250) NOT NULL CHECK (length(trim(title)) > 0),
    unit_price numeric(19,2) NOT NULL CHECK (unit_price > 0),
    quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
    currency varchar(3) NOT NULL CHECK (currency = 'ARS'),
    total_amount numeric(19,2) NOT NULL CHECK (total_amount = unit_price * quantity),
    commission_amount numeric(19,2) NOT NULL CHECK (commission_amount = round(total_amount * 0.03, 2)),
    commission_basis_points integer NOT NULL CHECK (commission_basis_points = 300),
    commission_policy varchar(50) NOT NULL CHECK (commission_policy = 'VINNOT_3_PERCENT_V1'),
    expires_at timestamptz NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'PREPARED' CHECK (status IN ('PREPARED','CREATING','READY','UNCERTAIN')),
    provider_reference varchar(200),
    checkout_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    dispatched_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (registration_id, provider, environment),
    UNIQUE (provider, environment, provider_reference),
    CHECK ((status = 'PREPARED') = (dispatched_at IS NULL)),
    CHECK ((status = 'READY' AND provider_reference IS NOT NULL AND length(trim(provider_reference)) > 0
             AND checkout_url IS NOT NULL)
        OR (status <> 'READY' AND provider_reference IS NULL AND checkout_url IS NULL))
);
CREATE INDEX idx_checkout_reconciliation ON payment_checkout_attempts(dispatched_at, id)
    WHERE status IN ('CREATING','UNCERTAIN');
CREATE INDEX idx_checkout_event ON payment_checkout_attempts(event_id);
CREATE INDEX idx_checkout_buyer ON payment_checkout_attempts(buyer_id);
CREATE INDEX idx_checkout_organizer ON payment_checkout_attempts(organizer_id);
