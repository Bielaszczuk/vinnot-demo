-- Push device retention starts at deploy (#405). Builds older than #405 only register their device when the token or
-- the language changes, so last_seen_at is stale for devices that are still in use, and the first 120-day purge (V65)
-- would forget them. This one-time reset starts every existing device's retention now; from here on the app registers
-- on every cold start and keeps last_seen_at fresh. Data-only: the previous binary reads the same column.
-- Side effect, accepted: the engagement planner also reads last_seen_at as a visit, so winback starts 14 days after
-- deploy; without the reset, active members on old builds would wrongly get "Te extrañamos".
UPDATE push_devices SET last_seen_at = greatest(last_seen_at, now());
