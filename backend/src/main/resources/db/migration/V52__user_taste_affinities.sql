-- #306: per-user taste affinities for recommendation pushes, recomputed every night from the user's own review and
-- cellar ratings. A row per grape (normalised name) and per wine type. New table only: the previous binary ignores it.
CREATE TABLE user_taste_affinities (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind varchar(10) NOT NULL CHECK (kind IN ('GRAPE', 'TYPE')),
    value varchar(120) NOT NULL,
    label varchar(120) NOT NULL,
    score numeric(3,2) NOT NULL CHECK (score BETWEEN 0 AND 5),
    rated_wines integer NOT NULL CHECK (rated_wines > 0),
    computed_at timestamptz NOT NULL,
    PRIMARY KEY (user_id, kind, value)
);

CREATE INDEX idx_user_taste_affinities_match ON user_taste_affinities(kind, value);
