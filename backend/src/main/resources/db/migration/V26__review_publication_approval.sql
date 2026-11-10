-- Existing public content keeps its visibility; all new submissions default to pending.
ALTER TABLE reviews ADD COLUMN publication_status varchar(12) NOT NULL DEFAULT 'APPROVED'
    CHECK (publication_status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE reviews ALTER COLUMN publication_status SET DEFAULT 'PENDING';
ALTER TABLE review_comments ADD COLUMN publication_status varchar(12) NOT NULL DEFAULT 'APPROVED'
    CHECK (publication_status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE review_comments ALTER COLUMN publication_status SET DEFAULT 'PENDING';
CREATE INDEX reviews_publication_queue ON reviews(created_at,id) WHERE publication_status='PENDING';
CREATE INDEX review_comments_publication_queue ON review_comments(created_at,id) WHERE publication_status='PENDING';
CREATE TABLE review_publication_decisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    target_type varchar(12) NOT NULL CHECK (target_type IN ('REVIEW','COMMENT')),
    target_id uuid NOT NULL,
    reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
    status varchar(12) NOT NULL CHECK (status IN ('APPROVED','REJECTED')),
    reason varchar(2000) NOT NULL,
    content_revision timestamptz NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE INDEX review_publication_decisions_reviewer ON review_publication_decisions(reviewer_id);
CREATE INDEX review_publication_decisions_target ON review_publication_decisions(target_type,target_id);
CREATE INDEX review_publication_decisions_retention ON review_publication_decisions(created_at,id);
