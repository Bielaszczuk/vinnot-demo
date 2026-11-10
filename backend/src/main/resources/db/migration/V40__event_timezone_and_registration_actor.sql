-- Event emails show the venue's local time, and organizers are not emailed about their own actions (#295).
-- Additive: the previous binary keeps working because inserts that name no zone are filled by a trigger
-- and registration updates that name no actor leave last_actor_id NULL, which behaves as before.

-- 1. Venue time zone (IANA id), the same for every recipient. Existing events take their organizer's zone.
ALTER TABLE events ADD COLUMN timezone varchar(64);
UPDATE events e SET timezone = u.timezone FROM users u WHERE u.id = e.organizer_id;
UPDATE events SET timezone = 'America/Argentina/Buenos_Aires' WHERE timezone IS NULL;
ALTER TABLE events ALTER COLUMN timezone SET NOT NULL;

CREATE FUNCTION event_default_timezone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.timezone IS NULL THEN
        NEW.timezone := COALESCE((SELECT u.timezone FROM users u WHERE u.id = NEW.organizer_id),
            'America/Argentina/Buenos_Aires');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER event_timezone_default BEFORE INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION event_default_timezone();

-- 2. Who made the latest registration change. Every application write sets it (NULL when no person acted),
-- so it never carries over to a later change. Not a foreign key: deleting an account never rewrites registrations.
ALTER TABLE event_registrations ADD COLUMN last_actor_id uuid;

-- 3. Same keys, kind and payload as V35. The organizer copy is skipped when the organizer made the change
-- themselves, and for the cancellations caused by cancelling the whole event (the application sends the
-- organizer one summary instead when someone else cancelled it).
CREATE OR REPLACE FUNCTION enqueue_event_registration_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    recipient text;
    event_organizer uuid;
    event_status text;
    skip_organizer boolean;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.notification_version = OLD.notification_version THEN RETURN NEW; END IF;
    SELECT e.organizer_id, e.status INTO event_organizer, event_status FROM events e WHERE e.id = NEW.event_id;
    skip_organizer := COALESCE(NEW.last_actor_id = event_organizer, false)
        OR (TG_OP = 'UPDATE' AND event_status = 'CANCELLED' AND NEW.status = 'CANCELLED'
            AND OLD.status IS DISTINCT FROM 'CANCELLED');
    FOREACH recipient IN ARRAY ARRAY['ATTENDEE','ORGANIZER'] LOOP
        CONTINUE WHEN recipient = 'ORGANIZER' AND skip_organizer;
        INSERT INTO external_effects(id,kind,deduplication_key,payload)
        VALUES(gen_random_uuid(),'EVENT_REGISTRATION_CHANGED',
            'event-registration:' || NEW.id || ':' || NEW.notification_version || ':' || recipient,
            jsonb_build_object('registrationId',NEW.id,'version',NEW.notification_version,'recipient',recipient));
    END LOOP;
    RETURN NEW;
END $$;
