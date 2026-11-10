-- B36: a refund Mercado Pago definitively refuses (a 4xx business error, or the live pilot limit) moves to REJECTED
-- instead of UNCERTAIN. No money moved, so the organizer may request it again: that re-arms the same intent to
-- PREPARED, and each retry sends its own idempotency key. UNCERTAIN keeps meaning "verify, never resend".
-- rejection_reason keeps only a short status/code token, never provider messages or payer data; rejections counts
-- the refusals so each one is reported once and numbers the retry key.
ALTER TABLE payment_refund_intents DROP CONSTRAINT payment_refund_intents_status_check;
ALTER TABLE payment_refund_intents ADD CONSTRAINT payment_refund_intents_status_check
    CHECK (status IN ('PREPARED','SENDING','UNCERTAIN','SUCCEEDED','REVIEW','REJECTED'));
ALTER TABLE payment_refund_intents ADD COLUMN rejection_reason varchar(64);
ALTER TABLE payment_refund_intents ADD COLUMN rejections integer NOT NULL DEFAULT 0 CHECK (rejections >= 0);
