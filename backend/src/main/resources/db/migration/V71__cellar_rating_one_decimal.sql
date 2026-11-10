-- #455 The cellar's personal rating takes the review scale: 0.1 to 5.0 with one decimal.
-- Expand/contract: rating (integer 1-5) stays exactly as it is, so the previous backend revision keeps booting
-- (Hibernate validates the schema) and keeps reading and writing whole ratings. The current revision reads
-- rating_decimal and writes both columns (the whole one rounded half up, kept between 1 and 5).
-- A later migration may drop rating, its check and the trigger below once no previous revision can run.
ALTER TABLE cellar_wines ADD COLUMN rating_decimal numeric(2,1);
ALTER TABLE cellar_wines ADD CONSTRAINT chk_cellar_rating_decimal
    CHECK (rating_decimal >= 0.1 AND rating_decimal <= 5.0);
UPDATE cellar_wines SET rating_decimal = rating::numeric(2,1) WHERE rating IS NOT NULL;

-- While the previous revision may still run, what it writes to the whole column reaches the decimal one: a new entry
-- with only a whole rating, or a change of the whole rating that leaves the decimal one untouched. Rewriting the same
-- whole rating (an edit of the notes) keeps the decimal one.
CREATE FUNCTION cellar_rating_from_whole() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.rating_decimal IS NULL AND NEW.rating IS NOT NULL THEN
            NEW.rating_decimal := NEW.rating::numeric(2,1);
        END IF;
    ELSIF NEW.rating IS DISTINCT FROM OLD.rating AND NEW.rating_decimal IS NOT DISTINCT FROM OLD.rating_decimal THEN
        NEW.rating_decimal := NEW.rating::numeric(2,1);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cellar_rating_from_whole
    BEFORE INSERT OR UPDATE OF rating ON cellar_wines
    FOR EACH ROW EXECUTE FUNCTION cellar_rating_from_whole();
