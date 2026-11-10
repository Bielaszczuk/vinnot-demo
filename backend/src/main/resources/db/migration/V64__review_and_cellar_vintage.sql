-- #360: the vintage the user actually tasted, kept on their review and on their cellar entry. It is optional and
-- independent from the catalog wine vintage (wines.vintage). Existing rows stay NULL; nothing is backfilled.
-- The CHECK keeps the static request bound; the "no later than next year" rule lives in the domain.
ALTER TABLE reviews ADD COLUMN vintage integer CHECK (vintage BETWEEN 1800 AND 2100);
ALTER TABLE cellar_wines ADD COLUMN vintage integer CHECK (vintage BETWEEN 1800 AND 2100);
