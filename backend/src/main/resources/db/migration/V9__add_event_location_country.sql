ALTER TABLE events
    ADD COLUMN location_country VARCHAR(100);

CREATE INDEX idx_events_location_country_lower
    ON events (LOWER(location_country));

CREATE INDEX idx_events_location_region_lower
    ON events (LOWER(location_region));

UPDATE events
SET location_city = 'Ciudad Autónoma de Buenos Aires',
    location_region = 'Buenos Aires',
    location_country = COALESCE(location_country, 'Argentina')
WHERE LOWER(location_region) IN (
    'ciudad autónoma de buenos aires',
    'autonomous city of buenos aires'
);

UPDATE events event
SET location_country = country.name
FROM regions region
JOIN countries country ON country.id = region.country_id
WHERE event.location_country IS NULL
  AND event.location_region IS NOT NULL
  AND LOWER(event.location_region) = LOWER(region.name);

UPDATE events event
SET location_country = country.name
FROM countries country
WHERE event.location_country IS NULL
  AND event.location_address IS NOT NULL
  AND LOWER(event.location_address) LIKE CONCAT('%', LOWER(country.name), '%');
