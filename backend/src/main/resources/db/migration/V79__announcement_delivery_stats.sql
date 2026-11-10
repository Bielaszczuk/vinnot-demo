-- #490: what happened to each administrator's announcement, so its history shows emails sent and failed, pushes sent
-- and failed (late receipts included) and pushes opened, next to the accounts it targeted. A new table and a nullable
-- column only, nothing existing changes: the previous binary ignores both, and announcements sent before have no row,
-- which reads as zero.

-- One row per announcement, created by its first count. Every count is an atomic increment.
CREATE TABLE announcement_delivery_stats (
    announcement_id uuid PRIMARY KEY REFERENCES announcements(id) ON DELETE CASCADE,
    emails_sent bigint NOT NULL DEFAULT 0,
    emails_failed bigint NOT NULL DEFAULT 0,
    pushes_sent bigint NOT NULL DEFAULT 0,
    pushes_failed bigint NOT NULL DEFAULT 0,
    pushes_opened bigint NOT NULL DEFAULT 0
);

-- The announcement a ticket belongs to, so an undelivered receipt counts against it. Other tickets and older rows have none.
ALTER TABLE push_receipts ADD COLUMN announcement_id uuid;
