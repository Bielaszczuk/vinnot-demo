-- Private reports are separate from public content and never confer moderation powers.
CREATE TABLE community_reports (
    id uuid PRIMARY KEY,
    reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
    target_type varchar(20) NOT NULL CHECK (target_type IN ('REVIEW','COMMENT','USER','EVENT','WINE_ROUTE')),
    target_id uuid NOT NULL,
    author_id uuid REFERENCES users(id) ON DELETE SET NULL,
    reason varchar(30) NOT NULL CHECK (reason IN ('SPAM','HARASSMENT','HATE','SEXUAL_CONTENT','VIOLENCE','PRIVACY','MISINFORMATION','OTHER')),
    description varchar(2000) NOT NULL,
    excerpt varchar(2000) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED')),
    reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
    decision varchar(2000),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX community_report_open_unique ON community_reports(reporter_id,target_type,target_id)
    WHERE status IN ('OPEN','IN_REVIEW');
CREATE INDEX community_report_reporter_time ON community_reports(reporter_id,created_at DESC);
CREATE INDEX community_report_author ON community_reports(author_id);
CREATE INDEX community_report_reviewer ON community_reports(reviewer_id);
CREATE INDEX community_report_queue ON community_reports(status,created_at,id);
CREATE TABLE community_report_actions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id uuid NOT NULL REFERENCES community_reports(id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
    status varchar(20) NOT NULL,
    decision varchar(2000),
    created_at timestamptz NOT NULL
);
CREATE INDEX community_report_actions_reviewer ON community_report_actions(reviewer_id);
CREATE INDEX community_report_actions_report ON community_report_actions(report_id,id);
CREATE TABLE user_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id,blocked_id),
    CHECK(blocker_id <> blocked_id)
);
CREATE INDEX user_blocks_reverse ON user_blocks(blocked_id,blocker_id);
