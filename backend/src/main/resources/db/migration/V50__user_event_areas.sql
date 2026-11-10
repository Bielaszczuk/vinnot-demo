-- "Events near you" area (#305). Each user who opts in has one row: either a catalogue region or a location rounded
-- to 0.1 degree (about 11 km), never a precise position. Rows go with the account or the region.
-- New table: the previous binary never reads or writes it.
CREATE TABLE user_event_areas (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
    latitude numeric(4,1) CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(4,1) CHECK (longitude BETWEEN -180 AND 180),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_event_areas_one_kind CHECK (
        (region_id IS NOT NULL AND latitude IS NULL AND longitude IS NULL)
        OR (region_id IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL))
);
CREATE INDEX idx_user_event_areas_region ON user_event_areas(region_id) WHERE region_id IS NOT NULL;
CREATE INDEX idx_user_event_areas_location ON user_event_areas(latitude, longitude) WHERE latitude IS NOT NULL;
