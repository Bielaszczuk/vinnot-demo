-- Catalog writes must not silently overwrite a concurrent administrative edit or enrichment.
ALTER TABLE wines ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;
