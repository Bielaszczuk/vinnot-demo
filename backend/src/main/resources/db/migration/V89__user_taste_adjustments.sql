-- #541: the adjustable palate. Members drag the structure bars of their own taste profile to refine them; each manual
-- score replaces the computed or quiz value of its trait on the public profile. One row per member and trait; no row
-- means the trait shows its computed value. New table only: the previous backend keeps working during the release
-- window because it never reads it.
CREATE TABLE user_taste_adjustments (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trait varchar(20) NOT NULL,
    score smallint NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_taste_adjustments PRIMARY KEY (user_id, trait),
    CONSTRAINT chk_user_taste_adjustments_trait CHECK (trait IN ('ACIDITY', 'BODY', 'TANNIN', 'SWEETNESS')),
    CONSTRAINT chk_user_taste_adjustments_score CHECK (score BETWEEN 0 AND 100)
);
