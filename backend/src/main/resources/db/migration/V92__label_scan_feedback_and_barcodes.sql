-- #544 label scan feedback and crowd-confirmed barcodes.
-- wine_label_scans gains the barcode the member read with the scan and the member's latest verdict on its result
-- (CONFIRMED, CORRECTED or NOT_IN_CATALOG, with the wine they chose). Plain nullable columns: no rewrite, no backfill.
ALTER TABLE wine_label_scans
    ADD COLUMN barcode varchar(14),
    ADD COLUMN feedback varchar(20),
    ADD COLUMN feedback_wine_id uuid REFERENCES wines(id) ON DELETE SET NULL,
    ADD COLUMN feedback_at timestamptz,
    ADD CONSTRAINT chk_wine_label_scans_feedback
        CHECK (feedback IS NULL OR feedback IN ('CONFIRMED', 'CORRECTED', 'NOT_IN_CATALOG'));

-- One confirmation per member and barcode (the latest wins). A barcode is answered as an exact match once at least
-- two members confirmed the same wine and more members confirmed it than any other wine.
CREATE TABLE wine_barcode_confirmations (
    barcode varchar(14) NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wine_id uuid NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    confirmed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (barcode, user_id)
);
-- The barcode lookup uses the primary key; these indexes keep wine and member deletes from scanning the table.
CREATE INDEX idx_wine_barcode_confirmations_wine ON wine_barcode_confirmations (wine_id);
CREATE INDEX idx_wine_barcode_confirmations_user ON wine_barcode_confirmations (user_id);
CREATE INDEX idx_wine_label_scans_feedback_wine ON wine_label_scans (feedback_wine_id);
