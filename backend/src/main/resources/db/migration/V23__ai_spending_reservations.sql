-- Conservative per-environment accounting. Pending/unknown requests keep their reservation.
CREATE TABLE ai_spending_windows (
    window_key VARCHAR(32) PRIMARY KEY,
    reserved_usd NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (reserved_usd >= 0),
    spent_usd NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (spent_usd >= 0)
);

CREATE TABLE ai_spending_reservations (
    id UUID PRIMARY KEY,
    model VARCHAR(128) NOT NULL,
    maximum_usd NUMERIC(18, 8) NOT NULL CHECK (maximum_usd > 0),
    observed_usd NUMERIC(18, 8) CHECK (observed_usd >= 0),
    outcome VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (outcome IN ('PENDING', 'UNKNOWN', 'ACCOUNTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE ai_spending_reservation_windows (
    reservation_id UUID NOT NULL REFERENCES ai_spending_reservations(id),
    window_key VARCHAR(32) NOT NULL REFERENCES ai_spending_windows(window_key),
    PRIMARY KEY (reservation_id, window_key)
);

CREATE INDEX idx_ai_spending_reservation_window ON ai_spending_reservation_windows(window_key);
CREATE INDEX idx_ai_spending_unresolved ON ai_spending_reservations(created_at)
    WHERE outcome IN ('PENDING', 'UNKNOWN');
