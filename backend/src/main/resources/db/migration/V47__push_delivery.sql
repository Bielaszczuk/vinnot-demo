-- Push delivery (#302).
-- push_sends: which accounts already received a push request (dedupe key). Written in its own transaction after
-- each batch, so a retried job skips them; also the log the per-user daily cap counts. Kept 7 days.
-- push_receipts: Expo ticket ids waiting for their delivery receipt (checked after 15 minutes, kept 24 hours).
CREATE TABLE push_sends (
    dedupe_key varchar(240) NOT NULL,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category   varchar(32) NOT NULL,
    capped     boolean NOT NULL,
    sent_at    timestamptz NOT NULL,
    PRIMARY KEY (dedupe_key, user_id)
);
CREATE INDEX idx_push_sends_capped ON push_sends(user_id, sent_at) WHERE capped;
CREATE INDEX idx_push_sends_sent_at ON push_sends(sent_at);
CREATE TABLE push_receipts (
    ticket_id  varchar(64) PRIMARY KEY,
    token      varchar(255) NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE INDEX idx_push_receipts_created ON push_receipts(created_at);
