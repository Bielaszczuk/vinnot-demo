-- V18__redesign_cellar_wines.sql
-- Redesign cellar: add rating, remove quantity/location/purchase_date

ALTER TABLE cellar_wines ADD COLUMN rating INTEGER;
ALTER TABLE cellar_wines DROP COLUMN quantity;
ALTER TABLE cellar_wines DROP COLUMN location;
ALTER TABLE cellar_wines DROP COLUMN purchase_date;

ALTER TABLE cellar_wines ADD CONSTRAINT chk_cellar_rating CHECK (rating >= 1 AND rating <= 5);

