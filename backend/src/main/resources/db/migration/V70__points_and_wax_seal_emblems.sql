-- #455 Points and wax-seal emblems.
-- user_points: one row per member who ever had points (others are read as a fresh Brote account).
-- user_point_awards: every award, unique per member, source and source key; a revoked award stays with active=false
--   so it can be granted again (a review approved once more) without ever counting twice.
-- user_point_movements: the history shown to the member; revocations are negative rows.
-- wine_label_scans: one row per label scan of a signed-in member (scans were never stored before, so none are backfilled).

CREATE TABLE user_points (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
    current_tier varchar(20) NOT NULL DEFAULT 'BROTE',
    highest_tier_reached varchar(20) NOT NULL DEFAULT 'BROTE',
    highest_tier_celebrated varchar(20) NOT NULL DEFAULT 'BROTE',
    welcome_seen boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_point_awards (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source varchar(30) NOT NULL,
    source_key varchar(120) NOT NULL,
    points integer NOT NULL CHECK (points > 0),
    subject_type varchar(10),
    subject_id uuid,
    active boolean NOT NULL DEFAULT true,
    awarded_at timestamptz NOT NULL,
    revoked_at timestamptz,
    CONSTRAINT uq_user_point_awards UNIQUE (user_id, source, source_key)
);

CREATE TABLE user_point_movements (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source varchar(30) NOT NULL,
    source_key varchar(120) NOT NULL,
    points integer NOT NULL CHECK (points <> 0),
    subject_type varchar(10),
    subject_id uuid,
    created_at timestamptz NOT NULL
);
CREATE INDEX idx_user_point_movements_user_created ON user_point_movements (user_id, created_at DESC);

CREATE TABLE wine_label_scans (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wine_id uuid REFERENCES wines(id) ON DELETE SET NULL,
    outcome varchar(20) NOT NULL,
    scanned_at timestamptz NOT NULL
);
CREATE INDEX idx_wine_label_scans_user_scanned ON wine_label_scans (user_id, scanned_at DESC);
CREATE INDEX idx_wine_label_scans_wine ON wine_label_scans (wine_id) WHERE wine_id IS NOT NULL;

-- Backfill from existing content with the live rules: the same sources and keys (so later actions on old content
-- never award twice), each source's daily limit first and then the 40-point global cap per day in the member's time
-- zone (approved wine submissions are outside it). No push is sent: members start at their backfilled tier as
-- already celebrated, and those with points see a one-time welcome card instead.
INSERT INTO user_point_awards (user_id, source, source_key, points, subject_type, subject_id, active, awarded_at)
WITH earned AS (
    SELECT DISTINCT ON (user_id, source, source_key) * FROM (
        SELECT r.user_id, 'REVIEW' AS source, r.wine_id::text AS source_key, 3 AS points,
               'WINE' AS subject_type, r.wine_id AS subject_id, r.created_at AS at
        FROM reviews r WHERE r.publication_status = 'APPROVED'
        UNION ALL
        SELECT r.user_id, 'REVIEW_NOTE', r.wine_id::text, 2, 'WINE', r.wine_id, r.created_at
        FROM reviews r
        WHERE r.publication_status = 'APPROVED'
          AND char_length(btrim(COALESCE(r.comment, ''), E' \t\r\n')) >= 80
        UNION ALL
        SELECT r.user_id, 'LIKE_RECEIVED', r.id::text || ':' || l.user_id::text, 1, 'WINE', r.wine_id, l.created_at
        FROM review_likes l JOIN reviews r ON r.id = l.review_id
        WHERE r.publication_status = 'APPROVED'
        UNION ALL
        SELECT c.user_id, 'COMMENT', c.id::text, 1, 'WINE', r.wine_id, c.created_at
        FROM review_comments c JOIN reviews r ON r.id = c.review_id
        WHERE c.publication_status = 'APPROVED' AND c.user_id <> r.user_id
        UNION ALL
        SELECT s.submitted_by, 'WINE_APPROVED', s.id::text, 8, 'WINE', s.created_wine_id,
               COALESCE(s.reviewed_at, s.updated_at)
        FROM wine_submissions s WHERE s.status = 'APPROVED'
        UNION ALL
        -- A cellar entry a review created (same moment as the review) earns nothing; a manual one earns once per wine.
        SELECT cw.user_id, 'CELLAR_ADD', cw.wine_id::text, 1, 'WINE', cw.wine_id, cw.created_at
        FROM cellar_wines cw
        WHERE NOT EXISTS (
            SELECT 1 FROM reviews r
            WHERE r.user_id = cw.user_id AND r.wine_id = cw.wine_id AND r.created_at <= cw.created_at + interval '5 seconds')
        UNION ALL
        SELECT g.user_id, 'EVENT_REGISTRATION', g.id::text, 4, 'EVENT', g.event_id, COALESCE(g.confirmed_at, g.created_at)
        FROM event_registrations g WHERE g.status = 'CONFIRMED'
        UNION ALL
        SELECT u.id, 'PROFILE_COMPLETE', 'profile', 5, NULL, NULL, u.updated_at
        FROM users u
        WHERE btrim(COALESCE(u.profile_image_url, '')) <> '' AND btrim(u.first_name) <> '' AND btrim(u.last_name) <> ''
          AND btrim(COALESCE(u.phone_number, '')) <> ''
    ) everything
    ORDER BY user_id, source, source_key, at
), known_zones AS MATERIALIZED (
    SELECT name FROM pg_timezone_names
), dated AS (
    -- A stored zone PostgreSQL does not know counts in Buenos Aires, the zone the runtime falls back to.
    SELECT e.*, (e.at AT TIME ZONE COALESCE(z.name, 'America/Argentina/Buenos_Aires'))::date AS day
    FROM earned e JOIN users u ON u.id = e.user_id
    LEFT JOIN known_zones z ON z.name = u.timezone
), source_capped AS (
    SELECT d.*,
           CASE WHEN d.source IN ('LIKE_RECEIVED') THEN 5
                WHEN d.source IN ('COMMENT', 'SCAN_MATCH', 'CELLAR_ADD') THEN 3 END AS source_limit,
           COALESCE(SUM(d.points) OVER (PARTITION BY d.user_id, d.day, d.source ORDER BY d.at, d.source_key
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS source_before
    FROM dated d
), after_source AS (
    SELECT s.*,
           CASE WHEN s.source_limit IS NULL THEN s.points
                ELSE LEAST(s.points, GREATEST(0, s.source_limit - s.source_before)) END AS allowed
    FROM source_capped s
), global_capped AS (
    SELECT a.*,
           COALESCE(SUM(CASE WHEN a.source = 'WINE_APPROVED' THEN 0 ELSE a.allowed END)
                OVER (PARTITION BY a.user_id, a.day ORDER BY a.at, a.source, a.source_key
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS global_before
    FROM after_source a
), granted AS (
    SELECT g.*,
           CASE WHEN g.source = 'WINE_APPROVED' THEN g.allowed
                ELSE LEAST(g.allowed, GREATEST(0, 40 - g.global_before)) END AS granted_points
    FROM global_capped g
)
SELECT user_id, source, source_key, granted_points, subject_type, subject_id, true, at
FROM granted WHERE granted_points > 0;

INSERT INTO user_point_movements (id, user_id, source, source_key, points, subject_type, subject_id, created_at)
SELECT gen_random_uuid(), user_id, source, source_key, points, subject_type, subject_id, awarded_at
FROM user_point_awards;

INSERT INTO user_points (user_id, points, current_tier, highest_tier_reached, highest_tier_celebrated, welcome_seen, updated_at)
SELECT totals.user_id, totals.points, totals.tier, totals.tier, totals.tier, false, CURRENT_TIMESTAMP
FROM (
    SELECT a.user_id, SUM(a.points)::integer AS points,
           CASE WHEN SUM(a.points) >= 5000 THEN 'VINNOT'
                WHEN SUM(a.points) >= 2600 THEN 'GRAN_ENOFILO'
                WHEN SUM(a.points) >= 1600 THEN 'GRAN_RESERVA'
                WHEN SUM(a.points) >= 1000 THEN 'RESERVA'
                WHEN SUM(a.points) >= 700 THEN 'CRIANZA'
                WHEN SUM(a.points) >= 450 THEN 'BARRICA'
                WHEN SUM(a.points) >= 280 THEN 'LAGAR'
                WHEN SUM(a.points) >= 160 THEN 'VENDIMIA'
                WHEN SUM(a.points) >= 80 THEN 'RACIMO'
                WHEN SUM(a.points) >= 30 THEN 'PARRA'
                ELSE 'BROTE' END AS tier
    FROM user_point_awards a
    GROUP BY a.user_id
) totals;
