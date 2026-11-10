-- #482: keep payment history when an account is deleted.
-- V30 linked each checkout attempt to its buyer, organizer, registration and event with no ON DELETE rule. Deleting a
-- buyer (whose registrations cascade) or an organizer (whose events cascade) therefore failed on these keys. The attempt,
-- its observations, refunds and reconciliation job are the financial history of the operation and stay; only the links
-- to the deleted account, registration or event become NULL. The commercial terms (seller, title, amounts, commission)
-- live on the attempt itself, so the history stays readable.
-- The constraint names are the ones PostgreSQL generated for V30. No IF EXISTS: if a name ever differs, the migration
-- fails instead of leaving the old blocking key next to the new one.
ALTER TABLE payment_checkout_attempts
    ALTER COLUMN buyer_id DROP NOT NULL,
    ALTER COLUMN organizer_id DROP NOT NULL,
    ALTER COLUMN registration_id DROP NOT NULL,
    ALTER COLUMN event_id DROP NOT NULL,
    DROP CONSTRAINT payment_checkout_attempts_buyer_id_fkey,
    DROP CONSTRAINT payment_checkout_attempts_organizer_id_fkey,
    DROP CONSTRAINT payment_checkout_attempts_registration_id_fkey,
    DROP CONSTRAINT payment_checkout_attempts_event_id_fkey,
    ADD CONSTRAINT payment_checkout_attempts_buyer_id_fkey
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT payment_checkout_attempts_organizer_id_fkey
        FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT payment_checkout_attempts_registration_id_fkey
        FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE SET NULL,
    ADD CONSTRAINT payment_checkout_attempts_event_id_fkey
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
