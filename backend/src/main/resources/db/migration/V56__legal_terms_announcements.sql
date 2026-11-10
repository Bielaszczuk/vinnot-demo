-- #309: when a new terms acceptance revision is published, everyone who accepted an earlier one is emailed in batches
-- before it becomes required. One row per revision keeps the batch cursor. New table only: the previous binary ignores it.
CREATE TABLE legal_terms_announcements (
    acceptance_revision varchar(40) PRIMARY KEY,
    last_user_id uuid,
    completed_at timestamptz,
    started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
