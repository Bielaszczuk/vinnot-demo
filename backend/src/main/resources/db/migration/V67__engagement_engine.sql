-- Engagement engine (#405): the durable ledger of engagement pushes, the planner's per-user planning marks and its
-- multi-instance lease. Additive: the previous binary ignores the new tables and index.

-- One row per engagement push and account, written while delivery holds the account's reservation lock, so the budget
-- (2 per rolling 7 days, 1 per local day, 48 h apart) holds however many planners or event-triggered pushes race.
-- push_sends keeps 7 days only; fatigue and content dedupe need months, so this ledger keeps a year by default.
-- holdout rows record a push the measurement group would have received; nothing was sent for them.
CREATE TABLE engagement_sends (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dedupe_key varchar(240) NOT NULL,
    notification_type varchar(60) NOT NULL,
    content_ref varchar(120),
    sent_at timestamptz NOT NULL,
    holdout boolean NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, dedupe_key)
);

-- History per account (budget, fatigue), content already suggested, measurement per type and retention.
CREATE INDEX idx_engagement_sends_user_sent ON engagement_sends (user_id, sent_at DESC);
CREATE INDEX idx_engagement_sends_content ON engagement_sends (user_id, content_ref) WHERE content_ref IS NOT NULL;
CREATE INDEX idx_engagement_sends_type_sent ON engagement_sends (notification_type, sent_at);
CREATE INDEX idx_engagement_sends_sent ON engagement_sends (sent_at);

-- When the planner last planned each account: it plans an account at most once per local day.
CREATE TABLE engagement_planning (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    planned_at timestamptz NOT NULL
);

-- One planner run at a time across instances: a run takes the lease while it is free or expired.
CREATE TABLE engagement_planner_lease (
    name varchar(40) PRIMARY KEY,
    holder varchar(120),
    lease_until timestamptz NOT NULL
);
INSERT INTO engagement_planner_lease(name, holder, lease_until) VALUES ('planner', NULL, '-infinity');

-- The planner walks the accounts of one time zone at a time in id order (keyset pages).
CREATE INDEX idx_users_timezone_id ON users (timezone, id);
