-- #308: the likes summaries remember up to when they have reported likes, one row per cadence (the daily push and the
-- weekly email). Started at the migration so existing likes are not announced. New table only: the previous binary
-- ignores it.
CREATE TABLE review_like_summary_cursor (
    cadence varchar(10) PRIMARY KEY CHECK (cadence IN ('DAILY', 'WEEKLY')),
    covered_until timestamptz NOT NULL
);

INSERT INTO review_like_summary_cursor (cadence, covered_until)
VALUES ('DAILY', CURRENT_TIMESTAMP), ('WEEKLY', CURRENT_TIMESTAMP);
