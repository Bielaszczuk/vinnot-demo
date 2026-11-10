-- Preserve visibility of existing non-draft event links; new drafts remain private
-- even when cancelled/completed without first being published.
ALTER TABLE events ADD COLUMN published_once BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE events SET published_once = TRUE WHERE status <> 'DRAFT';
