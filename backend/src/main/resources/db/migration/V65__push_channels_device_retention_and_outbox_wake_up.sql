-- Push delivery fixes (#405). Additive: the previous binary ignores the new column, index and trigger.
--
-- push_devices.channels: the app created the per-category Android notification channels (tickets, community,
-- recommendations, events-nearby, reminders, news). Until a device says so, its pushes use the legacy "default" channel.
-- The app registers its device on every cold start, so last_seen_at stays fresh; devices not registered for 120 days
-- are purged, which the last_seen_at index serves.
ALTER TABLE push_devices ADD COLUMN channels boolean NOT NULL DEFAULT false;
CREATE INDEX idx_push_devices_last_seen ON push_devices(last_seen_at);

-- Outbox wake-up: a job that is due at once notifies the "external_effects" channel when its transaction commits
-- (Postgres folds identical notifications of one transaction into one), so a listening worker drains it without waiting
-- for its next poll. Delayed jobs and retries keep relying on the poll.
CREATE FUNCTION notify_external_effect_due() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_notify('external_effects', '');
    RETURN NULL;
END $$;
CREATE TRIGGER external_effects_wake_up AFTER INSERT ON external_effects
    FOR EACH ROW WHEN (NEW.next_attempt_at <= CURRENT_TIMESTAMP)
    EXECUTE FUNCTION notify_external_effect_due();
