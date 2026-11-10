-- #482: temporary sign-in lockout. After too many consecutive wrong passwords (5 by default) an account cannot sign in
-- with a password for a while (15 minutes by default). It is separate from the administrative suspension in
-- users.locked, which an administrator lifts by hand.
-- Additive: the previous backend revision does not map these columns, so it keeps booting and simply never locks.
ALTER TABLE users ADD COLUMN failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT chk_users_failed_login_attempts CHECK (failed_login_attempts >= 0);
-- NULL, or a past instant, means sign-in is not temporarily locked.
ALTER TABLE users ADD COLUMN login_locked_until timestamp with time zone;
