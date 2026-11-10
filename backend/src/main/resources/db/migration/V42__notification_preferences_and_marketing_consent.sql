-- Notification preferences per category and channel, and the marketing consent history (#294).
-- Additive: the previous binary ignores both tables. A missing row means the category's default
-- (optional categories on, promotional ones off); transactional categories are never stored.

CREATE TABLE notification_preferences (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category varchar(40) NOT NULL,
    channel varchar(10) NOT NULL,
    enabled boolean NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, category, channel),
    CONSTRAINT chk_notification_preference_category CHECK (
        category IN ('EVENTS_NEARBY', 'COMMUNITY', 'RECOMMENDATIONS', 'NEWSLETTER')),
    CONSTRAINT chk_notification_preference_channel CHECK (channel IN ('EMAIL', 'PUSH'))
);

-- Append-only: each grant or revocation keeps its time and source; the latest row is the current decision.
CREATE TABLE marketing_consent_events (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted boolean NOT NULL,
    source varchar(30) NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_marketing_consent_source CHECK (source IN ('WEB', 'MOBILE', 'EMAIL_UNSUBSCRIBE'))
);

CREATE INDEX idx_marketing_consent_events_user ON marketing_consent_events (user_id, occurred_at DESC);

CREATE FUNCTION marketing_consent_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'marketing consent events are append-only';
END $$;
CREATE TRIGGER marketing_consent_events_no_update BEFORE UPDATE ON marketing_consent_events
    FOR EACH ROW EXECUTE FUNCTION marketing_consent_events_immutable();
