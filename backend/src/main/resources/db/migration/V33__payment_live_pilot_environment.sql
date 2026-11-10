-- Real pilot credentials and checkout attempts must never replace sandbox records.
ALTER TABLE payment_accounts DROP CONSTRAINT payment_accounts_environment_check;
ALTER TABLE payment_accounts ADD CONSTRAINT payment_accounts_environment_check
    CHECK (environment IN ('SANDBOX','LIVE_PILOT'));
ALTER TABLE payment_checkout_attempts DROP CONSTRAINT payment_checkout_attempts_environment_check;
ALTER TABLE payment_checkout_attempts ADD CONSTRAINT payment_checkout_attempts_environment_check
    CHECK (environment IN ('SANDBOX','LIVE_PILOT'));
ALTER TABLE payment_connection_attempts ADD COLUMN environment varchar(16) NOT NULL DEFAULT 'SANDBOX'
    CHECK (environment IN ('SANDBOX','LIVE_PILOT'));
ALTER TABLE payment_connection_attempts DROP CONSTRAINT payment_connection_attempts_pkey;
ALTER TABLE payment_connection_attempts ADD PRIMARY KEY (owner_id, environment);
