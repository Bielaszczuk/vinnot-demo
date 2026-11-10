CREATE TABLE external_effects (
    id uuid PRIMARY KEY,
    kind varchar(64) NOT NULL,
    deduplication_key varchar(256) NOT NULL UNIQUE,
    payload jsonb NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error_type varchar(255),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_external_effects_pending ON external_effects (next_attempt_at, id) WHERE attempts < 10;

CREATE INDEX idx_wines_managed_label_url ON wines (image_url text_pattern_ops)
    WHERE image_url LIKE '/api/uploads/wine-labels/%';
