ALTER TABLE wine_submissions
    DROP CONSTRAINT chk_wine_submission_status;

ALTER TABLE wine_submissions
    ADD COLUMN reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN reviewed_at timestamptz,
    ADD COLUMN image_quarantined boolean NOT NULL DEFAULT false;

ALTER TABLE wine_submissions
    ADD CONSTRAINT chk_wine_submission_status CHECK (
        status IN (
            'PENDING', 'APPROVED', 'DUPLICATE', 'REJECTED',
            'NEEDS_REVIEW', 'CHANGES_REQUESTED'
        )
    );

CREATE INDEX idx_wine_submissions_reviewer_created
    ON wine_submissions (reviewed_by, reviewed_at DESC)
    WHERE reviewed_by IS NOT NULL;
