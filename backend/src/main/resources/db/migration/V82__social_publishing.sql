-- #510: publishing approved social posts, their metrics, the connected network accounts, pillar auto-approval and the
-- post's publishing record. Additive only: no stored row changes.

-- One publication per post and network, with its own status, network id, link, attempts and last error.
CREATE TABLE social_publications (
    id           UUID         PRIMARY KEY,
    post_id      UUID         NOT NULL REFERENCES social_posts (id) ON DELETE CASCADE,
    network      VARCHAR(16)  NOT NULL CHECK (network IN ('INSTAGRAM', 'FACEBOOK', 'THREADS', 'TIKTOK')),
    status       VARCHAR(16)  NOT NULL CHECK (status IN ('QUEUED', 'PUBLISHING', 'PUBLISHED', 'DRAFT_SENT', 'FAILED')),
    external_id  VARCHAR(256),
    permalink    TEXT,
    attempts     INT          NOT NULL DEFAULT 0,
    error        VARCHAR(64),
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    published_at TIMESTAMPTZ,
    -- Also indexes the foreign key at its leading column (database index contract).
    CONSTRAINT uq_social_publications_post_network UNIQUE (post_id, network)
);

CREATE INDEX idx_social_publications_status ON social_publications (status);
CREATE INDEX idx_social_publications_published_at ON social_publications (published_at);

-- One metrics snapshot per publication and day; a null metric is one the network does not give.
CREATE TABLE social_post_metrics (
    publication_id UUID        NOT NULL REFERENCES social_publications (id) ON DELETE CASCADE,
    captured_on    DATE        NOT NULL,
    views          BIGINT,
    reach          BIGINT,
    likes          BIGINT,
    comments       BIGINT,
    saves          BIGINT,
    shares         BIGINT,
    follows        BIGINT,
    captured_at    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (publication_id, captured_on)
);

-- The accounts connected from the admin with OAuth (Threads, TikTok); tokens are stored encrypted.
CREATE TABLE social_accounts (
    network                  VARCHAR(16)  PRIMARY KEY CHECK (network IN ('INSTAGRAM', 'FACEBOOK', 'THREADS', 'TIKTOK')),
    account_id               VARCHAR(256) NOT NULL,
    display_name             VARCHAR(256),
    access_token_ciphertext  TEXT         NOT NULL,
    refresh_token_ciphertext TEXT,
    access_expires_at        TIMESTAMPTZ,
    refresh_expires_at       TIMESTAMPTZ,
    status                   VARCHAR(24)  NOT NULL CHECK (status IN ('CONNECTED', 'REFRESH_FAILED')),
    last_error               VARCHAR(64),
    connected_by             UUID,
    connected_at             TIMESTAMPTZ  NOT NULL,
    updated_at               TIMESTAMPTZ  NOT NULL,
    refresh_claimed_until    TIMESTAMPTZ
);

-- Pillars whose pending posts the system may approve; off for every pillar.
ALTER TABLE content_pillars ADD COLUMN auto_approve BOOLEAN NOT NULL DEFAULT FALSE;

-- When the post's publishing started and ended and why it failed; null until it starts.
ALTER TABLE social_posts ADD COLUMN publishing JSONB;
