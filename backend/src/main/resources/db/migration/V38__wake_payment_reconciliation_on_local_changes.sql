-- Reconciliation backs off and parks quiet checkouts; signed webhooks wake them for provider-side changes.
-- These triggers wake them for local changes that require a refund of a credited payment: a confirmed paid
-- registration stops being confirmed, or its event is cancelled. Additive: no column, data or contract change.
-- The woken job is only scheduled ('-infinity' = due before any scheduled poll); no money moves in the database.
CREATE FUNCTION wake_registration_payment_reconciliation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE payment_reconciliation_jobs j SET revision=j.revision+1,next_check_at='-infinity'
    WHERE j.attempt_id IN (
        SELECT o.attempt_id FROM payment_observations o
        JOIN payment_checkout_attempts a ON a.id=o.attempt_id
        WHERE o.credited AND a.registration_id=NEW.id);
    RETURN NULL;
END $$;
CREATE TRIGGER event_registration_wake_payment_reconciliation AFTER UPDATE OF status ON event_registrations
    FOR EACH ROW WHEN (OLD.status='CONFIRMED' AND NEW.status<>'CONFIRMED')
    EXECUTE FUNCTION wake_registration_payment_reconciliation();

CREATE FUNCTION wake_event_payment_reconciliation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE payment_reconciliation_jobs j SET revision=j.revision+1,next_check_at='-infinity'
    WHERE j.attempt_id IN (
        SELECT o.attempt_id FROM payment_observations o
        JOIN payment_checkout_attempts a ON a.id=o.attempt_id
        JOIN event_registrations r ON r.id=a.registration_id
        WHERE o.credited AND r.event_id=NEW.id);
    RETURN NULL;
END $$;
CREATE TRIGGER event_wake_payment_reconciliation AFTER UPDATE OF status ON events
    FOR EACH ROW WHEN (NEW.status='CANCELLED' AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION wake_event_payment_reconciliation();
