-- Presentation destination only. Existing checkout URLs and commercial terms remain immutable.
ALTER TABLE payment_checkout_attempts ADD COLUMN return_to_app boolean NOT NULL DEFAULT false;
