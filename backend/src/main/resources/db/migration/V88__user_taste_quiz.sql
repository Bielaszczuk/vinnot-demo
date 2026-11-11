-- #541: the taste quiz. Members answer five illustrated questions at sign-up or later from their profile; the answers
-- seed their taste traits where real ratings do not show them yet. One row per member: COMPLETED keeps the answers as
-- a jsonb object of question key to option key, SKIPPED keeps none. No row means the quiz is still pending. New table
-- only: the previous backend keeps working during the release window because it never reads it.
CREATE TABLE user_taste_quiz (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL,
    answers jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_taste_quiz_status CHECK (status IN ('COMPLETED', 'SKIPPED')),
    CONSTRAINT chk_user_taste_quiz_answers CHECK ((status = 'COMPLETED') = (answers IS NOT NULL))
);
