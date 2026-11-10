-- Addresses that hard-bounced or complained (#296). Only a SHA-256 fingerprint of the normalized
-- address is kept, so the list itself holds no readable email. Additive: older binaries ignore it.

CREATE TABLE email_suppressions (
    address_hash char(64) PRIMARY KEY,
    reason varchar(20) NOT NULL,
    suppressed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_event_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_suppression_reason CHECK (reason IN ('HARD_BOUNCE', 'COMPLAINT'))
);

-- Retention scans exhausted notification jobs by age.
CREATE INDEX idx_external_effects_exhausted_notifications ON external_effects (created_at)
    WHERE kind = 'NOTIFICATION' AND attempts >= 10;
