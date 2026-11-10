-- #310: administrators turn each push type on or off without a deploy, every change is audited, and delivery
-- outcomes are counted per type and day for the admin metrics. New tables and a nullable column only: the previous
-- binary ignores them and keeps sending every type.

-- A missing row means the type is on.
CREATE TABLE push_type_switches (
    notification_type varchar(60) PRIMARY KEY,
    enabled boolean NOT NULL,
    updated_at timestamptz NOT NULL,
    updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);
-- Deleting an account clears its references through these indexes instead of scanning the tables.
CREATE INDEX push_type_switches_updated_by_idx ON push_type_switches (updated_by) WHERE updated_by IS NOT NULL;

-- Who changed which type, from what to what, and when. The email is kept so the record survives the account.
CREATE TABLE push_type_switch_changes (
    id bigserial PRIMARY KEY,
    notification_type varchar(60) NOT NULL,
    previous_enabled boolean NOT NULL,
    enabled boolean NOT NULL,
    changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_by_email varchar(254) NOT NULL,
    changed_at timestamptz NOT NULL
);
CREATE INDEX push_type_switch_changes_changed_at_idx ON push_type_switch_changes (changed_at DESC);
CREATE INDEX push_type_switch_changes_changed_by_idx ON push_type_switch_changes (changed_by) WHERE changed_by IS NOT NULL;

-- Accounts (or, for FAILED, device messages) per type, outcome and UTC day.
CREATE TABLE push_delivery_outcomes (
    day date NOT NULL,
    notification_type varchar(60) NOT NULL,
    outcome varchar(30) NOT NULL,
    count bigint NOT NULL,
    PRIMARY KEY (day, notification_type, outcome)
);

-- The type a ticket belongs to, so a failed receipt is counted against it. Older rows have none.
ALTER TABLE push_receipts ADD COLUMN notification_type varchar(60);
