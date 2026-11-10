-- Lease-based rotation is fenced against reconnection and isolated per environment.
ALTER TABLE payment_accounts ADD COLUMN renewal_lease_id uuid;
ALTER TABLE payment_accounts ADD COLUMN renewal_lease_until timestamptz;
ALTER TABLE payment_accounts ADD COLUMN renewal_retry_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE payment_accounts ADD COLUMN reconnect_required boolean NOT NULL DEFAULT false;
CREATE INDEX idx_payment_account_renewal ON payment_accounts(environment, expires_at, renewal_retry_at)
    WHERE expires_at IS NOT NULL AND NOT reconnect_required;
CREATE INDEX idx_event_registrations_attendee ON event_registrations(user_id, created_at DESC, id DESC);
