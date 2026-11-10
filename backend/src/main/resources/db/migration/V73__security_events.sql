-- #482: security events of accounts: sign-ins and their failures, temporary locks, refresh-token reuse, and changes of
-- password, email, role and suspension, and deletions. Rows older than the retention window (180 days by default)
-- are purged by a daily job. New table only: the previous backend revision ignores it.
--
-- user_id is ON DELETE SET NULL, not CASCADE: deleting an account removes the link to the person at once, while the
-- unlinked rows (type, time, address, browser) stay until the retention purge as evidence of attacks on the service.
-- CASCADE would also erase the ACCOUNT_DELETED row and any trace of an attack that ended in a deletion.
CREATE TABLE security_events (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    event_type varchar(40) NOT NULL CHECK (event_type IN (
        'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGIN_LOCKED', 'REFRESH_REUSE_DETECTED', 'PASSWORD_CHANGED',
        'PASSWORD_RESET', 'EMAIL_CHANGED', 'ROLE_CHANGED', 'ACCOUNT_BANNED', 'ACCOUNT_UNBANNED', 'ACCOUNT_DELETED',
        'ACCOUNT_AUTO_SUSPENDED')),
    ip_address varchar(45),
    user_agent varchar(256),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
-- An account's history, newest last; it also serves the ON DELETE SET NULL of an account deletion.
CREATE INDEX security_events_user_created_idx ON security_events (user_id, created_at);
-- The retention purge deletes by age.
CREATE INDEX security_events_created_at_idx ON security_events (created_at);
