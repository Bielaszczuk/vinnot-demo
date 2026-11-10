-- #428: administrators set the oldest mobile app version each store platform still supports, without a deploy, and
-- every change is audited. The app reads the minimum on launch and blocks older builds behind an update screen.
-- New tables only: the previous binary ignores them.

-- One row per platform (IOS, ANDROID). A missing row, or a NULL minimum, means no build is blocked. The row is created
-- on the first change, so updated_at and updated_by stay NULL until a value is actually set.
CREATE TABLE app_minimum_versions (
    platform varchar(20) PRIMARY KEY,
    minimum_version varchar(14) CHECK (minimum_version ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$'),
    updated_at timestamptz,
    updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);
-- Deleting an account clears its references through these indexes instead of scanning the tables.
CREATE INDEX app_minimum_versions_updated_by_idx ON app_minimum_versions (updated_by) WHERE updated_by IS NOT NULL;

-- Who changed which platform's minimum, from what to what, and when. NULL means no minimum. The email is kept so the
-- record survives the account.
CREATE TABLE app_minimum_version_changes (
    id bigserial PRIMARY KEY,
    platform varchar(20) NOT NULL,
    previous_minimum_version varchar(14),
    minimum_version varchar(14),
    changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_by_email varchar(254) NOT NULL,
    changed_at timestamptz NOT NULL
);
CREATE INDEX app_minimum_version_changes_changed_at_idx ON app_minimum_version_changes (changed_at DESC);
CREATE INDEX app_minimum_version_changes_changed_by_idx ON app_minimum_version_changes (changed_by) WHERE changed_by IS NOT NULL;
