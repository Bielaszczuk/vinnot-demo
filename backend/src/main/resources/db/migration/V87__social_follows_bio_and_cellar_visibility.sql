-- #541: social profiles. Members follow each other without approval (asymmetric), write a short public bio and choose
-- who sees their cellar. New table and new nullable/defaulted columns only: the previous backend keeps working during
-- the release window because it never reads them.
CREATE TABLE user_follows (
    follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id),
    CONSTRAINT chk_user_follows_not_self CHECK (follower_id <> followee_id)
);

-- The primary key serves "who I follow"; this index serves "who follows me", newest first, and the followee foreign key.
CREATE INDEX idx_user_follows_followee ON user_follows(followee_id, created_at DESC);

ALTER TABLE users ADD COLUMN bio varchar(160);
ALTER TABLE users ADD COLUMN cellar_visibility varchar(20) NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE users ADD CONSTRAINT chk_users_cellar_visibility
    CHECK (cellar_visibility IN ('PUBLIC', 'FOLLOWERS', 'PRIVATE'));
