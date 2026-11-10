-- V10__add_username_and_auth_fields_to_users.sql
-- Add username, last_login_at, locked, lock_reason fields

ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN lock_reason VARCHAR(255);

-- Set default username from email for existing users
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;

-- Now make username NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

CREATE INDEX idx_users_username ON users(username);

