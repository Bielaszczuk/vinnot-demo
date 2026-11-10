-- Engagement signals used to personalise suggestions and choose when to send them (#405), and the REMINDERS
-- preference category. Additive: the previous binary ignores the new tables and never stores REMINDERS.
-- Every row belongs to a user and goes with the account; rows older than the retention window (180 days by
-- default) are purged in batches by the application.

-- One row per user, content and UTC day: repeated opens of the same detail on the same day only add to `views`.
CREATE TABLE content_views (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind varchar(10) NOT NULL,
    entity_id uuid NOT NULL,
    view_day date NOT NULL,
    views integer NOT NULL DEFAULT 1,
    last_viewed_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, kind, entity_id, view_day),
    CONSTRAINT chk_content_view_kind CHECK (kind IN ('WINE', 'ROUTE', 'EVENT', 'WINERY')),
    CONSTRAINT chk_content_view_count CHECK (views > 0)
);

CREATE INDEX idx_content_views_kind_day ON content_views (kind, view_day);
CREATE INDEX idx_content_views_day ON content_views (view_day);

-- The last recorded app open per user. It also throttles opens: a new one is recorded only after the gap.
CREATE TABLE user_activity (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_active_at timestamptz NOT NULL
);

-- Recorded app opens; their hour in the user's time zone gives the usual open hour.
CREATE TABLE app_opens (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opened_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, opened_at)
);

CREATE INDEX idx_app_opens_opened_at ON app_opens (opened_at);

-- Pushes the user opened, at most once per push (its dedupe ref).
CREATE TABLE push_opens (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref varchar(180) NOT NULL,
    type varchar(60) NOT NULL,
    opened_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, ref)
);

CREATE INDEX idx_push_opens_opened_at ON push_opens (opened_at);

-- REMINDERS joins the optional categories a user can store a choice for. V42's comment that promotional
-- categories start off is outdated: every listed category is on until the user turns it off (#347).
ALTER TABLE notification_preferences DROP CONSTRAINT chk_notification_preference_category;
ALTER TABLE notification_preferences ADD CONSTRAINT chk_notification_preference_category CHECK (
    category IN ('EVENTS_NEARBY', 'COMMUNITY', 'RECOMMENDATIONS', 'NEWSLETTER', 'REMINDERS')) NOT VALID;
ALTER TABLE notification_preferences VALIDATE CONSTRAINT chk_notification_preference_category;
