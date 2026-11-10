-- Event cancelled and event changed notices (#300).
-- 1. The application now emails each attendee of a cancelled event (reason and refund information), so the
--    trigger skips the generic attendee copy for that cascade, as V40 already did for the organizer copy.
--    Rollout window: while the previous binary still runs after this migration, attendees of an event
--    cancelled in that window get no email. Deploy the binary right after the migration.
-- 2. events.schedule_version counts changes to date, time or venue; change notices are keyed on it.
--    Additive with a default: the previous binary never writes it and keeps working.

ALTER TABLE events ADD COLUMN schedule_version bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION enqueue_event_registration_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    recipient text;
    event_organizer uuid;
    event_status text;
    event_cascade boolean;
    skip_organizer boolean;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.notification_version = OLD.notification_version THEN RETURN NEW; END IF;
    SELECT e.organizer_id, e.status INTO event_organizer, event_status FROM events e WHERE e.id = NEW.event_id;
    event_cascade := TG_OP = 'UPDATE' AND event_status = 'CANCELLED' AND NEW.status = 'CANCELLED'
        AND OLD.status IS DISTINCT FROM 'CANCELLED';
    skip_organizer := COALESCE(NEW.last_actor_id = event_organizer, false) OR event_cascade;
    FOREACH recipient IN ARRAY ARRAY['ATTENDEE','ORGANIZER'] LOOP
        CONTINUE WHEN recipient = 'ORGANIZER' AND skip_organizer;
        CONTINUE WHEN recipient = 'ATTENDEE' AND event_cascade;
        INSERT INTO external_effects(id,kind,deduplication_key,payload)
        VALUES(gen_random_uuid(),'EVENT_REGISTRATION_CHANGED',
            'event-registration:' || NEW.id || ':' || NEW.notification_version || ':' || recipient,
            jsonb_build_object('registrationId',NEW.id,'version',NEW.notification_version,'recipient',recipient));
    END LOOP;
    RETURN NEW;
END $$;
