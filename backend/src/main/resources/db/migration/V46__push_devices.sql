-- Push devices (#302): one row per Expo push token. A token belongs to one account at a time (the account last
-- signed in on that device). Account deletion removes its devices through the foreign key.
CREATE TABLE push_devices (
    token        varchar(255) PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     varchar(16) NOT NULL CHECK (platform IN ('IOS','ANDROID')),
    locale       varchar(2) NOT NULL CHECK (locale IN ('es','en')),
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_push_devices_user ON push_devices(user_id);
