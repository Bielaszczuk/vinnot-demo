-- Sandbox financial evidence. No payer/card data and no cascade deletion of financial history.
CREATE TABLE payment_reconciliation_jobs (
    attempt_id uuid PRIMARY KEY REFERENCES payment_checkout_attempts(id),
    revision bigint NOT NULL DEFAULT 0,
    lease_token uuid,
    lease_until timestamptz,
    next_check_at timestamptz NOT NULL DEFAULT now(),
    last_checked_at timestamptz,
    failures integer NOT NULL DEFAULT 0,
    last_failure varchar(80),
    CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
CREATE INDEX idx_payment_job_due ON payment_reconciliation_jobs(next_check_at,attempt_id);
CREATE TABLE payment_observations (
    payment_id varchar(20) PRIMARY KEY CHECK (payment_id ~ '^[1-9][0-9]{0,19}$'),
    attempt_id uuid NOT NULL REFERENCES payment_checkout_attempts(id),
    seller_id varchar(20) NOT NULL,
    amount numeric(19,2) NOT NULL CHECK (amount > 0),
    currency varchar(3) NOT NULL CHECK (currency = 'ARS'),
    application_fee numeric(19,2) NOT NULL CHECK (application_fee >= 0),
    refunded_amount numeric(19,2) NOT NULL CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
    status varchar(24) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','REFUNDED','CHARGED_BACK','IN_MEDIATION')),
    provider_updated_at timestamptz NOT NULL,
    approved_at timestamptz,
    credited boolean NOT NULL DEFAULT false,
    needs_review boolean NOT NULL DEFAULT false,
    observed_at timestamptz NOT NULL DEFAULT now()
);
-- Remains credited even after reversal: a second payment must never re-confirm the same reservation.
CREATE UNIQUE INDEX idx_payment_one_credit ON payment_observations(attempt_id) WHERE credited;
CREATE INDEX idx_payment_attempt ON payment_observations(attempt_id);
CREATE TABLE payment_refund_intents (
    id uuid PRIMARY KEY,
    attempt_id uuid NOT NULL REFERENCES payment_checkout_attempts(id),
    payment_id varchar(20) NOT NULL UNIQUE REFERENCES payment_observations(payment_id) DEFERRABLE INITIALLY DEFERRED,
    amount numeric(19,2) NOT NULL CHECK (amount > 0),
    status varchar(16) NOT NULL CHECK (status IN ('PREPARED','SENDING','UNCERTAIN','SUCCEEDED','REVIEW')),
    created_at timestamptz NOT NULL DEFAULT now(),
    dispatched_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refund_attempt ON payment_refund_intents(attempt_id);
CREATE INDEX idx_checkout_dispatched ON payment_checkout_attempts(dispatched_at,id) WHERE dispatched_at IS NOT NULL;
