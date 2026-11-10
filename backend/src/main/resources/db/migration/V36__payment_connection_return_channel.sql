-- The return channel is selected only when an authenticated organizer starts OAuth.
ALTER TABLE payment_connection_attempts ADD COLUMN return_to_app boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_payment_connection_state_environment ON payment_connection_attempts(state_hash,environment);
