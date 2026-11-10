-- Cached comparisons created before canonical request ordering cannot safely
-- identify the original A/B orientation. They are disposable generated data.
DELETE FROM wine_comparisons;

CREATE TABLE ai_generation_leases (
    lock_key varchar(255) PRIMARY KEY,
    owner_id uuid NOT NULL,
    expires_at timestamptz NOT NULL
);

CREATE INDEX idx_ai_generation_leases_expires_at
    ON ai_generation_leases (expires_at);
