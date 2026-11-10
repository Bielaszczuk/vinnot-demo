-- Capture committed registration state transitions, including bulk event cancellations.
-- No provider calls or notification business rules run in the database.
ALTER TABLE event_registrations ADD COLUMN notification_version bigint NOT NULL DEFAULT 0;
ALTER TABLE event_registrations ADD COLUMN notification_language varchar(2) NOT NULL DEFAULT 'es'
    CHECK (notification_language IN ('es','en'));
CREATE FUNCTION event_registration_change_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.notification_version := 1;
    ELSIF (NEW.status,NEW.payment_status) IS DISTINCT FROM (OLD.status,OLD.payment_status) THEN
        NEW.notification_version := OLD.notification_version + 1;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER event_registration_version BEFORE INSERT OR UPDATE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION event_registration_change_version();
CREATE FUNCTION enqueue_event_registration_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recipient text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.notification_version = OLD.notification_version THEN RETURN NEW; END IF;
    FOREACH recipient IN ARRAY ARRAY['ATTENDEE','ORGANIZER'] LOOP
        INSERT INTO external_effects(id,kind,deduplication_key,payload)
        VALUES(gen_random_uuid(),'EVENT_REGISTRATION_CHANGED',
            'event-registration:' || NEW.id || ':' || NEW.notification_version || ':' || recipient,
            jsonb_build_object('registrationId',NEW.id,'version',NEW.notification_version,'recipient',recipient));
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER event_registration_change_outbox AFTER INSERT OR UPDATE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION enqueue_event_registration_change();
