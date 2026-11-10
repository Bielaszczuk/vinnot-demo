-- Event reminders (#301). reminded_at records that a confirmed registration was reminded about its event, so a
-- reminder is sent once across instances and restarts (the outbox deletes delivered rows, so its unique key alone
-- cannot guarantee that). A schedule change clears it so the attendee is reminded of the new date.
-- Additive and nullable: the previous binary never reads or writes it.
ALTER TABLE event_registrations ADD COLUMN reminded_at timestamptz;
CREATE INDEX idx_event_registrations_reminder_pending ON event_registrations(event_id)
    WHERE status = 'CONFIRMED' AND reminded_at IS NULL;
