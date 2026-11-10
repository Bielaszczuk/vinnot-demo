-- Organizer push digest (#304). Registration activity on an event is counted here instead of pushing once per
-- registration; the first activity opens a short window and a scheduler turns each due row into one push, deleting
-- it. Emails to the organizer stay one per registration. Rows go with their event or organizer account.
-- New table: the previous binary never reads or writes it.
CREATE TABLE organizer_push_digests (
    event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    organizer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed integer NOT NULL DEFAULT 0 CHECK (confirmed >= 0),
    requested integer NOT NULL DEFAULT 0 CHECK (requested >= 0),
    cancelled integer NOT NULL DEFAULT 0 CHECK (cancelled >= 0),
    due_at timestamptz NOT NULL
);
CREATE INDEX idx_organizer_push_digests_due ON organizer_push_digests(due_at);
CREATE INDEX idx_organizer_push_digests_organizer ON organizer_push_digests(organizer_id);
