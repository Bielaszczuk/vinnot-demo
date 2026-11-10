-- Recipient locale and time zone for notifications (#293).
-- Additive: both columns have defaults, so existing rows and the previous binary keep working.
ALTER TABLE users
    ADD COLUMN preferred_language VARCHAR(8) NOT NULL DEFAULT 'es',
    ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

ALTER TABLE users
    ADD CONSTRAINT chk_users_preferred_language CHECK (preferred_language IN ('es', 'en'));
