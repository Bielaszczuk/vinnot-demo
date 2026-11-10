CREATE TABLE wine_submissions (
    id uuid PRIMARY KEY,
    submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wine_name varchar(255) NOT NULL,
    winery_name varchar(255) NOT NULL,
    wine_type varchar(50),
    vintage integer,
    grapes jsonb NOT NULL DEFAULT '[]'::jsonb,
    country varchar(100),
    region varchar(100),
    alcohol_content numeric(4,2),
    notes text,
    image_url varchar(500),
    status varchar(30) NOT NULL,
    review_reason varchar(500),
    review_confidence numeric(5,4),
    matched_wine_id uuid REFERENCES wines(id) ON DELETE SET NULL,
    created_wine_id uuid REFERENCES wines(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wine_submission_status CHECK (
        status IN ('PENDING', 'APPROVED', 'DUPLICATE', 'REJECTED', 'NEEDS_REVIEW')
    ),
    CONSTRAINT chk_wine_submission_confidence CHECK (
        review_confidence IS NULL
        OR (review_confidence >= 0 AND review_confidence <= 1)
    )
);

CREATE INDEX idx_wine_submissions_user_created
    ON wine_submissions (submitted_by, created_at DESC);
CREATE INDEX idx_wine_submissions_status_created
    ON wine_submissions (status, created_at DESC);
CREATE INDEX idx_wine_submissions_matched_wine
    ON wine_submissions (matched_wine_id) WHERE matched_wine_id IS NOT NULL;
