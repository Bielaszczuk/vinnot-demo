-- Only idempotency fingerprints live here; message data is removed from the outbox after delivery.
CREATE TABLE support_request_receipts (
    id uuid PRIMARY KEY,
    content_hash varchar(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_support_receipt_expiry ON support_request_receipts(created_at);
CREATE INDEX idx_support_outbox_expiry ON external_effects(created_at) WHERE kind = 'SUPPORT_REQUEST';

