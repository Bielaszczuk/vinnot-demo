-- #310: administrators' manual announcements. Each row is the audit of one send (who, what, when, how many) and the
-- cursor its batched delivery walks. Test sends to the administrator are kept too. The region and the country are
-- stored without a foreign key: if one disappears, nobody matches anymore instead of the audience widening. The id
-- may be the client's request id, so a repeated send request finds the first one. New table only.
CREATE TABLE announcements (
    id uuid PRIMARY KEY,
    kind varchar(20) NOT NULL CHECK (kind IN ('NEWS', 'SERVICE')),
    test boolean NOT NULL,
    send_email boolean NOT NULL,
    send_push boolean NOT NULL,
    audience_language varchar(2) CHECK (audience_language IN ('es', 'en')),
    audience_region_id uuid,
    audience_country_id uuid,
    audience_role varchar(20) CHECK (audience_role IN ('PARTNER', 'MODERATOR', 'ADMIN')),
    destination varchar(30) NOT NULL,
    es_title varchar(120),
    es_body text,
    en_title varchar(120),
    en_body text,
    recipients integer NOT NULL,
    sent_by uuid REFERENCES users(id) ON DELETE SET NULL,
    sent_by_email varchar(254) NOT NULL,
    created_at timestamptz NOT NULL,
    last_user_id uuid,
    completed_at timestamptz,
    CONSTRAINT announcements_one_channel CHECK (send_email OR send_push),
    CONSTRAINT announcements_one_language CHECK (es_title IS NOT NULL OR en_title IS NOT NULL)
);
CREATE INDEX announcements_pending_idx ON announcements (created_at) WHERE completed_at IS NULL;
CREATE INDEX announcements_created_idx ON announcements (created_at DESC);
-- Deleting an account clears its sends' reference through this index instead of scanning the table.
CREATE INDEX announcements_sent_by_idx ON announcements (sent_by) WHERE sent_by IS NOT NULL;
