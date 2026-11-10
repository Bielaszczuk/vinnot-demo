-- Existing accounts/tokens remain valid at generation zero until a security change.
ALTER TABLE users ADD COLUMN session_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE refresh_tokens ADD COLUMN session_version BIGINT NOT NULL DEFAULT 0;
