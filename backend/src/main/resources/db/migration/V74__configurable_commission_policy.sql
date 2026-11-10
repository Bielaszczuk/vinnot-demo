-- #482: configurable ticket commission. V30 pinned every checkout attempt to 3% (300 basis points,
-- VINNOT_3_PERCENT_V1). Each attempt now stores its own versioned policy, so the rate can change for new
-- checkouts while existing rows keep, and are still validated against, the rate they were sold with.
-- Every existing row (300 / VINNOT_3_PERCENT_V1 / round(total * 0.03, 2)) satisfies the new checks.
--
-- V30 declared the amount check inline but over two columns, so PostgreSQL named it as a table check
-- (payment_checkout_attempts_check1). It is found by its definition instead of that generated number; the
-- STRICT lookup stops the migration unless exactly one such check exists. The two single-column checks
-- have stable names and are dropped without IF EXISTS for the same reason.
DO $$
DECLARE
    amount_check name;
BEGIN
    SELECT conname INTO STRICT amount_check
      FROM pg_constraint
     WHERE conrelid = 'payment_checkout_attempts'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%commission_amount%0.03%';
    EXECUTE format('ALTER TABLE payment_checkout_attempts DROP CONSTRAINT %I', amount_check);
END $$;

ALTER TABLE payment_checkout_attempts
    DROP CONSTRAINT payment_checkout_attempts_commission_basis_points_check,
    DROP CONSTRAINT payment_checkout_attempts_commission_policy_check;

ALTER TABLE payment_checkout_attempts
    ADD CONSTRAINT payment_checkout_attempts_commission_basis_points_check
        CHECK (commission_basis_points BETWEEN 1 AND 3000),
    ADD CONSTRAINT payment_checkout_attempts_commission_amount_check
        CHECK (commission_amount = round(total_amount * commission_basis_points / 10000.0, 2)),
    ADD CONSTRAINT payment_checkout_attempts_commission_policy_check
        CHECK (commission_policy ~ '^VINNOT_[0-9]+(_[0-9]+)?_PERCENT_V[0-9]+$');
