-- Private contact only: existing users remain without a saved number.
ALTER TABLE users ADD COLUMN phone_number VARCHAR(16);
ALTER TABLE users ADD CONSTRAINT users_phone_number_format
    CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9][0-9]{6,14}$');
