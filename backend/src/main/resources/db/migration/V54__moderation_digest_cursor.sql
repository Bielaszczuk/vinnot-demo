-- #307: the moderation team's email digest remembers up to when it has reported new work. A single row, started at the
-- migration so existing queues are not announced. New table only: the previous binary ignores it.
CREATE TABLE moderation_digest_cursor (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    covered_until timestamptz NOT NULL
);

INSERT INTO moderation_digest_cursor (id, covered_until) VALUES (1, CURRENT_TIMESTAMP);
