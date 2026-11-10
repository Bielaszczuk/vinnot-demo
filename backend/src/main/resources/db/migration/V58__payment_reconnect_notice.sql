-- #309: the credential expiry of the Mercado Pago connection whose organizer was already asked to reconnect. Email
-- deduplication only lasts while the job is queued, so this column keeps the notice to one per connection.
-- Nullable and additive: the previous binary ignores it.
ALTER TABLE payment_accounts ADD COLUMN reconnect_notified_for timestamptz;
