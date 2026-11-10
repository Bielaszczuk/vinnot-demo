-- Push reminder about two hours before an event (#304). reminded_soon_at records that a confirmed registration got
-- it, independently of the day-before reminder in reminded_at; a schedule change clears both.
-- Additive and nullable: the previous binary never reads or writes it.
ALTER TABLE event_registrations ADD COLUMN reminded_soon_at timestamptz;
CREATE INDEX idx_event_registrations_soon_reminder_pending ON event_registrations(event_id)
    WHERE status = 'CONFIRMED' AND reminded_soon_at IS NULL;
